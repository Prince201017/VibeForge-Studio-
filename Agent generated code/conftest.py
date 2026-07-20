"""
[Claude.DB] Shared pytest fixtures for the database layer's integration
tests.

These are real integration tests against a live Postgres instance - there
is no mocking of asyncpg, because the value of testing this layer is
catching actual SQL errors (constraint violations, partitioning quirks,
trigger behavior) that a mock would hide.

Point DATABASE_URL at a disposable database before running, e.g.:

    docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
    export DATABASE_URL="postgresql://postgres:test@localhost:5433/postgres"
    pytest tests/ -v

If DATABASE_URL is not set, every test in this suite is skipped (not
failed) so the rest of the codebase's test run isn't blocked in
environments without a database available.
"""

from __future__ import annotations

import os
import uuid

import pytest
import pytest_asyncio

import db as db_module
from services.db_service import (
    AssetService,
    CommentService,
    LayerService,
    OperationService,
    ProjectService,
    UserService,
)

DATABASE_URL = os.environ.get("DATABASE_URL")

requires_db = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set - skipping live-database integration tests",
)


@pytest_asyncio.fixture(scope="session")
async def db_pool():
    """[Claude.DB] Initialize the pool once per test session and run all migrations."""
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL not set")
    pool = await db_module.init_db(dsn=DATABASE_URL, run_migrations=True, min_size=2, max_size=5)
    yield pool
    await db_module.close_db()


@pytest_asyncio.fixture()
async def conn(db_pool):
    """
    [Claude.DB] A connection wrapped in a transaction that's always rolled
    back at the end of the test, so tests never leave data behind or
    interfere with each other.
    """
    async with db_pool.acquire() as connection:
        tx = connection.transaction()
        await tx.start()
        try:
            yield connection
        finally:
            await tx.rollback()


@pytest_asyncio.fixture()
async def test_user(conn):
    """[Claude.DB] A throwaway user row for tests that need a valid FK target."""
    service = UserService()
    return await service.create_user(
        email=f"test-{uuid.uuid4().hex[:10]}@example.com",
        password_hash="not_a_real_hash",
        full_name="Test User",
        conn=conn,
    )


@pytest_asyncio.fixture()
async def test_project(conn, test_user):
    """[Claude.DB] A throwaway project owned by `test_user`."""
    service = ProjectService()
    return await service.create_project(test_user["id"], "Test Project", conn=conn)
