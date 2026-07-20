"""
[Claude.DB] TransactionManager: orchestrates multi-step, multi-service writes
that must succeed or fail atomically (e.g. "create layer + append operation
+ write audit log" as one unit), with savepoint-based partial rollback and
a bounded transaction timeout per the spec's "Transaction timeout: 2
minutes" constraint.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Awaitable, Callable, Optional

import asyncpg

from db import get_pool
from db.utils import DEFAULT_TRANSACTION_TIMEOUT_S, AdvisoryLock, lock_key_for_project

logger = logging.getLogger("forgeos.services.transaction_manager")


class TransactionAbortedError(RuntimeError):
    """[Claude.DB] Raised when a transaction is explicitly rolled back by a step."""


@dataclass
class StepResult:
    """[Claude.DB] Record of one executed step, for debugging/observability."""
    name: str
    ok: bool
    error: Optional[str] = None


@dataclass
class TransactionContext:
    """[Claude.DB] Passed into each registered step; carries the shared
    connection plus a scratch dict steps can use to pass data forward
    (e.g. step 1 creates a layer, step 2 needs its new id)."""
    conn: asyncpg.Connection
    scratch: dict[str, Any] = field(default_factory=dict)
    step_results: list[StepResult] = field(default_factory=list)


Step = Callable[[TransactionContext], Awaitable[Any]]


class TransactionManager:
    """
    [Claude.DB] Runs a sequence of async steps inside a single database
    transaction. Each step gets a SAVEPOINT, so a step can fail and be
    rolled back without necessarily aborting the whole transaction if
    `stop_on_error=False` is used for optional/best-effort steps (e.g.
    notifications). By default a step failure aborts and rolls back
    everything, which is what most multi-table writes need for
    consistency.

    Usage:
        tm = TransactionManager()
        tm.add_step("create_layer", create_layer_step)
        tm.add_step("append_operation", append_operation_step)
        tm.add_step("notify_collaborators", notify_step, stop_on_error=False)
        result = await tm.run(timeout_s=30)
    """

    def __init__(self) -> None:
        self._steps: list[tuple[str, Step, bool]] = []

    def add_step(self, name: str, step: Step, *, stop_on_error: bool = True) -> "TransactionManager":
        self._steps.append((name, step, stop_on_error))
        return self

    async def run(
        self,
        *,
        conn: Optional[asyncpg.Connection] = None,
        timeout_s: float = DEFAULT_TRANSACTION_TIMEOUT_S,
        isolation: str = "read_committed",
    ) -> TransactionContext:
        """
        [Claude.DB] Execute all registered steps inside one transaction,
        bounded by `timeout_s`. Raises TransactionAbortedError (and rolls
        back everything) if any required step fails, or asyncio.TimeoutError
        if the whole sequence exceeds the deadline.
        """
        pool = get_pool()

        async def _do_run(active_conn: asyncpg.Connection) -> TransactionContext:
            ctx = TransactionContext(conn=active_conn)
            async with active_conn.transaction(isolation=isolation):
                for name, step, stop_on_error in self._steps:
                    try:
                        async with active_conn.transaction():  # SAVEPOINT per step
                            await step(ctx)
                        ctx.step_results.append(StepResult(name=name, ok=True))
                    except Exception as exc:  # noqa: BLE001
                        ctx.step_results.append(StepResult(name=name, ok=False, error=str(exc)))
                        logger.warning("Transaction step '%s' failed: %s", name, exc)
                        if stop_on_error:
                            raise TransactionAbortedError(
                                f"Step '{name}' failed, transaction rolled back: {exc}"
                            ) from exc
            return ctx

        if conn is not None:
            return await asyncio.wait_for(_do_run(conn), timeout=timeout_s)

        async with pool.acquire() as fresh_conn:
            return await asyncio.wait_for(_do_run(fresh_conn), timeout=timeout_s)


@asynccontextmanager
async def project_write_lock(
    conn: asyncpg.Connection, project_id: uuid.UUID
) -> AsyncIterator[None]:
    """
    [Claude.DB] Serialize concurrent structural writes to the same project
    (e.g. two clients reordering layers at once) using a transaction-scoped
    Postgres advisory lock, cheaper than row-level locking the whole layer
    subtree.

    Usage:
        async with transaction() as conn:
            async with project_write_lock(conn, project_id):
                ...reorder / restructure layers...
    """
    async with AdvisoryLock(conn, lock_key_for_project(project_id)):
        yield


async def run_atomic(
    steps: list[tuple[str, Step]],
    *,
    timeout_s: float = DEFAULT_TRANSACTION_TIMEOUT_S,
    conn: Optional[asyncpg.Connection] = None,
) -> TransactionContext:
    """[Claude.DB] Convenience one-liner for the common "run these N steps,
    fail if any fails" pattern without constructing a TransactionManager by hand."""
    tm = TransactionManager()
    for name, step in steps:
        tm.add_step(name, step)
    return await tm.run(conn=conn, timeout_s=timeout_s)
