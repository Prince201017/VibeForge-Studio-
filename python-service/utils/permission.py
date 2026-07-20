"""[CollabAgent] permission.py — RBAC models for projects, layers, and share links."""
from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Role(str, Enum):
    OWNER = "owner"
    EDITOR = "editor"
    COMMENTER = "commenter"
    VIEWER = "viewer"


# Capability matrix — single source of truth for what each role can do.
ROLE_CAPABILITIES: dict[Role, set[str]] = {
    Role.OWNER: {"read", "write", "delete", "comment", "share", "manage_permissions", "manage_project"},
    Role.EDITOR: {"read", "write", "comment", "share"},
    Role.COMMENTER: {"read", "comment"},
    Role.VIEWER: {"read"},
}


class ResourcePermission(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    resource_id: UUID  # project id or layer id
    resource_type: str = "project"  # "project" | "layer"
    user_id: UUID
    role: Role
    granted_by: Optional[UUID] = None
    granted_at: float = 0.0


class ShareLink(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    token: str
    role: Role = Role.VIEWER
    is_public: bool = False
    expires_at: Optional[float] = None
    created_by: UUID
    created_at: float = 0.0
    revoked: bool = False


class PermissionAuditEntry(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    resource_id: UUID
    actor_id: UUID
    target_user_id: Optional[UUID] = None
    action: str  # "grant" | "revoke" | "role_change" | "share_link_created" | "share_link_revoked"
    old_role: Optional[Role] = None
    new_role: Optional[Role] = None
    timestamp: float = 0.0
