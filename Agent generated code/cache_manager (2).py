"""
[Claude.A14] Caching & Performance (spec section 14).

Provides:
  - Result caching (Redis-backed if REDIS_URL is set, else in-process TTL cache)
  - A decorator for one-line caching of async service functions
  - A simple in-memory task queue with progress tracking and cancellation,
    used to satisfy "Progress streaming (SSE)" and "Cancellation support"
    for long-running generation endpoints.
"""
from __future__ import annotations

import asyncio
import functools
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from config import Settings, get_settings

logger = logging.getLogger("ai_engine.cache_manager")


def _make_cache_key(prefix: str, payload: dict[str, Any]) -> str:
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
    return f"ai:{prefix}:{digest}"


class _InMemoryCache:
    """Fallback cache used when Redis isn't configured (e.g. local dev)."""

    def __init__(self):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        async with self._lock:
            self._store[key] = (time.time() + ttl_seconds, value)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)


class CacheManager:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._redis = None
        self._memory = _InMemoryCache()

    async def _get_redis(self):
        if self._redis is None and self.settings.redis_url:
            import redis.asyncio as redis

            self._redis = redis.from_url(self.settings.redis_url, decode_responses=True)
        return self._redis

    async def get(self, prefix: str, payload: dict[str, Any]) -> Any | None:
        key = _make_cache_key(prefix, payload)
        redis_client = await self._get_redis()
        if redis_client:
            raw = await redis_client.get(key)
            return json.loads(raw) if raw else None
        return await self._memory.get(key)

    async def set(self, prefix: str, payload: dict[str, Any], value: Any, ttl_seconds: int | None = None) -> None:
        ttl = ttl_seconds or self.settings.cache_ttl_seconds
        key = _make_cache_key(prefix, payload)
        redis_client = await self._get_redis()
        if redis_client:
            await redis_client.set(key, json.dumps(value, default=str), ex=ttl)
        else:
            await self._memory.set(key, value, ttl)

    async def invalidate(self, prefix: str, payload: dict[str, Any]) -> None:
        key = _make_cache_key(prefix, payload)
        redis_client = await self._get_redis()
        if redis_client:
            await redis_client.delete(key)
        else:
            await self._memory.delete(key)


_cache_manager_singleton: CacheManager | None = None


def get_cache_manager() -> CacheManager:
    global _cache_manager_singleton
    if _cache_manager_singleton is None:
        _cache_manager_singleton = CacheManager()
    return _cache_manager_singleton


def cached(prefix: str, ttl_seconds: int | None = None):
    """
    Decorator for async functions whose args are JSON-serializable.
    Usage:
        @cached("design_generate")
        async def generate(self, request: GenerateDesignRequest): ...
    """

    def decorator(fn: Callable[..., Awaitable[Any]]):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            cache = get_cache_manager()
            cache_payload = {
                "args": [_serialize(a) for a in args[1:]],  # skip `self`
                "kwargs": {k: _serialize(v) for k, v in kwargs.items()},
            }
            hit = await cache.get(prefix, cache_payload)
            if hit is not None:
                logger.info("cache hit for %s", prefix)
                return hit, True
            result = await fn(*args, **kwargs)
            await cache.set(prefix, cache_payload, _serialize(result), ttl_seconds)
            return result, False

        return wrapper

    return decorator


def _serialize(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj


# --------------------------------------------------------------------------- #
# Task queue: progress streaming + cancellation for long-running generations
# --------------------------------------------------------------------------- #
@dataclass
class TaskState:
    task_id: str
    status: str = "queued"  # queued | running | done | error | cancelled
    progress: float = 0.0
    message: str = ""
    result: Any = None
    error: str | None = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)


class TaskQueue:
    """
    Minimal in-process task tracker. In a multi-worker deployment this
    should be backed by Redis pub/sub instead of an in-memory dict, but the
    interface (create/update/subscribe/cancel) stays the same.
    """

    def __init__(self, max_concurrent: int = 8):
        self._tasks: dict[str, TaskState] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)

    def create(self, task_id: str) -> TaskState:
        state = TaskState(task_id=task_id)
        self._tasks[task_id] = state
        return state

    def get(self, task_id: str) -> TaskState | None:
        return self._tasks.get(task_id)

    def update(self, task_id: str, **kwargs) -> None:
        state = self._tasks.get(task_id)
        if state:
            for k, v in kwargs.items():
                setattr(state, k, v)

    def cancel(self, task_id: str) -> bool:
        state = self._tasks.get(task_id)
        if not state or state.status in {"done", "error", "cancelled"}:
            return False
        state.cancel_event.set()
        state.status = "cancelled"
        return True

    async def stream_progress(self, task_id: str):
        """Async generator yielding SSE-ready progress dicts until terminal state."""
        state = self._tasks.get(task_id)
        if not state:
            yield {"event": "error", "data": {"error": "unknown task_id"}}
            return

        last_progress = -1.0
        while state.status not in {"done", "error", "cancelled"}:
            if state.progress != last_progress:
                yield {"event": "progress", "data": {
                    "taskId": task_id, "status": state.status,
                    "progress": state.progress, "message": state.message,
                }}
                last_progress = state.progress
            await asyncio.sleep(0.25)

        yield {"event": state.status, "data": {
            "taskId": task_id, "status": state.status,
            "progress": state.progress, "result": _serialize(state.result),
            "error": state.error,
        }}


_task_queue_singleton: TaskQueue | None = None


def get_task_queue() -> TaskQueue:
    global _task_queue_singleton
    if _task_queue_singleton is None:
        _task_queue_singleton = TaskQueue()
    return _task_queue_singleton
