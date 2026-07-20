"""
[Claude.DB] db package init.

Owns the asyncpg connection pool lifecycle for the ForgeOS Neon Postgres
database. All other modules (services, queries) pull the pool from here
rather than creating their own connections, so we get a single, bounded
set of connections per process.

Usage:
    from db import init_db, close_db, get_pool

    await init_db(dsn=os.environ["DATABASE_URL"])
    pool = get_pool()
    ...
    await close_db()
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

import asyncpg

logger = logging.getLogger("forgeos.db")

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

# [Claude.DB] Constraints from spec: max 10 concurrent connections per user,
# so the *pool* itself is sized well under Neon's connection ceiling and
# relies on pgbouncer-style pooling upstream in production.
DEFAULT_MIN_POOL_SIZE = 10
DEFAULT_MAX_POOL_SIZE = 50
DEFAULT_POOL_TIMEOUT_S = 10
DEFAULT_POOL_RECYCLE_S = 300
DEFAULT_COMMAND_TIMEOUT_S = 30  # matches "Query timeout: 30 seconds" constraint


class DatabaseNotInitializedError(RuntimeError):
    """Raised when get_pool() is called before init_db()."""


_pool: Optional[asyncpg.Pool] = None
_init_lock = asyncio.Lock()


async def init_db(
    dsn: Optional[str] = None,
    *,
    min_size: int = DEFAULT_MIN_POOL_SIZE,
    max_size: int = DEFAULT_MAX_POOL_SIZE,
    timeout: float = DEFAULT_POOL_TIMEOUT_S,
    max_inactive_connection_lifetime: float = DEFAULT_POOL_RECYCLE_S,
    command_timeout: float = DEFAULT_COMMAND_TIMEOUT_S,
    run_migrations: bool = False,
) -> asyncpg.Pool:
    """
    [Claude.DB] Initialize (or return the existing) global connection pool.

    Idempotent + concurrency-safe: concurrent callers awaiting init_db()
    during startup will not create duplicate pools.
    """
    global _pool

    if _pool is not None:
        return _pool

    async with _init_lock:
        if _pool is not None:  # re-check inside the lock
            return _pool

        resolved_dsn = dsn or os.environ.get("DATABASE_URL")
        if not resolved_dsn:
            raise ValueError(
                "No DSN provided and DATABASE_URL is not set in the environment."
            )

        logger.info(
            "Initializing DB pool (min=%s max=%s timeout=%s recycle=%s)",
            min_size, max_size, timeout, max_inactive_connection_lifetime,
        )

        pool = await asyncpg.create_pool(
            dsn=resolved_dsn,
            min_size=min_size,
            max_size=max_size,
            timeout=timeout,
            max_inactive_connection_lifetime=max_inactive_connection_lifetime,
            command_timeout=command_timeout,
            init=_register_codecs,
        )

        _pool = pool

        if run_migrations:
            await apply_migrations(pool)

        return pool


async def _register_codecs(conn: asyncpg.Connection) -> None:
    """[Claude.DB] Per-connection setup: JSON codec so JSONB round-trips as dict/list."""
    import json

    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )


def get_pool() -> asyncpg.Pool:
    """[Claude.DB] Return the global pool. Raises if init_db() hasn't run yet."""
    if _pool is None:
        raise DatabaseNotInitializedError(
            "Database pool not initialized. Call `await init_db(...)` at startup."
        )
    return _pool


async def close_db() -> None:
    """[Claude.DB] Gracefully drain and close the global pool."""
    global _pool
    if _pool is not None:
        logger.info("Closing DB pool")
        await _pool.close()
        _pool = None


async def health_check() -> bool:
    """[Claude.DB] Lightweight liveness probe for orchestration / load balancers."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            return result == 1
    except Exception:  # noqa: BLE001 - health checks should never raise
        logger.exception("DB health check failed")
        return False


def _migration_files() -> list[Path]:
    """[Claude.DB] Migration files in numeric order (001_, 002_, ...)."""
    return sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda p: p.name)


async def apply_migrations(pool: asyncpg.Pool) -> list[str]:
    """
    [Claude.DB] Apply pending .sql migrations in filename order.

    Tracks applied migrations in a `schema_migrations` bookkeeping table so
    this is safe to call on every service startup.
    """
    applied: list[str] = []

    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        )

        already_applied = {
            row["filename"]
            for row in await conn.fetch("SELECT filename FROM schema_migrations")
        }

        for path in _migration_files():
            if path.name in already_applied:
                continue

            sql = path.read_text()
            logger.info("Applying migration %s", path.name)

            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO schema_migrations (filename) VALUES ($1)",
                    path.name,
                )

            applied.append(path.name)

    if applied:
        logger.info("Applied %d migration(s): %s", len(applied), ", ".join(applied))
    else:
        logger.info("No pending migrations")

    return applied


__all__ = [
    "init_db",
    "close_db",
    "get_pool",
    "health_check",
    "apply_migrations",
    "DatabaseNotInitializedError",
]
