"""
[Claude.A11] Role-based access control
File: python-service/security/rbac.py

Roles: owner > editor > commenter > viewer, with "deny override allow"
semantics — an explicit deny (e.g. a revoked share, a suspended member)
always wins over any inherited or org-level grant.

This module is intentionally storage-agnostic: it expects a `db` handle
with async fetchrow/fetch methods (matches asyncpg / SQLAlchemy async
session conventions) so it can be wired into whichever DB layer the
Database Schema team (spec 11) lands on.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger("forgeos.rbac")

ROLE_RANK: dict[str, int] = {
    "viewer": 0,
    "commenter": 1,
    "editor": 2,
    "owner": 3,
}

VALID_ROLES = set(ROLE_RANK.keys())

# Injected at app startup by main.py — kept as a module-level singleton to
# avoid threading a db handle through every call site by hand.
_db = None


def bind_database(db) -> None:
    global _db
    _db = db


class PermissionDenied(Exception):
    pass


async def get_effective_role(user_id: str, project_id: str) -> Optional[str]:
    """
    Resolves the effective role for a user on a project by checking, in
    order:
      1. An explicit per-project deny (revoked access) -> None, short-circuits
      2. Direct project membership role
      3. Org-level role, if the project belongs to an org the user is in
      4. None (no access)
    """
    if _db is None:
        raise RuntimeError("rbac.bind_database() must be called at startup")

    deny = await _db.fetchrow(
        "SELECT 1 FROM project_access_denials WHERE user_id = $1 AND project_id = $2",
        user_id,
        project_id,
    )
    if deny is not None:
        return None

    membership = await _db.fetchrow(
        "SELECT role FROM project_members WHERE user_id = $1 AND project_id = $2",
        user_id,
        project_id,
    )
    if membership is not None:
        return membership["role"]

    org_role = await _db.fetchrow(
        """
        SELECT om.role FROM org_members om
        JOIN projects p ON p.org_id = om.org_id
        WHERE om.user_id = $1 AND p.id = $2
        """,
        user_id,
        project_id,
    )
    if org_role is not None:
        # Org roles map onto project roles; org "admin" implies project "owner".
        return "owner" if org_role["role"] == "admin" else org_role["role"]

    return None


async def check_permission(user_id: str, project_id: str, permission: str) -> bool:
    """
    permission is one of: 'view', 'comment', 'edit', 'manage' (manage ==
    sharing/deleting/owner-level actions).
    """
    permission_to_min_role = {
        "view": "viewer",
        "comment": "commenter",
        "edit": "editor",
        "manage": "owner",
    }
    minimum = permission_to_min_role.get(permission)
    if minimum is None:
        raise ValueError(f"Unknown permission: {permission}")

    role = await get_effective_role(user_id, project_id)
    if role is None:
        return False
    return ROLE_RANK[role] >= ROLE_RANK[minimum]


async def require_permission(user_id: str, project_id: str, permission: str) -> None:
    allowed = await check_permission(user_id, project_id, permission)
    if not allowed:
        raise PermissionDenied(f"User {user_id} lacks '{permission}' on project {project_id}")


async def set_member_role(project_id: str, target_user_id: str, role: str, acting_user_id: str) -> None:
    """
    Changes a member's role. Caller must already have 'manage' permission —
    enforced by the route handler via require_role("owner"), this function
    re-checks defensively since role changes are high-stakes.
    """
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role: {role}")

    if not await check_permission(acting_user_id, project_id, "manage"):
        raise PermissionDenied("Only owners can change member roles")

    if _db is None:
        raise RuntimeError("rbac.bind_database() must be called at startup")

    await _db.execute(
        """
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
        """,
        project_id,
        target_user_id,
        role,
    )
    logger.info("Role change: project=%s target=%s role=%s by=%s", project_id, target_user_id, role, acting_user_id)


async def revoke_access(project_id: str, target_user_id: str, acting_user_id: str) -> None:
    if not await check_permission(acting_user_id, project_id, "manage"):
        raise PermissionDenied("Only owners can revoke access")

    if _db is None:
        raise RuntimeError("rbac.bind_database() must be called at startup")

    async with _db.transaction():
        await _db.execute(
            "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
            project_id,
            target_user_id,
        )
        await _db.execute(
            """
            INSERT INTO project_access_denials (project_id, user_id, revoked_by, revoked_at)
            VALUES ($1, $2, $3, now())
            ON CONFLICT (project_id, user_id) DO NOTHING
            """,
            project_id,
            target_user_id,
            acting_user_id,
        )
