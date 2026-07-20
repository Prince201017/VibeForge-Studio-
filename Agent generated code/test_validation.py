"""[Claude.A11] Tests for security/validation.py"""

import pytest
from pydantic import ValidationError

from python_service.security.validation import (
    ProjectCreateSchema,
    ShareInviteSchema,
    CommentCreateSchema,
    sanitize_html,
    sanitize_plain_text,
    assert_safe_identifier,
    validate_sort_column,
)
from fastapi import HTTPException


def test_project_create_accepts_valid_name():
    p = ProjectCreateSchema(name="My Cool Project")
    assert p.name == "My Cool Project"


def test_project_create_rejects_unsafe_name():
    with pytest.raises(ValidationError):
        ProjectCreateSchema(name="<script>alert(1)</script>")


def test_project_create_strips_html_from_description():
    p = ProjectCreateSchema(name="Ok Name", description="<b>bold</b> and <script>evil()</script>")
    assert "<script>" not in p.description
    assert "evil()" not in p.description


def test_project_create_forbids_unknown_fields():
    with pytest.raises(ValidationError):
        ProjectCreateSchema(name="Ok", admin=True)  # type: ignore[call-arg]


def test_share_invite_validates_role():
    with pytest.raises(ValidationError):
        ShareInviteSchema(email="user@example.com", role="superadmin")

    valid = ShareInviteSchema(email="user@example.com", role="editor")
    assert valid.role == "editor"


def test_share_invite_validates_email_format():
    with pytest.raises(ValidationError):
        ShareInviteSchema(email="not-an-email", role="viewer")


def test_comment_requires_valid_uuid_for_project_id():
    with pytest.raises(ValidationError):
        CommentCreateSchema(project_id="'; DROP TABLE projects; --", body="hi")


def test_comment_body_sanitized_of_script_tags():
    c = CommentCreateSchema(
        project_id="123e4567-e89b-12d3-a456-426614174000",
        body="Hello <script>alert('xss')</script> world",
    )
    assert "<script>" not in c.body
    assert "Hello" in c.body


def test_sanitize_html_allows_safe_tags_strips_dangerous():
    result = sanitize_html("<p>Hi <b>there</b></p><script>bad()</script>")
    assert "<script>" not in result
    assert "<p>" in result


def test_sanitize_plain_text_strips_all_markup():
    result = sanitize_plain_text("<div>hello <b>world</b></div>")
    assert "<" not in result


def test_assert_safe_identifier_rejects_injection_attempt():
    with pytest.raises(ValueError):
        assert_safe_identifier("name; DROP TABLE users;")


def test_assert_safe_identifier_accepts_valid_identifier():
    assert assert_safe_identifier("created_at") == "created_at"


def test_validate_sort_column_rejects_unknown_column():
    with pytest.raises(HTTPException):
        validate_sort_column("password_hash")


def test_validate_sort_column_accepts_allowed_column():
    assert validate_sort_column("created_at") == "created_at"
