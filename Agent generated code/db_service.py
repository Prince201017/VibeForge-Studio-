"""
[Claude.DB] CRUD service layer. Each *Service class wraps one (or a couple
of closely related) tables behind a small, transaction-aware async API.
Route handlers / FastAPI endpoints should talk to these, not to raw SQL.

All write methods accept an optional `conn` so callers can compose several
service calls into a single caller-owned transaction (see
services/transaction_manager.py), while still being independently usable
with their own connection when called standalone.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

import asyncpg

from db import get_pool
from db.utils import record_to_dict, records_to_dicts, transaction, with_retry

_SENTINEL = object()


class BaseService:
    """[Claude.DB] Shared connection-resolution helper for all services."""

    async def _conn_ctx(self, conn: Optional[asyncpg.Connection]):
        if conn is not None:
            return conn
        pool = get_pool()
        return await pool.acquire()

    def _release_if_owned(self, conn: asyncpg.Connection, owned: bool) -> None:
        if owned:
            pool = get_pool()
            pool.release(conn)  # type: ignore[func-returns-value]


class UserService(BaseService):
    """[Claude.DB] users / sessions."""

    async def create_user(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str | None = None,
        avatar_url: str | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO users (email, password_hash, full_name, avatar_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, email.lower().strip(), password_hash, full_name, avatar_url)
        return record_to_dict(row)  # type: ignore[return-value]

    async def get_user_by_id(
        self, user_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        c = conn or get_pool()
        row = await c.fetchrow("SELECT * FROM users WHERE id = $1 AND is_active = TRUE", user_id)
        return record_to_dict(row)

    async def get_user_by_email(
        self, email: str, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        c = conn or get_pool()
        row = await c.fetchrow(
            "SELECT * FROM users WHERE email = $1 AND is_active = TRUE", email.lower().strip()
        )
        return record_to_dict(row)

    async def update_profile(
        self,
        user_id: uuid.UUID,
        *,
        full_name: str | None = _SENTINEL,  # type: ignore[assignment]
        avatar_url: str | None = _SENTINEL,  # type: ignore[assignment]
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any] | None:
        """[Claude.DB] Partial update; only fields explicitly passed are changed."""
        sets, args = [], []
        idx = 1
        if full_name is not _SENTINEL:
            sets.append(f"full_name = ${idx}")
            args.append(full_name)
            idx += 1
        if avatar_url is not _SENTINEL:
            sets.append(f"avatar_url = ${idx}")
            args.append(avatar_url)
            idx += 1
        if not sets:
            return await self.get_user_by_id(user_id, conn=conn)

        args.append(user_id)
        sql = f"UPDATE users SET {', '.join(sets)} WHERE id = ${idx} RETURNING *;"
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, *args)
        return record_to_dict(row)

    async def create_session(
        self, user_id: uuid.UUID, token_hash: str, expires_at: datetime,
        *, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3) RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, user_id, token_hash, expires_at)
        return record_to_dict(row)  # type: ignore[return-value]

    async def revoke_session(self, token_hash: str, *, conn: Optional[asyncpg.Connection] = None) -> bool:
        async with transaction(conn) as c:
            result = await c.execute("DELETE FROM sessions WHERE token_hash = $1", token_hash)
        return result.endswith(" 1")


class ProjectService(BaseService):
    """[Claude.DB] projects."""

    async def create_project(
        self, owner_id: uuid.UUID, name: str, *, description: str | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO projects (owner_id, name, description)
        VALUES ($1, $2, $3) RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, owner_id, name.strip(), description)
        return record_to_dict(row)  # type: ignore[return-value]

    async def get_project(
        self, project_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        c = conn or get_pool()
        row = await c.fetchrow(
            "SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL", project_id
        )
        return record_to_dict(row)

    async def update_project(
        self, project_id: uuid.UUID, fields: dict[str, Any], *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        """[Claude.DB] Generic partial update guarded against unknown/unsafe columns."""
        allowed = {"name", "description", "thumbnail_url", "is_public"}
        unknown = set(fields) - allowed
        if unknown:
            raise ValueError(f"Cannot update columns: {unknown}")
        if not fields:
            return await self.get_project(project_id, conn=conn)

        sets = [f"{col} = ${i+1}" for i, col in enumerate(fields)]
        args = list(fields.values())
        args.append(project_id)
        sql = f"UPDATE projects SET {', '.join(sets)} WHERE id = ${len(args)} AND deleted_at IS NULL RETURNING *;"
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, *args)
        return record_to_dict(row)

    async def soft_delete_project(
        self, project_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        """[Claude.DB] 30-day soft-delete retention per spec; hard delete is a separate job."""
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
                project_id,
            )
        return result.endswith(" 1")

    async def restore_project(
        self, project_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE projects SET deleted_at = NULL WHERE id = $1", project_id
            )
        return result.endswith(" 1")

    @with_retry(max_attempts=3)
    async def increment_view_count(
        self, project_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> None:
        async with transaction(conn) as c:
            await c.execute(
                "UPDATE projects SET view_count = view_count + 1 WHERE id = $1", project_id
            )

    async def recompute_layer_stats(
        self, project_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        """[Claude.DB] Recalculate denormalized total_layers count from source of truth."""
        sql = """
        UPDATE projects p
        SET total_layers = (
            SELECT COUNT(*) FROM layers l WHERE l.project_id = p.id AND l.deleted_at IS NULL
        )
        WHERE p.id = $1
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, project_id)
        return record_to_dict(row)


