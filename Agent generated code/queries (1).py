"""
[Claude.DB] Complex, hand-tuned SQL queries that don't map cleanly to simple
CRUD (recursive tree walks, multi-table joins, aggregate rollups). Each
function takes a connection so callers control transaction scope.

All queries are parameterized ($1, $2, ...) - never string-interpolate
user input into SQL here.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

import asyncpg

from db.utils import records_to_dicts, record_to_dict

# =============================================================
# [Claude.DB] Layer hierarchy
# =============================================================

_LAYER_TREE_SQL = """
WITH RECURSIVE layer_tree AS (
    SELECT
        id, project_id, parent_layer_id, layer_type, name, display_index,
        is_visible, is_locked, opacity, blend_mode, 0 AS depth,
        ARRAY[display_index] AS sort_path
    FROM layers
    WHERE project_id = $1 AND parent_layer_id IS NULL AND deleted_at IS NULL
    UNION ALL
    SELECT
        l.id, l.project_id, l.parent_layer_id, l.layer_type, l.name, l.display_index,
        l.is_visible, l.is_locked, l.opacity, l.blend_mode, lt.depth + 1,
        lt.sort_path || l.display_index
    FROM layers l
    INNER JOIN layer_tree lt ON l.parent_layer_id = lt.id
    WHERE l.deleted_at IS NULL
)
SELECT * FROM layer_tree ORDER BY sort_path;
"""


async def get_project_layer_tree(
    conn: asyncpg.Connection, project_id: uuid.UUID
) -> list[dict[str, Any]]:
    """
    [Claude.DB] Full layer hierarchy for a project, depth-first ordered by
    each ancestor's display_index (so siblings render in the correct order
    at every level, not just globally by depth).
    """
    rows = await conn.fetch(_LAYER_TREE_SQL, project_id)
    return records_to_dicts(rows)


async def get_layer_subtree(
    conn: asyncpg.Connection, layer_id: uuid.UUID
) -> list[dict[str, Any]]:
    """[Claude.DB] All descendants of a single layer (e.g. for group operations)."""
    sql = """
    WITH RECURSIVE subtree AS (
        SELECT id, project_id, parent_layer_id, name, display_index, 0 AS depth
        FROM layers WHERE id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT l.id, l.project_id, l.parent_layer_id, l.name, l.display_index, s.depth + 1
        FROM layers l
        INNER JOIN subtree s ON l.parent_layer_id = s.id
        WHERE l.deleted_at IS NULL
    )
    SELECT * FROM subtree ORDER BY depth, display_index;
    """
    rows = await conn.fetch(sql, layer_id)
    return records_to_dicts(rows)


# =============================================================
# [Claude.DB] Collaboration
# =============================================================

async def get_active_collaborators(
    conn: asyncpg.Connection, project_id: uuid.UUID, exclude_user_id: uuid.UUID
) -> list[dict[str, Any]]:
    """[Claude.DB] Collaborators on a project excluding the requesting user, newest join first."""
    sql = """
    SELECT u.id, u.full_name, u.avatar_url, u.email, pc.role, pc.joined_at
    FROM project_collaborators pc
    JOIN users u ON pc.user_id = u.id
    WHERE pc.project_id = $1 AND u.id != $2 AND u.is_active = TRUE
    ORDER BY pc.joined_at DESC NULLS LAST;
    """
    rows = await conn.fetch(sql, project_id, exclude_user_id)
    return records_to_dicts(rows)


async def get_user_effective_role(
    conn: asyncpg.Connection, project_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[str]:
    """
    [Claude.DB] Resolve a user's effective role on a project: owner beats any
    explicit collaborator row.
    """
    sql = """
    SELECT
        CASE WHEN p.owner_id = $2 THEN 'owner' ELSE pc.role::text END AS role
    FROM projects p
    LEFT JOIN project_collaborators pc
        ON pc.project_id = p.id AND pc.user_id = $2
    WHERE p.id = $1 AND p.deleted_at IS NULL;
    """
    row = await conn.fetchrow(sql, project_id, user_id)
    return row["role"] if row else None


# =============================================================
# [Claude.DB] Operations / history
# =============================================================

async def get_recent_operations(
    conn: asyncpg.Connection, project_id: uuid.UUID, *, since_interval: str = "1 hour", limit: int = 100
) -> list[dict[str, Any]]:
    """[Claude.DB] Most recent operations within a time window, for catch-up sync."""
    sql = f"""
    SELECT id, operation_index, user_id, operation_type, operation_data, "timestamp", lamport_time
    FROM operations
    WHERE project_id = $1 AND "timestamp" > NOW() - $2::interval
    ORDER BY operation_index DESC
    LIMIT $3;
    """
    rows = await conn.fetch(sql, project_id, since_interval, limit)
    return records_to_dicts(rows)


async def get_operations_since_index(
    conn: asyncpg.Connection, project_id: uuid.UUID, after_operation_index: int, *, limit: int = 500
) -> list[dict[str, Any]]:
    """[Claude.DB] Ordered operations after a client's last-known index, for reconnect replay."""
    sql = """
    SELECT id, operation_index, user_id, operation_type, operation_data, "timestamp", lamport_time
    FROM operations
    WHERE project_id = $1 AND operation_index > $2
    ORDER BY operation_index ASC
    LIMIT $3;
    """
    rows = await conn.fetch(sql, project_id, after_operation_index, limit)
    return records_to_dicts(rows)


