"""[Claude.DB] Tests for services/db_service.py - basic CRUD correctness,
constraint enforcement, and soft-delete behavior."""

from __future__ import annotations

import uuid

import asyncpg
import pytest

from services.db_service import LayerService, UserService
from tests.conftest import requires_db


@requires_db
@pytest.mark.asyncio
async def test_create_and_fetch_user(conn):
    service = UserService()
    created = await service.create_user(
        email="alice@example.com", password_hash="hash123", full_name="Alice", conn=conn
    )
    assert created["email"] == "alice@example.com"

    fetched = await service.get_user_by_id(created["id"], conn=conn)
    assert fetched is not None
    assert fetched["full_name"] == "Alice"


@requires_db
@pytest.mark.asyncio
async def test_duplicate_email_rejected(conn):
    service = UserService()
    await service.create_user(email="dupe@example.com", password_hash="a", conn=conn)
    with pytest.raises(asyncpg.UniqueViolationError):
        await service.create_user(email="dupe@example.com", password_hash="b", conn=conn)


@requires_db
@pytest.mark.asyncio
async def test_invalid_email_format_rejected(conn):
    service = UserService()
    with pytest.raises(asyncpg.CheckViolationError):
        await service.create_user(email="not-an-email", password_hash="a", conn=conn)


@requires_db
@pytest.mark.asyncio
async def test_layer_create_and_get(conn, test_project, test_user):
    service = LayerService()
    layer = await service.create_layer(
        project_id=test_project["id"],
        created_by=test_user["id"],
        layer_type="shape",
        name="Rectangle 1",
        display_index=0,
        conn=conn,
    )
    assert layer["name"] == "Rectangle 1"

    fetched = await service.get_layer(layer["id"], conn=conn)
    assert fetched is not None


@requires_db
@pytest.mark.asyncio
async def test_cascading_soft_delete_removes_children(conn, test_project, test_user):
    service = LayerService()
    root = await service.create_layer(
        project_id=test_project["id"], created_by=test_user["id"],
        layer_type="group", name="Group", display_index=0, conn=conn,
    )
    child = await service.create_layer(
        project_id=test_project["id"], created_by=test_user["id"],
        layer_type="shape", name="Child", display_index=0,
        parent_layer_id=root["id"], conn=conn,
    )
    grandchild = await service.create_layer(
        project_id=test_project["id"], created_by=test_user["id"],
        layer_type="shape", name="Grandchild", display_index=0,
        parent_layer_id=child["id"], conn=conn,
    )

    deleted_ids = await service.soft_delete_layer_cascade(root["id"], conn=conn)
    assert set(deleted_ids) == {root["id"], child["id"], grandchild["id"]}

    for layer_id in deleted_ids:
        assert await service.get_layer(layer_id, conn=conn) is None


@requires_db
@pytest.mark.asyncio
async def test_opacity_out_of_range_rejected(conn, test_project, test_user):
    service = LayerService()
    with pytest.raises(asyncpg.CheckViolationError):
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO layers (project_id, layer_type, name, display_index, opacity, created_by)
                VALUES ($1, 'shape', 'Bad Opacity', 0, 1.5, $2)
                """,
                test_project["id"], test_user["id"],
            )
