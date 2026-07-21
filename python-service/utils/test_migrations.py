"""[Claude.DB] Tests that all 5 migrations apply cleanly and produce the
expected schema objects - tables, partitions, indexes, materialized view."""

from __future__ import annotations

import pytest

from tests.conftest import requires_db


@requires_db
@pytest.mark.asyncio
async def test_all_expected_tables_exist(db_pool):
    expected_tables = {
        "users", "sessions", "projects", "layers", "project_collaborators",
        "share_links", "operations", "comments", "comment_mentions",
        "animations", "keyframes", "geometry_operations", "particle_systems",
        "versions", "assets", "notifications", "audit_logs", "schema_migrations",
    }
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
    actual = {r["tablename"] for r in rows}
    missing = expected_tables - actual
    assert not missing, f"Missing expected tables: {missing}"


@requires_db
@pytest.mark.asyncio
async def test_operations_table_is_partitioned(db_pool):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT count(*) AS partition_count
            FROM pg_inherits
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            WHERE parent.relname = 'operations'
            """
        )
    assert row["partition_count"] == 8, "Expected 8 hash partitions on operations"


@requires_db
@pytest.mark.asyncio
async def test_audit_logs_table_is_partitioned(db_pool):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT count(*) AS partition_count
            FROM pg_inherits
            JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
            WHERE parent.relname = 'audit_logs'
            """
        )
    # 3 explicit monthly partitions + 1 default catch-all
    assert row["partition_count"] >= 4


@requires_db
@pytest.mark.asyncio
async def test_materialized_view_exists_and_is_queryable(db_pool):
    async with db_pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_project_dashboard')"
        )
        assert exists
        # Should not raise even when empty.
        await conn.fetch("SELECT * FROM mv_project_dashboard LIMIT 1")


@requires_db
@pytest.mark.asyncio
async def test_projects_have_storage_quota_column(db_pool):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT column_name, column_default FROM information_schema.columns "
            "WHERE table_name = 'projects' AND column_name = 'storage_quota_bytes'"
        )
    assert row is not None


@requires_db
@pytest.mark.asyncio
async def test_migrations_are_idempotent(db_pool):
    """[Claude.DB] Re-running apply_migrations() after all migrations are
    already applied should be a no-op, not an error."""
    import db as db_module
    applied = await db_module.apply_migrations(db_pool)
    assert applied == []
