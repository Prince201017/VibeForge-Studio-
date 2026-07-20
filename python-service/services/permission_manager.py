"""[CollabAgent] permission_manager.py — role-based access control with
project/layer inheritance, share-link permissions, and audit logging."""
from __future__ import annotations

import secrets
import time
from uuid import UUID

from models.permission import (
    ROLE_CAPABILITIES,
    PermissionAuditEntry,
    ResourcePermission,
    Role,
    ShareLink,
)


class PermissionDenied(Exception):
    pass


class PermissionManager:
    def __init__(self) -> None:
        # project_id -> user_id -> ResourcePermission
        self._project_perms: dict[UUID, dict[UUID, ResourcePermission]] = {}
        # layer_id -> user_id -> ResourcePermission  (overrides project-level)
        self._layer_perms: dict[UUID, dict[UUID, ResourcePermission]] = {}
        # token -> ShareLink
        self._share_links: dict[str, ShareLink] = {}
        self._audit_log: list[PermissionAuditEntry] = []

    # -- grants ---------------------------------------------------------------

    def grant_project_role(
        self, project_id: UUID, user_id: UUID, role: Role, granted_by: UUID
    ) -> ResourcePermission:
        existing = self._project_perms.get(project_id, {}).get(user_id)
        perm = ResourcePermission(
            resource_id=project_id,
            resource_type="project",
            user_id=user_id,
            role=role,
            granted_by=granted_by,
            granted_at=time.time(),
        )
        self._project_perms.setdefault(project_id, {})[user_id] = perm
        self._audit_log.append(
            PermissionAuditEntry(
                resource_id=project_id,
                actor_id=granted_by,
                target_user_id=user_id,
                action="role_change" if existing else "grant",
                old_role=existing.role if existing else None,
                new_role=role,
                timestamp=time.time(),
            )
        )
        return perm

    def grant_layer_role(
        self, layer_id: UUID, user_id: UUID, role: Role, granted_by: UUID
    ) -> ResourcePermission:
        perm = ResourcePermission(
            resource_id=layer_id,
            resource_type="layer",
            user_id=user_id,
            role=role,
            granted_by=granted_by,
            granted_at=time.time(),
        )
        self._layer_perms.setdefault(layer_id, {})[user_id] = perm
        self._audit_log.append(
            PermissionAuditEntry(
                resource_id=layer_id,
                actor_id=granted_by,
                target_user_id=user_id,
                action="grant",
                new_role=role,
                timestamp=time.time(),
            )
        )
        return perm

    def revoke(self, project_id: UUID, user_id: UUID, actor_id: UUID) -> None:
        existing = self._project_perms.get(project_id, {}).pop(user_id, None)
        self._audit_log.append(
            PermissionAuditEntry(
                resource_id=project_id,
                actor_id=actor_id,
                target_user_id=user_id,
                action="revoke",
                old_role=existing.role if existing else None,
                timestamp=time.time(),
            )
        )

    def transfer_ownership(self, project_id: UUID, from_user: UUID, to_user: UUID) -> None:
        self.grant_project_role(project_id, to_user, Role.OWNER, from_user)
        self.grant_project_role(project_id, from_user, Role.EDITOR, from_user)

    # -- effective role resolution (layer overrides project) -------------------

    def effective_role(
        self, project_id: UUID, user_id: UUID, layer_id: UUID | None = None
    ) -> Role | None:
        if layer_id is not None:
            layer_perm = self._layer_perms.get(layer_id, {}).get(user_id)
            if layer_perm:
                return layer_perm.role
        project_perm = self._project_perms.get(project_id, {}).get(user_id)
        return project_perm.role if project_perm else None

    def can(
        self, project_id: UUID, user_id: UUID, capability: str, layer_id: UUID | None = None
    ) -> bool:
        role = self.effective_role(project_id, user_id, layer_id)
        if role is None:
            return False
        return capability in ROLE_CAPABILITIES.get(role, set())

    def require(
        self, project_id: UUID, user_id: UUID, capability: str, layer_id: UUID | None = None
    ) -> None:
        if not self.can(project_id, user_id, capability, layer_id):
            raise PermissionDenied(
                f"user {user_id} lacks '{capability}' on project {project_id}"
            )

    # -- share links ------------------------------------------------------------

    def create_share_link(
        self,
        project_id: UUID,
        created_by: UUID,
        role: Role = Role.VIEWER,
        is_public: bool = False,
        expires_in_seconds: int | None = None,
    ) -> ShareLink:
        token = secrets.token_urlsafe(24)
        link = ShareLink(
            project_id=project_id,
            token=token,
            role=role,
            is_public=is_public,
            expires_at=(time.time() + expires_in_seconds) if expires_in_seconds else None,
            created_by=created_by,
            created_at=time.time(),
        )
        self._share_links[token] = link
        self._audit_log.append(
            PermissionAuditEntry(
                resource_id=project_id,
                actor_id=created_by,
                action="share_link_created",
                new_role=role,
                timestamp=time.time(),
            )
        )
        return link

    def resolve_share_link(self, token: str) -> ShareLink | None:
        link = self._share_links.get(token)
        if link is None or link.revoked:
            return None
        if link.expires_at and time.time() > link.expires_at:
            return None
        return link

    def revoke_share_link(self, token: str, actor_id: UUID) -> None:
        link = self._share_links.get(token)
        if link:
            link.revoked = True
            self._audit_log.append(
                PermissionAuditEntry(
                    resource_id=link.project_id,
                    actor_id=actor_id,
                    action="share_link_revoked",
                    timestamp=time.time(),
                )
            )

    def audit_log_for(self, project_id: UUID) -> list[PermissionAuditEntry]:
        return [e for e in self._audit_log if e.resource_id == project_id]

    def list_access(self, project_id: UUID) -> list[ResourcePermission]:
        return list(self._project_perms.get(project_id, {}).values())
