"""
[Claude.DB] Low-level connection & transaction utilities shared across the
db and services packages: acquiring pooled connections, transaction context
managers (incl. nested savepoints), retry-with-backoff for transient errors,
and small serialization helpers.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import random
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Callable, TypeVar

import asyncpg

from db import get_pool

logger = logging.getLogger("forgeos.db.utils")

T = TypeVar("T")

# [Claude.DB] Errors worth retrying: serialization failures / deadlocks from
# concurrent transactions, and transient connection drops. Constraint
# violations, syntax errors, etc. are NOT retried.
RETRYABLE_ERRORS = (
    asyncpg.SerializationError,
    asyncpg.DeadlockDetectedError,
    asyncpg.TooManyConnectionsError,
    asyncpg.ConnectionDoesNotExistError,
    asyncpg.InterfaceError,
)

# [Claude.DB] Constraint from spec: "Transaction timeout: 2 minutes"
DEFAULT_TRANSACTION_TIMEOUT_S = 120


@asynccontextmanager
async def acquire_connection() -> AsyncIterator[asyncpg.Connection]:
    """[Claude.DB] Acquire a single connection from the global pool."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def transaction(
    conn: asyncpg.Connection | None = None,
    *,
    isolation: str = "read_committed",
    readonly: bool = False,
    deferrable: bool = False,
) -> AsyncIterator[asyncpg.Connection]:
    """
    [Claude.DB] Transaction context manager.

    If `conn` is provided, opens a SAVEPOINT-backed nested transaction on it
    (safe to call from code that doesn't know if it's already inside a
    transaction). Otherwise acquires a fresh connection from the pool for
    the duration of the transaction.

    Example:
        async with transaction() as conn:
            await conn.execute("UPDATE projects SET ... WHERE id = $1", pid)
    """
    if conn is not None:
        async with conn.transaction(isolation=isolation, readonly=readonly, deferrable=deferrable):
            yield conn
        return

    pool = get_pool()
    async with pool.acquire() as fresh_conn:
        async with fresh_conn.transaction(
            isolation=isolation, readonly=readonly, deferrable=deferrable
        ):
            yield fresh_conn


def with_retry(
    max_attempts: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
    retryable: tuple[type[Exception], ...] = RETRYABLE_ERRORS,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    [Claude.DB] Decorator: retry an async DB operation on transient failures
    with exponential backoff + jitter. Use around single logical writes that
    are safe to re-run (e.g. wrapped in their own transaction).

        @with_retry(max_attempts=5)
        async def bump_view_count(project_id):
            ...
    """

    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except retryable as exc:  # noqa: PERF203
                    last_exc = exc
                    if attempt == max_attempts:
                        break
                    delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
                    delay += random.uniform(0, delay * 0.25)
                    logger.warning(
                        "Retryable DB error in %s (attempt %d/%d): %s. Retrying in %.2fs",
                        fn.__name__, attempt, max_attempts, exc, delay,
                    )
                    await asyncio.sleep(delay)
            assert last_exc is not None
            raise last_exc

        return wrapper

    return decorator


async def run_with_statement_timeout(
    conn: asyncpg.Connection, timeout_ms: int, coro_fn: Callable[[], Any]
) -> Any:
    """
    [Claude.DB] Run `coro_fn()` with a Postgres-side statement_timeout applied
    for the duration, then reset it. Enforces the "Query timeout: 30 seconds"
    constraint at the database level rather than only client-side.
    """
    await conn.execute(f"SET LOCAL statement_timeout = {int(timeout_ms)}")
    return await coro_fn()


def new_uuid() -> uuid.UUID:
    """[Claude.DB] Client-side UUID generation for cases that need the id
    before the INSERT round-trip (e.g. building a batch of related rows)."""
    return uuid.uuid4()


def chunked(items: list[T], size: int) -> list[list[T]]:
    """[Claude.DB] Split a list into chunks; used for batched INSERT/COPY."""
    if size <= 0:
        raise ValueError("chunk size must be positive")
    return [items[i : i + size] for i in range(0, len(items), size)]


async def fetch_one_or_none(
    conn: asyncpg.Connection, query: str, *args: Any
) -> asyncpg.Record | None:
    """[Claude.DB] Convenience wrapper: fetchrow that returns None cleanly."""
    return await conn.fetchrow(query, *args)


def record_to_dict(record: asyncpg.Record | None) -> dict[str, Any] | None:
    """[Claude.DB] Convert an asyncpg.Record to a plain dict (or None)."""
    return dict(record) if record is not None else None


def records_to_dicts(records: list[asyncpg.Record]) -> list[dict[str, Any]]:
    """[Claude.DB] Convert a list of asyncpg.Record to plain dicts."""
    return [dict(r) for r in records]


class AdvisoryLock:
    """
    [Claude.DB] Postgres session-level advisory lock helper, used to
    serialize operations that must not race across app instances (e.g.
    assigning the next `operation_index` for a project when not using
    BIGSERIAL, or coordinating a version snapshot).

    Usage:
        async with AdvisoryLock(conn, lock_key_for_project(project_id)):
            ...critical section...
    """

    def __init__(self, conn: asyncpg.Connection, key: int):
        self._conn = conn
        self._key = key

    async def __aenter__(self) -> "AdvisoryLock":
        await self._conn.execute("SELECT pg_advisory_xact_lock($1)", self._key)
        return self

    async def __aexit__(self, *exc_info: Any) -> None:
        # xact-scoped advisory locks release automatically at COMMIT/ROLLBACK.
        return None


def lock_key_for_project(project_id: uuid.UUID) -> int:
    """[Claude.DB] Derive a stable 64-bit advisory lock key from a project UUID."""
    return int.from_bytes(project_id.bytes[:8], byteorder="big", signed=True)
