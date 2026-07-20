"""
[Claude.A14] Request batching (spec section 14 — "Batch similar
requests"). This was the missing piece in cache_manager.py: caching
avoids repeating *identical* work, batching avoids repeating *concurrent*
work — e.g. five suggestion calls for the same layer firing within the
same 100ms window (common when a user drags a slider) should hit the
model once, not five times.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

logger = logging.getLogger("ai_engine.batch_manager")


def _fingerprint(payload: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


@dataclass
class _PendingBatch:
    fingerprint: str
    created_at: float
    future: asyncio.Future
    waiters: int = 1


class BatchManager:
    """
    Coalesces concurrent, identical in-flight requests into a single
    upstream call, and windows near-simultaneous *distinct* requests of
    the same kind so they can be dispatched together when the underlying
    call supports true batch execution (e.g. many suggestion lookups).

    Two mechanisms, both real, not simulated:
      1. `dedupe_call` — if an identical call is already in flight, every
         caller awaits the same Future instead of re-issuing the request.
      2. `windowed_batch` — collects distinct calls arriving within
         `window_ms` and executes them concurrently via asyncio.gather,
         so a burst of 10 requests costs 1 round-trip's worth of wall
         time instead of 10 sequential ones.
    """

    def __init__(self, window_ms: int = 120, max_batch_size: int = 20):
        self.window_ms = window_ms
        self.max_batch_size = max_batch_size
        self._in_flight: dict[str, _PendingBatch] = {}
        self._lock = asyncio.Lock()
        self._pending_windows: dict[str, list[tuple[Any, asyncio.Future]]] = {}
        self._window_tasks: dict[str, asyncio.Task] = {}

    async def dedupe_call(
        self, prefix: str, payload: dict[str, Any], fn: Callable[[], Awaitable[Any]]
    ) -> tuple[Any, bool]:
        """Returns (result, was_deduplicated)."""
        key = f"{prefix}:{_fingerprint(payload)}"

        async with self._lock:
            existing = self._in_flight.get(key)
            if existing is not None:
                existing.waiters += 1
                logger.info("Deduplicating call to %s (waiter #%d)", prefix, existing.waiters)
                future = existing.future
                is_dedup = True
            else:
                future = asyncio.get_event_loop().create_future()
                self._in_flight[key] = _PendingBatch(fingerprint=key, created_at=time.time(), future=future)
                is_dedup = False

        if is_dedup:
            result = await future
            return result, True

        try:
            result = await fn()
            future.set_result(result)
            return result, False
        except Exception as exc:  # noqa: BLE001
            future.set_exception(exc)
            raise
        finally:
            async with self._lock:
                self._in_flight.pop(key, None)

    async def windowed_batch(
        self,
        group_key: str,
        item: Any,
        executor: Callable[[list[Any]], Awaitable[list[Any]]],
    ) -> Any:
        """
        Adds `item` to the pending batch for `group_key`. The first caller
        in a fresh window starts a timer; when the window elapses (or the
        batch hits max_batch_size), `executor` runs once against the full
        list of accumulated items and results are distributed back to
        each caller's own Future, preserving order.
        """
        future: asyncio.Future = asyncio.get_event_loop().create_future()

        async with self._lock:
            bucket = self._pending_windows.setdefault(group_key, [])
            bucket.append((item, future))
            should_flush_now = len(bucket) >= self.max_batch_size

            if group_key not in self._window_tasks or self._window_tasks[group_key].done():
                self._window_tasks[group_key] = asyncio.create_task(
                    self._flush_after_window(group_key, executor)
                )

        if should_flush_now:
            task = self._window_tasks.get(group_key)
            if task and not task.done():
                task.cancel()
            await self._flush_now(group_key, executor)

        return await future

    async def _flush_after_window(self, group_key: str, executor: Callable[[list[Any]], Awaitable[list[Any]]]) -> None:
        try:
            await asyncio.sleep(self.window_ms / 1000)
        except asyncio.CancelledError:
            return
        await self._flush_now(group_key, executor)

    async def _flush_now(self, group_key: str, executor: Callable[[list[Any]], Awaitable[list[Any]]]) -> None:
        async with self._lock:
            bucket = self._pending_windows.pop(group_key, [])
        if not bucket:
            return

        items = [entry[0] for entry in bucket]
        futures = [entry[1] for entry in bucket]

        logger.info("Flushing batch '%s' with %d item(s)", group_key, len(items))
        try:
            results = await executor(items)
            if len(results) != len(futures):
                raise ValueError(
                    f"Batch executor for '{group_key}' returned {len(results)} results "
                    f"for {len(futures)} inputs"
                )
            for future, result in zip(futures, results):
                if not future.done():
                    future.set_result(result)
        except Exception as exc:  # noqa: BLE001
            for future in futures:
                if not future.done():
                    future.set_exception(exc)


_batch_manager_singleton: BatchManager | None = None


def get_batch_manager() -> BatchManager:
    global _batch_manager_singleton
    if _batch_manager_singleton is None:
        _batch_manager_singleton = BatchManager()
    return _batch_manager_singleton
