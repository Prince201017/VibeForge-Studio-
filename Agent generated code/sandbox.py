"""
[Claude.A11] Sandboxed execution for user-generated code previews
File: python-service/security/sandbox.py

Scope: the CSS/animation code-gen system (spec 10) lets users preview
generated JS/CSS snippets. This module defines the resource-limited
execution contract those previews must run under. Actual JS execution
happens client-side inside a Web Worker (see notes below); this module
covers the *server-side* validation and resource-limiting story, plus a
stub for future Python sandboxing.

Nothing here should ever be used to execute arbitrary, unreviewed code
with filesystem or network access.
"""

from __future__ import annotations

import ast
import logging
import resource
import signal
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger("forgeos.sandbox")

# ---------------------------------------------------------------------------
# Client-side contract (documented here, enforced in the frontend bundle)
# ---------------------------------------------------------------------------
#
# User-generated JS previews MUST run inside a Web Worker with:
#   - no access to `window`, `document`, `fetch`, `XMLHttpRequest`, `WebSocket`
#   - a hard wall-clock timeout (2s) enforced by worker.terminate()
#   - postMessage as the only I/O channel, structured-clone only (no functions)
#   - Content-Security-Policy `worker-src 'self' blob:` scoping the worker
#     to same-origin blob URLs only
#
# The backend never executes user JS. If a "server-side render preview"
# feature is ever added, it must go through a headless-browser microservice
# in its own network-isolated container — not this process.


@dataclass
class SandboxResult:
    success: bool
    stdout: str
    stderr: str
    timed_out: bool


class SandboxViolation(Exception):
    pass


# ---------------------------------------------------------------------------
# Static analysis gate — reject obviously dangerous constructs before
# anything is ever executed, regardless of sandbox.
# ---------------------------------------------------------------------------

_FORBIDDEN_PY_NAMES = {
    "eval", "exec", "compile", "__import__", "open", "input",
    "globals", "locals", "vars", "getattr", "setattr", "delattr",
}
_FORBIDDEN_PY_MODULES = {"os", "sys", "subprocess", "socket", "shutil", "pathlib", "importlib", "ctypes"}


def static_check_python(source: str) -> None:
    """Raises SandboxViolation if the source references forbidden names/modules."""
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise SandboxViolation(f"Syntax error: {exc}") from exc

    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id in _FORBIDDEN_PY_NAMES:
            raise SandboxViolation(f"Use of forbidden name: {node.id}")
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            module = getattr(node, "module", None) or ""
            names = [module] + [alias.name for alias in node.names]
            for name in names:
                root = (name or "").split(".")[0]
                if root in _FORBIDDEN_PY_MODULES:
                    raise SandboxViolation(f"Import of forbidden module: {root}")


# ---------------------------------------------------------------------------
# Resource-limited subprocess execution (future: Python sandbox, per spec
# note "Docker containers for Python (future)"). Implemented here as an
# OS-level resource-limit fallback for CI/local use; production should
# replace this with a gVisor/Docker/Firecracker-isolated worker before
# accepting untrusted Python execution.
# ---------------------------------------------------------------------------

MAX_CPU_SECONDS = 2
MAX_MEMORY_BYTES = 128 * 1024 * 1024  # 128MB
EXEC_TIMEOUT_SECONDS = 3


def _limit_resources():
    """Called in the child process (preexec_fn) to cap CPU/memory before exec."""
    resource.setrlimit(resource.RLIMIT_CPU, (MAX_CPU_SECONDS, MAX_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY_BYTES, MAX_MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_NOFILE, (16, 16))
    resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))


def run_python_sandboxed(source: str, stdin_data: str = "") -> SandboxResult:
    """
    NOT for production use with untrusted, internet-facing input — this is
    a best-effort local guard (resource limits + no filesystem/network
    grants at the OS level only if the host is otherwise locked down). The
    spec explicitly calls out Docker-based isolation as a follow-up; treat
    this function as the interim/dev-only implementation and gate it behind
    a feature flag until proper container isolation lands.
    """
    static_check_python(source)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=True) as f:
        f.write(source)
        f.flush()

        try:
            proc = subprocess.run(
                ["python3", "-I", "-S", f.name],  # isolated mode, no site packages
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=EXEC_TIMEOUT_SECONDS,
                preexec_fn=_limit_resources,
                env={},  # no inherited environment (no secrets, no PATH tricks)
            )
            return SandboxResult(success=proc.returncode == 0, stdout=proc.stdout, stderr=proc.stderr, timed_out=False)
        except subprocess.TimeoutExpired as exc:
            logger.warning("Sandboxed execution timed out")
            return SandboxResult(success=False, stdout=exc.stdout or "", stderr="Execution timed out", timed_out=True)


# ---------------------------------------------------------------------------
# CSS validation — the code-gen system outputs CSS, not JS; still worth
# rejecting `expression()`/`url(javascript:)` legacy IE vectors defensively.
# ---------------------------------------------------------------------------

_CSS_FORBIDDEN_PATTERNS = ("javascript:", "expression(", "-moz-binding", "behavior:")


def validate_generated_css(css: str) -> None:
    lowered = css.lower()
    for pattern in _CSS_FORBIDDEN_PATTERNS:
        if pattern in lowered:
            raise SandboxViolation(f"Generated CSS contains forbidden construct: {pattern}")