async def get_next_operation_index(conn: asyncpg.Connection, project_id: uuid.UUID) -> int:
    """[Claude.DB] Next operation_index for a project (operations.operation_index is a
    BIGSERIAL, but this helper is used when pre-allocating an index inside an
    advisory-locked section for strict per-project ordering)."""
    row = await conn.fetchrow(
        "SELECT COALESCE(MAX(operation_index), 0) + 1 AS next_index "
        "FROM operations WHERE project_id = $1",
        project_id,
    )
    return row["next_index"]


# =============================================================
# [Claude.DB] Project dashboard / listing
# =============================================================

async def list_projects_for_user(
    conn: asyncpg.Connection,
    user_id: uuid.UUID,
    *,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    [Claude.DB] Projects owned by OR shared with a user, newest activity
    first. Powers the dashboard "your projects" view.
    """
    sql = """
    SELECT DISTINCT p.id, p.name, p.thumbnail_url, p.updated_at, p.total_layers,
           p.view_count, p.is_public,
           CASE WHEN p.owner_id = $1 THEN 'owner' ELSE pc.role::text END AS role
    FROM projects p
    LEFT JOIN project_collaborators pc
        ON pc.project_id = p.id AND pc.user_id = $1
    WHERE p.deleted_at IS NULL
      AND (p.owner_id = $1 OR pc.user_id = $1)
    ORDER BY p.updated_at DESC
    LIMIT $2 OFFSET $3;
    """
    rows = await conn.fetch(sql, user_id, limit, offset)
    return records_to_dicts(rows)


async def get_project_summary(conn: asyncpg.Connection, project_id: uuid.UUID) -> dict[str, Any] | None:
    """
    [Claude.DB] Single-project dashboard card: owner info + collaborator
    count + comment count, in one round trip.
    """
    sql = """
    SELECT
        p.*,
        u.full_name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        (SELECT COUNT(*) FROM project_collaborators pc WHERE pc.project_id = p.id) AS collaborator_count,
        (SELECT COUNT(*) FROM comments c WHERE c.project_id = p.id AND c.resolved = FALSE) AS open_comment_count
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    WHERE p.id = $1 AND p.deleted_at IS NULL;
    """
    row = await conn.fetchrow(sql, project_id)
    return record_to_dict(row)


# =============================================================
# [Claude.DB] Animations
# =============================================================

async def get_layer_animations_with_keyframes(
    conn: asyncpg.Connection, layer_id: uuid.UUID
) -> list[dict[str, Any]]:
    """
    [Claude.DB] All active animations for a layer, each with its keyframes
    nested as a JSON array, in one query (avoids N+1 when loading the
    animation timeline panel).
    """
    sql = """
    SELECT
        a.id, a.property_name, a.duration_ms, a.delay_ms, a.easing_type,
        a.loop_count, a.yoyo,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', k.id, 'time_ms', k.time_ms, 'value', k.value,
                    'easing', k.easing, 'interpolation', k.interpolation
                ) ORDER BY k.time_ms
            ) FILTER (WHERE k.id IS NOT NULL),
            '[]'
        ) AS keyframes
    FROM animations a
    LEFT JOIN keyframes k ON k.animation_id = a.id
    WHERE a.layer_id = $1 AND a.is_active = TRUE
    GROUP BY a.id
    ORDER BY a.created_at;
    """
    rows = await conn.fetch(sql, layer_id)
    return records_to_dicts(rows)


# =============================================================
# [Claude.DB] Comments
# =============================================================

async def get_comment_thread(
    conn: asyncpg.Connection, project_id: uuid.UUID, *, layer_id: uuid.UUID | None = None
) -> list[dict[str, Any]]:
    """
    [Claude.DB] Top-level comments (+ author) with their reply count, most
    recent first. Pass layer_id to scope to a single layer's comment pin.
    """
    sql = """
    SELECT
        c.id, c.text, c.resolved, c.created_at, c.layer_id,
        u.id AS author_id, u.full_name AS author_name, u.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM comments r WHERE r.parent_comment_id = c.id) AS reply_count
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.project_id = $1
      AND c.parent_comment_id IS NULL
      AND ($2::uuid IS NULL OR c.layer_id = $2)
    ORDER BY c.created_at DESC;
    """
    rows = await conn.fetch(sql, project_id, layer_id)
    return records_to_dicts(rows)


# =============================================================
# [Claude.DB] Assets search
# =============================================================

async def search_assets(
    conn: asyncpg.Connection,
    project_id: uuid.UUID,
    *,
    query: str | None = None,
    asset_type: str | None = None,
    tags: list[str] | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """
    [Claude.DB] Asset library search: fuzzy name match (pg_trgm), optional
    type filter, optional tag overlap filter. Target: <100ms for 10K items
    per the spec's performance targets, backed by idx_assets_name_trgm /
    idx_assets_type / idx_assets_tags_gin.
    """
    sql = """
    SELECT id, asset_type, name, file_url, thumbnail_url, tags, file_size, usage_count, created_at
    FROM assets
    WHERE project_id = $1
      AND ($2::varchar IS NULL OR asset_type = $2)
      AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')
      AND ($4::text[] IS NULL OR tags && $4)
    ORDER BY usage_count DESC, created_at DESC
    LIMIT $5 OFFSET $6;
    """
    rows = await conn.fetch(sql, project_id, asset_type, query, tags, limit, offset)
    return records_to_dicts(rows)


# =============================================================
# [Claude.DB] Notifications
# =============================================================

async def get_unread_notifications(
    conn: asyncpg.Connection, user_id: uuid.UUID, *, limit: int = 50
) -> list[dict[str, Any]]:
    """[Claude.DB] Unread notifications for a user's bell icon, newest first."""
    sql = """
    SELECT n.id, n.notification_type, n.data, n.created_at,
           n.project_id, p.name AS project_name,
           ru.full_name AS related_user_name, ru.avatar_url AS related_user_avatar_url
    FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id
    LEFT JOIN users ru ON ru.id = n.related_user_id
    WHERE n.user_id = $1 AND n.is_read = FALSE
    ORDER BY n.created_at DESC
    LIMIT $2;
    """
    rows = await conn.fetch(sql, user_id, limit)
    return records_to_dicts(rows)


