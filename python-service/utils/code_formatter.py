# [CSS.A10] code_formatter.py
"""
Formats generated code. Tries to shell out to a local `prettier` install for
best-in-class formatting; falls back to a dependency-free pretty-printer so
the export endpoints never hard-fail just because Prettier isn't on PATH.
"""
from __future__ import annotations
import re
import shutil
import subprocess
import tempfile
import os


def _has_prettier() -> bool:
    return shutil.which("prettier") is not None or shutil.which("npx") is not None


def format_with_prettier(code: str, parser: str = "babel") -> str | None:
    """Returns formatted code, or None if Prettier isn't available / fails."""
    if not _has_prettier():
        return None
    suffix = {"css": ".css", "babel": ".js", "typescript": ".ts", "html": ".html"}.get(parser, ".js")
    try:
        with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False) as f:
            f.write(code)
            path = f.name
        cmd = ["prettier", "--parser", parser, path] if shutil.which("prettier") else ["npx", "--yes", "prettier", "--parser", parser, path]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        os.unlink(path)
        if result.returncode == 0:
            return result.stdout
        return None
    except Exception:
        return None


def _basic_pretty_print_css(css: str) -> str:
    css = re.sub(r"\s*{\s*", " {\n  ", css)
    css = re.sub(r";\s*", ";\n  ", css)
    css = re.sub(r"\s*}\s*", "\n}\n\n", css)
    css = re.sub(r"\n  \n", "\n", css)
    css = re.sub(r"  \n}", "\n}", css)
    css = re.sub(r"\n{3,}", "\n\n", css)
    return css.strip() + "\n"


def _basic_pretty_print_js(code: str) -> str:
    # Minimal, safe cleanup: normalize blank-line runs and trailing whitespace.
    lines = [line.rstrip() for line in code.splitlines()]
    out, blank_run = [], 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run > 1:
                continue
        else:
            blank_run = 0
        out.append(line)
    return "\n".join(out).strip() + "\n"


def format_code(code: str, language: str = "js") -> str:
    """Public entry point. language: 'css' | 'js' | 'ts' | 'html'."""
    parser_map = {"css": "css", "js": "babel", "ts": "typescript", "html": "html"}
    pretty = format_with_prettier(code, parser_map.get(language, "babel"))
    if pretty is not None:
        return pretty
    return _basic_pretty_print_css(code) if language == "css" else _basic_pretty_print_js(code)


def minify_css(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s*\n\s*", "", css)
    css = re.sub(r"\s{2,}", " ", css)
    css = re.sub(r";\s*}", "}", css)
    css = re.sub(r"\s*([{}:;,])\s*", r"\1", css)
    return css.strip()
