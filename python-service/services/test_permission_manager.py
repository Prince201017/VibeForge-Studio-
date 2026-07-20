"""[CollabAgent] test_permission_manager.py — RBAC, inheritance, and share
link tests."""
from uuid import uuid4

import pytest

from models.permission import PermissionDenied, Role
from services.permission_manager import PermissionManager


def test_owner_can_do_everything():
    pm = PermissionManager()
    project_id, user_id = uuid4(), uuid4()
    pm.grant_project_role(project_id, user_id, Role.OWNER, granted_by=user_id)
    for cap in ("read", "write", "delete", "comment", "share", "manage_permissions"):
        assert pm.can(project_id, user_id, cap)


def test_viewer_cannot_write():
    pm = PermissionManager()
    project_id, owner, viewer = uuid4(), uuid4(), uuid4()
    pm.grant_project_role(project_id, owner, Role.OWNER, granted_by=owner)
    pm.grant_project_role(project_id, viewer, Role.VIEWER, granted_by=owner)
    assert pm.can(project_id, viewer, "read")
    assert not pm.can(project_id, viewer, "write")
    with pytest.raises(PermissionDenied):
        pm.require(project_id, viewer, "write")


def test_layer_permission_overrides_project_permission():
    pm = PermissionManager()
    project_id, owner, user = uuid4(), uuid4(), uuid4()
    layer_id = uuid4()
    pm.grant_project_role(project_id, owner, Role.OWNER, granted_by=owner)
    pm.grant_project_role(project_id, user, Role.VIEWER, granted_by=owner)
    # Give explicit editor rights on one layer, overriding project-level viewer.
    pm.grant_layer_role(layer_id, user, Role.EDITOR, granted_by=owner)

    assert pm.can(project_id, user, "write", layer_id=layer_id)
    assert not pm.can(project_id, user, "write")  # project-level still viewer


def test_share_link_expiry():
    pm = PermissionManager()
    project_id, owner = uuid4(), uuid4()
    link = pm.create_share_link(project_id, owner, Role.VIEWER, expires_in_seconds=-1)
    assert pm.resolve_share_link(link.token) is None  # already expired


def test_transfer_ownership():
    pm = PermissionManager()
    project_id, old_owner, new_owner = uuid4(), uuid4(), uuid4()
    pm.grant_project_role(project_id, old_owner, Role.OWNER, granted_by=old_owner)
    pm.transfer_ownership(project_id, old_owner, new_owner)
    assert pm.effective_role(project_id, new_owner) == Role.OWNER
    assert pm.effective_role(project_id, old_owner) == Role.EDITOR
