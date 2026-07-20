"""[CollabAgent] permissions.py — share/invite, role management, and
share-link REST endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.permission import PermissionDenied, Role

router = APIRouter()


def get_current_user_id() -> UUID:
    from routes.collab import get_current_user_id as _impl
    return _impl


class ShareRequest(BaseModel):
    user_id: UUID
    role: Role


@router.post("/api/projects/{project_id}/share")
async def share_project(project_id: UUID, body: ShareRequest, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager, notification_service

    try:
        permission_manager.require(project_id, actor_id, "share")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))

    perm = permission_manager.grant_project_role(project_id, body.user_id, body.role, actor_id)
    notification_service.notify_permission_change(body.user_id, project_id, actor_id, body.role.value)
    return {"status": "invited", "role": perm.role}


class RoleUpdateRequest(BaseModel):
    role: Role


@router.post("/api/projects/{project_id}/permissions/{user_id}")
async def update_permission(
    project_id: UUID, user_id: UUID, body: RoleUpdateRequest, actor_id: UUID = Depends(get_current_user_id)
):
    from main import permission_manager, notification_service

    try:
        permission_manager.require(project_id, actor_id, "manage_permissions")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))

    perm = permission_manager.grant_project_role(project_id, user_id, body.role, actor_id)
    notification_service.notify_permission_change(user_id, project_id, actor_id, body.role.value)
    return {"status": "updated", "role": perm.role}


@router.delete("/api/projects/{project_id}/permissions/{user_id}")
async def revoke_permission(project_id: UUID, user_id: UUID, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager

    try:
        permission_manager.require(project_id, actor_id, "manage_permissions")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    permission_manager.revoke(project_id, user_id, actor_id)
    return {"status": "revoked"}


class ShareLinkRequest(BaseModel):
    role: Role = Role.VIEWER
    is_public: bool = False
    expires_in_seconds: int | None = None


@router.post("/api/projects/{project_id}/share-links")
async def create_share_link(project_id: UUID, body: ShareLinkRequest, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager

    try:
        permission_manager.require(project_id, actor_id, "share")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    link = permission_manager.create_share_link(
        project_id, actor_id, body.role, body.is_public, body.expires_in_seconds
    )
    return {"token": link.token, "url": f"/join/{link.token}", "expires_at": link.expires_at}


@router.delete("/api/projects/{project_id}/share-links/{token}")
async def revoke_share_link(project_id: UUID, token: str, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager

    try:
        permission_manager.require(project_id, actor_id, "share")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    permission_manager.revoke_share_link(token, actor_id)
    return {"status": "revoked"}


@router.get("/api/projects/{project_id}/access")
async def list_access(project_id: UUID, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager

    try:
        permission_manager.require(project_id, actor_id, "read")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    access = permission_manager.list_access(project_id)
    return {"access": [a.model_dump(mode="json") for a in access]}


@router.get("/api/projects/{project_id}/audit-log")
async def audit_log(project_id: UUID, actor_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager

    try:
        permission_manager.require(project_id, actor_id, "manage_permissions")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    entries = permission_manager.audit_log_for(project_id)
    return {"entries": [e.model_dump(mode="json") for e in entries]}
