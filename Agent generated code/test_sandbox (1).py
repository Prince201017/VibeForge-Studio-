"""[Claude.A11] Tests for security/sandbox.py"""

import pytest

from python_service.security.sandbox import (
    static_check_python,
    SandboxViolation,
    validate_generated_css,
)


def test_allows_safe_python():
    static_check_python("x = 1 + 2\nprint(x)")  # should not raise


@pytest.mark.parametrize(
    "source",
    [
        "eval('1+1')",
        "exec('print(1)')",
        "__import__('os').system('ls')",
        "import os\nos.system('rm -rf /')",
        "import subprocess\nsubprocess.run(['ls'])",
        "from os import system\nsystem('ls')",
        "open('/etc/passwd').read()",
    ],
)
def test_rejects_dangerous_constructs(source):
    with pytest.raises(SandboxViolation):
        static_check_python(source)


def test_rejects_syntax_errors():
    with pytest.raises(SandboxViolation):
        static_check_python("def broken(:")


def test_validate_css_allows_safe_rules():
    validate_generated_css(".box { color: red; transform: rotate(45deg); }")


@pytest.mark.parametrize(
    "css",
    [
        "body { background: url('javascript:alert(1)'); }",
        ".x { width: expression(alert('xss')); }",
        ".y { -moz-binding: url('evil.xml#exploit'); }",
        ".z { behavior: url('evil.htc'); }",
    ],
)
def test_validate_css_rejects_dangerous_constructs(css):
    with pytest.raises(SandboxViolation):
        validate_generated_css(css)