# =============================================================
# [Claude.DB] Aggregate / analytics
# =============================================================

async def get_project_dashboard_cached(
    conn: asyncpg.Connection, user_id: uuid.UUID, *, limit: int = 20, offset: int = 0
) -> list[dict[str, Any]]:
    """
    [Claude.DB] Reads from `mv_project_dashboard` (materialized view added in
    migration 005) instead of joining projects/users/collaborators/comments
    live. Much cheaper for a dashboard listing at scale; the view is kept
    fresh by calling `query_optimizer.refresh_materialized_view()` on a
    schedule (or after high-signal writes like a new collaborator joining).
    """
    sql = """
    SELECT d.*
    FROM mv_project_dashboard d
    LEFT JOIN project_collaborators pc ON pc.project_id = d.project_id AND pc.user_id = $1
    WHERE d.owner_id = $1 OR pc.user_id = $1
    ORDER BY d.updated_at DESC
    LIMIT $2 OFFSET $3;
    """
    rows = await conn.fetch(sql, user_id, limit, offset)
    return records_to_dicts(rows)


async def get_project_storage_breakdown(
    conn: asyncpg.Connection, project_id: uuid.UUID
) -> dict[str, Any] | None:
    """[Claude.DB] Storage usage by asset_type, for the quota UI."""
    sql = """
    SELECT
        p.id, p.total_size, p.total_layers,
        COALESCE(
            json_object_agg(a.asset_type, a.type_total) FILTER (WHERE a.asset_type IS NOT NULL),
            '{}'
        ) AS asset_size_by_type
    FROM projects p
    LEFT JOIN (
        SELECT project_id, asset_type, SUM(COALESCE(file_size, 0)) AS type_total
        FROM assets
        WHERE project_id = $1
        GROUP BY project_id, asset_type
    ) a ON a.project_id = p.id
    WHERE p.id = $1
    GROUP BY p.id;
    """
    row = await conn.fetchrow(sql, project_id)
    return record_to_dict(row)
