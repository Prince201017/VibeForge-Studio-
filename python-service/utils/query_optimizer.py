"""
[Claude.DB] Query optimization helpers: an in-process + optional Redis
result cache for hot read paths, batch-loading helpers to avoid N+1 query
patterns, and EXPLAIN ANALYZE instrumentation for catching slow queries
before they hit production.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional, TypeVar

import asyncpg

logger = logging.getLogger("forgeos.services.query_optimizer")

T = TypeVar("T")

# [Claude.DB] Query performance targets from spec, used as warning thresholds
SLOW_QUERY_WARN_MS = 200  # "API responses: < 200ms"
SEARCH_QUERY_WARN_MS = 100  # "Search: < 100ms for 10K items"


# =============================================================
# [Claude.DB] In-process TTL cache (fallback / dev use)
#
# In production this is expected to be backed by Redis (see
# `RedisQueryCache` below); the in-memory version keeps local dev and
# tests working without an external dependency.
# =============================================================

@dataclass
class _CacheEntry:
    value: Any
    expires_at: float


class InMemoryQueryCache:
    """[Claude.DB] Simple process-local TTL cache, safe for single-instance
    dev/test use. Not shared across app instances - use RedisQueryCache in
    production."""

    def __init__(self, max_entries: int = 5000) -> None:
        self._store: dict[str, _CacheEntry] = {}
        self._max_entries = max_entries

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.expires_at < time.monotonic():
            self._store.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: Any, ttl_s: float) -> None:
        if len(self._store) >= self._max_entries:
            # [Claude.DB] Cheap eviction: drop the oldest 10% rather than
            # tracking full LRU order, adequate for a fallback cache.
            oldest = sorted(self._store.items(), key=lambda kv: kv[1].expires_at)
            for k, _ in oldest[: max(1, self._max_entries // 10)]:
                self._store.pop(k, None)
        self._store[key] = _CacheEntry(value=value, expires_at=time.monotonic() + ttl_s)

    def invalidate_prefix(self, prefix: str) -> None:
        for k in [k for k in self._store if k.startswith(prefix)]:
            self._store.pop(k, None)


class RedisQueryCache:
    """
    [Claude.DB] Thin wrapper around a redis.asyncio client for the shared
    query-result cache called out in the spec ("Query result caching
    (Redis layer)"). Kept intentionally small - callers own serialization
    of anything beyond plain JSON-able dicts/lists.
    """

    def __init__(self, redis_client: Any) -> None:
        self._redis = redis_client

    async def get(self, key: str) -> Any | None:
        raw = await self._redis.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            logger.warning("Failed to deserialize cache value for key=%s", key)
            return None

    async def set(self, key: str, value: Any, ttl_s: float) -> None:
        await self._redis.set(key, json.dumps(value, default=str), ex=int(ttl_s))

    async def invalidate_prefix(self, prefix: str) -> None:
        # [Claude.DB] SCAN rather than KEYS to avoid blocking Redis on large keyspaces.
        cursor = 0
        while True:
            cursor, keys = await self._redis.scan(cursor=cursor, match=f"{prefix}*", count=200)
            if keys:
                await self._redis.delete(*keys)
            if cursor == 0:
                break


def cache_key(*parts: Any) -> str:
    """[Claude.DB] Stable cache key from arbitrary parts (uuids, strings, ints)."""
    joined = ":".join(str(p) for p in parts)
    digest = hashlib.sha256(joined.encode()).hexdigest()[:16]
    return f"{parts[0]}:{digest}"


async def cached(
    cache: InMemoryQueryCache | RedisQueryCache,
    key: str,
    ttl_s: float,
    loader: Callable[[], Awaitable[T]],
) -> T:
    """
    [Claude.DB] Read-through cache helper: return the cached value if
    present, otherwise call `loader()`, cache the result, and return it.
    """
    hit = cache.get(key) if isinstance(cache, InMemoryQueryCache) else await cache.get(key)
    if hit is not None:
        return hit

    value = await loader()

    if isinstance(cache, InMemoryQueryCache):
        cache.set(key, value, ttl_s)
    else:
        await cache.set(key, value, ttl_s)

    return value


# =============================================================
# [Claude.DB] Batch loading (N+1 avoidance)
# =============================================================

async def batch_load_by_ids(
    conn: asyncpg.Connection,
    table: str,
    ids: list[uuid.UUID],
    *,
    id_column: str = "id",
    columns: str = "*",
) -> dict[uuid.UUID, dict[str, Any]]:
    """
    [Claude.DB] Fetch many rows by primary key in a single round trip using
    `= ANY($1)`, returned as an id -> row dict for O(1) lookup by callers
    resolving relations (e.g. loading authors for a page of comments).

    `table` and `columns` are never taken from user input - callers must
    pass literal, developer-controlled strings only.
    """
    if not ids:
        return {}
    sql = f"SELECT {columns} FROM {table} WHERE {id_column} = ANY($1::uuid[])"  # noqa: S608
    rows = await conn.fetch(sql, ids)
    return {row[id_column]: dict(row) for row in rows}


async def batch_load_grouped_by_fk(
    conn: asyncpg.Connection,
    table: str,
    fk_column: str,
    parent_ids: list[uuid.UUID],
    *,
    columns: str = "*",
    order_by: str | None = None,
) -> dict[uuid.UUID, list[dict[str, Any]]]:
    """
    [Claude.DB] Fetch all child rows for a batch of parent ids in one query
    (e.g. all keyframes for a page of animations), grouped by parent id.
    `table`, `fk_column`, `columns`, `order_by` must be developer-controlled
    literals, never raw user input.
    """
    if not parent_ids:
        return {}
    order_clause = f"ORDER BY {order_by}" if order_by else ""
    sql = f"SELECT {columns} FROM {table} WHERE {fk_column} = ANY($1::uuid[]) {order_clause}"  # noqa: S608
    rows = await conn.fetch(sql, parent_ids)

    grouped: dict[uuid.UUID, list[dict[str, Any]]] = {pid: [] for pid in parent_ids}
    for row in rows:
        grouped.setdefault(row[fk_column], []).append(dict(row))
    return grouped


# =============================================================
# [Claude.DB] Slow query instrumentation
# =============================================================

async def timed_fetch(
    conn: asyncpg.Connection,
    label: str,
    sql: str,
    *args: Any,
    warn_threshold_ms: float = SLOW_QUERY_WARN_MS,
) -> list[asyncpg.Record]:
    """
    [Claude.DB] Wrapper around conn.fetch() that logs a warning (with an
    EXPLAIN ANALYZE plan) if the query exceeds `warn_threshold_ms`, so slow
    queries surface in logs/observability rather than silently degrading
    the 200ms API SLA.
    """
    start = time.perf_counter()
    rows = await conn.fetch(sql, *args)
    elapsed_ms = (time.perf_counter() - start) * 1000

    if elapsed_ms > warn_threshold_ms:
        logger.warning("Slow query '%s' took %.1fms (threshold %.0fms)", label, elapsed_ms, warn_threshold_ms)
        try:
            plan_rows = await conn.fetch(f"EXPLAIN ANALYZE {sql}", *args)  # noqa: S608
            plan_text = "\n".join(r[0] for r in plan_rows)
            logger.warning("Query plan for '%s':\n%s", label, plan_text)
        except Exception:  # noqa: BLE001
            logger.debug("Could not EXPLAIN ANALYZE query '%s'", label)

    return rows


async def refresh_materialized_view(
    conn: asyncpg.Connection, view_name: str, *, concurrently: bool = True
) -> None:
    """
    [Claude.DB] Refresh a materialized view used for frequently-joined
    aggregate data (per spec's "Materialized views for frequently joined
    data"). CONCURRENTLY avoids locking out readers, but requires a unique
    index on the view.
    """
    mode = "CONCURRENTLY " if concurrently else ""
    await conn.execute(f"REFRESH MATERIALIZED VIEW {mode}{view_name}")  # noqa: S608
