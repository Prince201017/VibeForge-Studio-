"""[Claude.DB] Tests for storage quota enforcement (services/db_service.py)
and the multi-step atomic TransactionManager (services/transaction_manager.py)."""

from __future__ import annotations

import pytest

from services.db_service import AssetService, ProjectService, QuotaExceededError
from services.transaction_manager import TransactionAbortedError, TransactionManager
from tests.conftest import requires_db


@requires_db
@pytest.mark.asyncio
async def test_reserve_storage_within_quota_succeeds(conn, test_project):
    service = ProjectService()
    new_total = await service.reserve_storage(test_project["id"], 1000, conn=conn)
    assert new_total == 1000


@requires_db
@pytest.mark.asyncio
async def test_reserve_storage_over_quota_raises(conn, test_project):
    service = ProjectService()
    # test_project defaults to a 5 GiB quota; ask for way more than that.
    with pytest.raises(QuotaExceededError):
        await service.reserve_storage(test_project["id"], 999_999_999_999, conn=conn)


@requires_db
@pytest.mark.asyncio
async def test_register_asset_over_quota_rolls_back(conn, test_project, test_user):
    """[Claude.DB] If the storage reservation fails, the asset row must not
    be inserted - the whole registration is one atomic unit."""
    service = AssetService()
    with pytest.raises(QuotaExceededError):
        await service.register_asset(
            project_id=test_project["id"],
            user_id=test_user["id"],
            asset_type="image",
            name="huge.png",
            file_url="https://example.com/huge.png",
            file_size=999_999_999_999,
            conn=conn,
        )

    async with conn.transaction():
        row = await conn.fetchrow(
            "SELECT COUNT(*) AS n FROM assets WHERE project_id = $1", test_project["id"]
        )
    assert row["n"] == 0


@requires_db
@pytest.mark.asyncio
async def test_asset_delete_releases_quota(conn, test_project, test_user):
    service = AssetService()
    asset = await service.register_asset(
        project_id=test_project["id"], user_id=test_user["id"], asset_type="image",
        name="small.png", file_url="https://example.com/small.png", file_size=500, conn=conn,
    )

    project_service = ProjectService()
    mid = await project_service.get_project(test_project["id"], conn=conn)
    assert mid["total_size"] == 500

    await service.delete_asset(asset["id"], conn=conn)
    after = await project_service.get_project(test_project["id"], conn=conn)
    assert after["total_size"] == 0


@requires_db
@pytest.mark.asyncio
async def test_transaction_manager_rolls_back_all_steps_on_failure(db_pool, test_user):
    """[Claude.DB] If a required step fails, earlier steps in the same run
    must be rolled back too - nothing partially committed."""
    project_service = ProjectService()

    created_project_id = {}

    async def step_create_project(ctx):
        project = await project_service.create_project(
            test_user["id"], "Should Not Persist", conn=ctx.conn
        )
        created_project_id["id"] = project["id"]

    async def step_always_fails(ctx):
        raise RuntimeError("simulated failure")

    tm = TransactionManager()
    tm.add_step("create_project", step_create_project)
    tm.add_step("fail_on_purpose", step_always_fails)

    async with db_pool.acquire() as conn:
        with pytest.raises(TransactionAbortedError):
            await tm.run(conn=conn)

    async with db_pool.acquire() as verify_conn:
        row = await verify_conn.fetchrow(
            "SELECT id FROM projects WHERE id = $1", created_project_id["id"]
        )
    assert row is None, "Project from a failed multi-step transaction must not persist"
