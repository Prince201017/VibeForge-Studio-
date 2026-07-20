"""
[Claude.A14] Postgres connection pool management.

Lazily creates a single asyncpg pool per process, shared by every
repository. If `DATABASE_URL` isn't set, `get_pool()` returns None and
every caller (see repositories.py) falls back to in-memory storage —
this keeps local dev/CI working with zero setup while giving production
real persistence.
"""
from __future__ import annotations

import logging
from pathlib import Path

from config import get_settings

logger = logging.getLogger("ai_engine.db")

_pool = None
_schema_applied = False


async def get_pool():
    global _pool
    settings = get_settings()
    if not settings.database_url:
        return None

    if _pool is None:
        try:
            import asyncpg
        except ImportError as exc:
            raise RuntimeError(
                "DATABASE_URL is set but 'asyncpg' isn't installed (pip install asyncpg)"
            ) from exc

        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=10)
        logger.info("Postgres connection pool created")
        await _ensure_schema(_pool)

    return _pool


async def _ensure_schema(pool) -> None:
    """Applies db/schema.sql idempotently (every statement is CREATE ... IF NOT EXISTS)."""
    global _schema_applied
    if _schema_applied:
        return
    schema_path = Path(__file__).parent / "schema.sql"
    schema_sql = schema_path.read_text()
    async with pool.acquire() as conn:
        await conn.execute(schema_sql)
    _schema_applied = True
    logger.info("Applied ai_* schema (idempotent)")


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
