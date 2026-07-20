"""
[Claude.A11] FastAPI auth middleware & dependencies
File: python-service/middleware/auth_middleware.py

Exposes:
  - require_auth: FastAPI dependency that returns CurrentUser or raises 401
  - optional_auth: same, but returns None instead of raising when absent
  - require_role: dependency factory for RBAC checks against a project
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..auth import AuthError, CurrentUser, extract_bearer_token, verify_token
from ..security.audit_logger import log_event

logger = logging.getLogger("forgeos.auth_middleware")

_bearer_scheme = HTTPBearer(auto_error=False)


async def require_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> CurrentUser:
    """Primary dependency for protected endpoints. Raises 401 on any failure."""
    header_value = f"Bearer {credentials.credentials}" if credentials else request.headers.get("Authorization")

    try:
        token = extract_bearer_token(header_value)
        user = await verify_token(token)
    except AuthError as exc:
        await log_event(
            action="auth.failed",
            user_id=None,
            ip_address=_client_ip(request),
            user_agent=request.headers.get("user-agent", ""),
            metadata={"reason": exc.message, "path": str(request.url.path)},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    # Stash on request.state so downstream logging middleware can read it
    # without re-verifying the token.
    request.state.current_user = user
    return user


async def optional_auth(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[CurrentUser]:
    """For endpoints that behave differently for signed-in vs anonymous users."""
    if credentials is None and "Authorization" not in request.headers:
        return None
    try:
        return await require_auth(request, credentials)
    except HTTPException:
        return None


def require_role(minimum_role: str):
    """
    Dependency factory: require_role("editor") returns a dependency that
    ensures current_user has at least `editor` permission on the project
    referenced by the `project_id` path parameter.

    Usage:
        @app.post("/api/projects/{project_id}/assets")
        async def upload(project_id: str, user: CurrentUser = Depends(require_role("editor"))):
            ...
    """
    from ..security.rbac import ROLE_RANK, get_effective_role  # local import avoids cycle

    async def _dependency(
        request: Request,
        user: CurrentUser = Depends(require_auth),
    ) -> CurrentUser:
        project_id = request.path_params.get("project_id")
        if project_id is None:
            raise HTTPException(status_code=500, detail="require_role used on a route without project_id")

        effective = await get_effective_role(user_id=user.id, project_id=project_id)
        if effective is None or ROLE_RANK[effective] < ROLE_RANK[minimum_role]:
            await log_event(
                action="permission.denied",
                user_id=user.id,
                ip_address=_client_ip(request),
                user_agent=request.headers.get("user-agent", ""),
                metadata={"project_id": project_id, "required_role": minimum_role, "actual_role": effective},
            )
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")

        return user

    return _dependency


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
