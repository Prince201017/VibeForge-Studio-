"""[Claude.A11] Tests for security/rbac.py using an in-memory fake DB."""

import pytest

from python_service.security import rbac


class FakeDB:
    """Minimal async DB stub matching the subset of asyncpg's interface rbac.py uses."""

    def __init__(self):
        self.denials: set[tuple[str, str]] = set()
        self.memberships: dict[tuple[str, str], str] = {}  # (user_id, project_id) -> role
        self.org_memberships: dict[tuple[str, str], str] = {}  # (user_id, org_id) -> role
        self.project_orgs: dict[str, str] = {}  # project_id -> org_id

    async def fetchrow(self, query: str, *args):
        q = " ".join(query.split())
        if "project_access_denials" in q:
            user_id, project_id = args
            return {"1": 1} if (user_id, project_id) in self.denials else None
        if "FROM project_members" in q:
            user_id, project_id = args
            role = self.memberships.get((user_id, project_id))
            return {"role": role} if role else None
        if "org_members om" in q:
            user_id, project_id = args
            org_id = self.project_orgs.get(project_id)
            if org_id is None:
                return None
            role = self.org_memberships.get((user_id, org_id))
            return {"role": role} if role else None
        raise AssertionError(f"Unexpected query: {q}")

    async def execute(self, query, *args):
        pass

    def transaction(self):
        return _NoopTxn()


class _NoopTxn:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


@pytest.fixture(autouse=True)
def fake_db():
    db = FakeDB()
    rbac.bind_database(db)
    yield db
    rbac._db = None


@pytest.mark.asyncio
async def test_no_access_returns_none(fake_db):
    role = await rbac.get_effective_role("user1", "project1")
    assert role is None


@pytest.mark.asyncio
async def test_direct_membership_grants_role(fake_db):
    fake_db.memberships[("user1", "project1")] = "editor"
    role = await rbac.get_effective_role("user1", "project1")
    assert role == "editor"


@pytest.mark.asyncio
async def test_explicit_denial_overrides_membership(fake_db):
    fake_db.memberships[("user1", "project1")] = "owner"
    fake_db.denials.add(("user1", "project1"))
    role = await rbac.get_effective_role("user1", "project1")
    assert role is None, "explicit deny must override any grant"


@pytest.mark.asyncio
async def test_org_admin_implies_project_owner(fake_db):
    fake_db.project_orgs["project1"] = "org1"
    fake_db.org_memberships[("user1", "org1")] = "admin"
    role = await rbac.get_effective_role("user1", "project1")
    assert role == "owner"


@pytest.mark.asyncio
async def test_check_permission_respects_role_hierarchy(fake_db):
    fake_db.memberships[("user1", "project1")] = "commenter"
    assert await rbac.check_permission("user1", "project1", "view") is True
    assert await rbac.check_permission("user1", "project1", "comment") is True
    assert await rbac.check_permission("user1", "project1", "edit") is False
    assert await rbac.check_permission("user1", "project1", "manage") is False


@pytest.mark.asyncio
async def test_require_permission_raises_when_denied(fake_db):
    with pytest.raises(rbac.PermissionDenied):
        await rbac.require_permission("stranger", "project1", "view")


@pytest.mark.asyncio
async def test_set_member_role_requires_manage_permission(fake_db):
    fake_db.memberships[("acting_user", "project1")] = "editor"  # not owner
    with pytest.raises(rbac.PermissionDenied):
        await rbac.set_member_role("project1", "target_user", "editor", "acting_user")


@pytest.mark.asyncio
async def test_set_member_role_succeeds_for_owner(fake_db):
    fake_db.memberships[("acting_user", "project1")] = "owner"
    # Should not raise.
    await rbac.set_member_role("project1", "target_user", "editor", "acting_user")


@pytest.mark.asyncio
async def test_revoke_access_requires_manage_permission(fake_db):
    fake_db.memberships[("acting_user", "project1")] = "viewer"
    with pytest.raises(rbac.PermissionDenied):
        await rbac.revoke_access("project1", "target_user", "acting_user")