class LayerService(BaseService):
    """[Claude.DB] layers, geometry_operations, particle_systems."""

    async def create_layer(
        self,
        *,
        project_id: uuid.UUID,
        created_by: uuid.UUID,
        layer_type: str,
        name: str,
        display_index: int,
        parent_layer_id: uuid.UUID | None = None,
        properties: dict[str, Any] | None = None,
        transform_matrix: dict[str, Any] | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO layers (
            project_id, parent_layer_id, layer_type, name, display_index,
            properties, transform_matrix, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(
                sql, project_id, parent_layer_id, layer_type, name, display_index,
                properties or {}, transform_matrix or {}, created_by,
            )
            await c.execute(
                "UPDATE projects SET total_layers = total_layers + 1 WHERE id = $1", project_id
            )
        return record_to_dict(row)  # type: ignore[return-value]

    async def get_layer(
        self, layer_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict[str, Any] | None:
        c = conn or get_pool()
        row = await c.fetchrow("SELECT * FROM layers WHERE id = $1 AND deleted_at IS NULL", layer_id)
        return record_to_dict(row)

    async def update_layer_properties(
        self, layer_id: uuid.UUID, properties_patch: dict[str, Any],
        *, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any] | None:
        """[Claude.DB] Shallow-merge JSONB patch into `properties` (Postgres `||` operator)."""
        sql = """
        UPDATE layers SET properties = properties || $2::jsonb
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, layer_id, properties_patch)
        return record_to_dict(row)

    async def reorder_layers(
        self, project_id: uuid.UUID, ordered_layer_ids: list[uuid.UUID],
        *, conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """
        [Claude.DB] Atomically reassign display_index for a set of sibling
        layers based on their position in `ordered_layer_ids`.
        """
        async with transaction(conn) as c:
            await c.executemany(
                "UPDATE layers SET display_index = $1 WHERE id = $2 AND project_id = $3",
                [(idx, lid, project_id) for idx, lid in enumerate(ordered_layer_ids)],
            )

    async def soft_delete_layer(
        self, layer_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        """[Claude.DB] Soft-deletes the layer; ON DELETE CASCADE relationships
        are for hard deletes only, so children are soft-deleted explicitly
        via the recursive subtree query in db/queries.py before calling this
        in a loop, or by a dedicated cascade routine at the caller's level."""
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE layers SET deleted_at = NOW() WHERE id = $1", layer_id
            )
        return result.endswith(" 1")

    async def add_geometry_operation(
        self, *, layer_id: uuid.UUID, project_id: uuid.UUID, operation_type: str,
        parameters: dict[str, Any], sort_index: int, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO geometry_operations (layer_id, project_id, operation_type, parameters, sort_index)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, layer_id, project_id, operation_type, parameters, sort_index)
        return record_to_dict(row)  # type: ignore[return-value]

    async def list_geometry_operations(
        self, layer_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> list[dict[str, Any]]:
        c = conn or get_pool()
        rows = await c.fetch(
            "SELECT * FROM geometry_operations WHERE layer_id = $1 AND is_active = TRUE ORDER BY sort_index",
            layer_id,
        )
        return records_to_dicts(rows)


class AnimationService(BaseService):
    """[Claude.DB] animations, keyframes."""

    async def create_animation(
        self, *, layer_id: uuid.UUID, project_id: uuid.UUID, property_name: str,
        duration_ms: int, easing_type: str, delay_ms: int = 0, loop_count: int = 1,
        yoyo: bool = False, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO animations (
            layer_id, project_id, property_name, duration_ms, delay_ms,
            easing_type, loop_count, yoyo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(
                sql, layer_id, project_id, property_name, duration_ms, delay_ms,
                easing_type, loop_count, yoyo,
            )
        return record_to_dict(row)  # type: ignore[return-value]

    async def add_keyframe(
        self, animation_id: uuid.UUID, time_ms: int, value: Any,
        *, easing: str | None = None, interpolation: str = "linear",
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO keyframes (animation_id, time_ms, value, easing, interpolation)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, animation_id, time_ms, value, easing, interpolation)
        return record_to_dict(row)  # type: ignore[return-value]

    async def bulk_add_keyframes(
        self, animation_id: uuid.UUID, keyframes: list[dict[str, Any]],
        *, conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        """[Claude.DB] Batched insert for e.g. pasting a whole keyframe curve at once."""
        async with transaction(conn) as c:
            await c.executemany(
                """
                INSERT INTO keyframes (animation_id, time_ms, value, easing, interpolation)
                VALUES ($1, $2, $3, $4, $5)
                """,
                [
                    (
                        animation_id, kf["time_ms"], kf["value"],
                        kf.get("easing"), kf.get("interpolation", "linear"),
                    )
                    for kf in keyframes
                ],
            )


class OperationService(BaseService):
    """[Claude.DB] operations (OT history log) + versions."""

    async def append_operation(
        self, *, project_id: uuid.UUID, user_id: uuid.UUID, operation_type: str,
        operation_data: dict[str, Any], parent_operation_id: uuid.UUID | None = None,
        lamport_time: int | None = None, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO operations (project_id, user_id, operation_type, operation_data, parent_operation_id, lamport_time)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(
                sql, project_id, user_id, operation_type, operation_data,
                parent_operation_id, lamport_time,
            )
        return record_to_dict(row)  # type: ignore[return-value]

    async def create_version_snapshot(
        self, *, project_id: uuid.UUID, created_by: uuid.UUID, snapshot: dict[str, Any],
        operation_count: int, name: str | None = None, description: str | None = None,
        is_auto_save: bool = False, conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO versions (project_id, name, description, snapshot, operation_count, created_by, is_auto_save)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(
                sql, project_id, name, description, snapshot, operation_count,
                created_by, is_auto_save,
            )
        return record_to_dict(row)  # type: ignore[return-value]

    async def list_versions(
        self, project_id: uuid.UUID, *, limit: int = 50, conn: Optional[asyncpg.Connection] = None
    ) -> list[dict[str, Any]]:
        c = conn or get_pool()
        rows = await c.fetch(
            "SELECT id, name, description, operation_count, created_at, created_by, is_auto_save "
            "FROM versions WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2",
            project_id, limit,
        )
        return records_to_dicts(rows)


class CommentService(BaseService):
    """[Claude.DB] comments, comment_mentions."""

    async def create_comment(
        self, *, project_id: uuid.UUID, user_id: uuid.UUID, text: str,
        layer_id: uuid.UUID | None = None, parent_comment_id: uuid.UUID | None = None,
        mentioned_user_ids: list[uuid.UUID] | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        if not text.strip():
            raise ValueError("Comment text cannot be blank")

        async with transaction(conn) as c:
            row = await c.fetchrow(
                """
                INSERT INTO comments (project_id, layer_id, user_id, text, parent_comment_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING *;
                """,
                project_id, layer_id, user_id, text.strip(), parent_comment_id,
            )
            if mentioned_user_ids:
                await c.executemany(
                    "INSERT INTO comment_mentions (comment_id, mentioned_user_id) "
                    "VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    [(row["id"], uid) for uid in mentioned_user_ids],
                )
        return record_to_dict(row)  # type: ignore[return-value]

    async def resolve_comment(
        self, comment_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE comments SET resolved = TRUE WHERE id = $1", comment_id
            )
        return result.endswith(" 1")


class AssetService(BaseService):
    """[Claude.DB] assets."""

    async def register_asset(
        self, *, project_id: uuid.UUID, user_id: uuid.UUID, asset_type: str, name: str,
        file_url: str, thumbnail_url: str | None = None, metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None, file_size: int | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO assets (project_id, user_id, asset_type, name, file_url, thumbnail_url, metadata, tags, file_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(
                sql, project_id, user_id, asset_type, name, file_url, thumbnail_url,
                metadata or {}, tags or [], file_size,
            )
        return record_to_dict(row)  # type: ignore[return-value]

    @with_retry(max_attempts=3)
    async def increment_usage(
        self, asset_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> None:
        async with transaction(conn) as c:
            await c.execute(
                "UPDATE assets SET usage_count = usage_count + 1 WHERE id = $1", asset_id
            )


class NotificationService(BaseService):
    """[Claude.DB] notifications."""

    async def notify(
        self, *, user_id: uuid.UUID, notification_type: str, related_user_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None, data: dict[str, Any] | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict[str, Any]:
        sql = """
        INSERT INTO notifications (user_id, notification_type, related_user_id, project_id, data)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
        """
        async with transaction(conn) as c:
            row = await c.fetchrow(sql, user_id, notification_type, related_user_id, project_id, data or {})
        return record_to_dict(row)  # type: ignore[return-value]

    async def mark_read(
        self, notification_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> bool:
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = $1", notification_id
            )
        return result.endswith(" 1")

    async def mark_all_read(
        self, user_id: uuid.UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> int:
        async with transaction(conn) as c:
            result = await c.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
                user_id,
            )
        # result looks like "UPDATE <n>"
        return int(result.split(" ")[-1])


class AuditService(BaseService):
    """[Claude.DB] audit_logs. Append-only, called from within the same
    transaction as the mutation it's recording wherever possible."""

    async def log(
        self, *, resource_type: str, resource_id: uuid.UUID, action: str,
        user_id: uuid.UUID | None = None, changes: dict[str, Any] | None = None,
        ip_address: str | None = None, user_agent: str | None = None,
        conn: Optional[asyncpg.Connection] = None,
    ) -> None:
        sql = """
        INSERT INTO audit_logs (user_id, resource_type, resource_id, action, changes, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
        """
        async with transaction(conn) as c:
            await c.execute(sql, user_id, resource_type, resource_id, action, changes, ip_address, user_agent)


# [Claude.DB] Module-level singletons for convenient import in route handlers.
user_service = UserService()
project_service = ProjectService()
layer_service = LayerService()
animation_service = AnimationService()
operation_service = OperationService()
comment_service = CommentService()
asset_service = AssetService()
notification_service = NotificationService()
audit_service = AuditService()
