"""
[Claude.A11] Backend input validation
File: python-service/security/validation.py

Source-of-truth validation using Pydantic. Every mutating endpoint should
declare a schema here and validate against it via the @validate_input
decorator (or native FastAPI body typing, which uses these same models).

Also includes standalone sanitizers for the a few string fields that come
in outside of typed request bodies (query params, path params).
"""

from __future__ import annotations

import re
import bleach
from functools import wraps
from typing import Type, Optional

from fastapi import HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

# ---------------------------------------------------------------------------
# Shared regex / constants
# ---------------------------------------------------------------------------

SAFE_NAME_RE = re.compile(r"^[\w\- .]{1,200}$")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)

ALLOWED_HTML_TAGS = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "code", "pre"]
ALLOWED_HTML_ATTRS = {"a": ["href", "rel", "target"]}

VALID_ROLES = {"owner", "editor", "commenter", "viewer"}


def sanitize_html(value: str) -> str:
    """Server-side authoritative HTML sanitization (bleach == Python DOMPurify equivalent)."""
    return bleach.clean(value, tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_HTML_ATTRS, strip=True)


def sanitize_plain_text(value: str) -> str:
    """Strips all markup, collapses control characters. Use for names, titles, etc."""
    stripped = bleach.clean(value, tags=[], attributes={}, strip=True)
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", stripped).strip()


# ---------------------------------------------------------------------------
# Pydantic schemas — these double as OpenAPI docs when used as route bodies
# ---------------------------------------------------------------------------


class ProjectCreateSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_must_be_safe(cls, v: str) -> str:
        if not SAFE_NAME_RE.match(v):
            raise ValueError("Name contains unsupported characters")
        return sanitize_plain_text(v)

    @field_validator("description")
    @classmethod
    def description_sanitized(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_plain_text(v) if v else v


class ShareInviteSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"role must be one of {sorted(VALID_ROLES)}")
        return v


class CommentCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    body: str = Field(..., min_length=1, max_length=5000)
    parent_comment_id: Optional[str] = None

    @field_validator("project_id", "parent_comment_id")
    @classmethod
    def must_be_uuid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not UUID_RE.match(v):
            raise ValueError("Invalid identifier format")
        return v

    @field_validator("body")
    @classmethod
    def body_sanitized(cls, v: str) -> str:
        return sanitize_html(v)


class ApiKeyCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(..., min_length=1, max_length=100)
    scopes: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("scopes")
    @classmethod
    def scopes_known(cls, v: list[str]) -> list[str]:
        allowed = {"projects:read", "projects:write", "export:create", "assets:read", "assets:write"}
        unknown = set(v) - allowed
        if unknown:
            raise ValueError(f"Unknown scopes: {sorted(unknown)}")
        return v


# ---------------------------------------------------------------------------
# validate_input decorator — validates request body against a schema before
# the handler runs, matching the pattern shown in the needs doc.
# ---------------------------------------------------------------------------


def validate_input(schema: Type[BaseModel]):
    """
    Usage:
        @app.post("/api/projects")
        @validate_input(ProjectCreateSchema)
        async def create_project(request: Request, validated: ProjectCreateSchema, current_user=Depends(require_auth)):
            ...

    Expects the decorated function to accept a `validated` kwarg; this
    decorator parses request.json() (or an already-provided `body` kwarg,
    useful in tests) into `schema` and injects it.
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            raw_body = kwargs.pop("body", None)

            if raw_body is None and request is not None:
                raw_body = await request.json()

            try:
                validated = schema.model_validate(raw_body or {})
            except Exception as exc:  # pydantic.ValidationError
                raise HTTPException(status_code=422, detail=_format_validation_error(exc)) from exc

            kwargs["validated"] = validated
            return await func(*args, **kwargs)

        return wrapper

    return decorator


def _format_validation_error(exc: Exception) -> str:
    # Avoid leaking internal pydantic repr; give a compact, safe summary.
    errors = getattr(exc, "errors", lambda: [])()
    if not errors:
        return "Invalid request body"
    first = errors[0]
    field = ".".join(str(p) for p in first.get("loc", []))
    return f"Invalid value for '{field}': {first.get('msg', 'validation failed')}"


# ---------------------------------------------------------------------------
# SQL injection prevention helpers
# ---------------------------------------------------------------------------

_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


def assert_safe_identifier(name: str) -> str:
    """
    For the rare case where a column/table name must be interpolated
    (never user values — only used for internal, code-controlled dynamic
    query building, e.g. dynamic sort columns from an allow-list).
    """
    if not _IDENTIFIER_RE.match(name):
        raise ValueError(f"Unsafe SQL identifier: {name!r}")
    return name


ALLOWED_SORT_COLUMNS = {"created_at", "updated_at", "name"}


def validate_sort_column(column: str) -> str:
    if column not in ALLOWED_SORT_COLUMNS:
        raise HTTPException(status_code=400, detail=f"Cannot sort by '{column}'")
    return column
