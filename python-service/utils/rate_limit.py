"""
[Claude.A11] Rate limiting — sliding window, Redis-backed (Upstash)
File: python-service/middleware/rate_limit.py

Implements three tiers described in the needs doc:
  - Per-user:     1000 req/min
  - Per-endpoint: configurable (e.g. 100 req/min for exports)
  - Per-IP:       5000 req/min

Uses a sliding-window-log algorithm via Redis sorted sets, which is more
accurate than fixed windows (no burst-at-boundary problem) while staying
O(log N) per request.
"""

from __future__ import annotations

import time
import logging
from functools import wraps
from typing import Callable, Optional

from fastapi import HTTPException, Request
import redis.asyncio as redis

logger = logging.getLogger("forgeos.rate_limit")

_redis: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        import os

        redis_url = os.environ.get("REDIS_URL")
        if not redis_url:
            raise RuntimeError("REDIS_URL is not configured")
        _redis = redis.from_url(redis_url, decode_responses=True)
    return _redis


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=429,
            detail="Rate limit exceeded. Please slow down.",
            headers={"Retry-After": str(retry_after)},
        )


async def _sliding_window_check(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """
    Returns (allowed, retry_after_seconds).
    Uses a Redis sorted set keyed by `key`, scored by request timestamp.
    """
    r = get_redis()
    now = time.time()
    window_start = now - window_seconds

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)  # drop entries outside window
    pipe.zcard(key)  # count remaining entries
    pipe.zadd(key, {f"{now}:{id(pipe)}": now})  # tentatively record this request
    pipe.expire(key, window_seconds)
    results = await pipe.execute()

    count_before_this_request = results[1]

    if count_before_this_request >= limit:
        # Roll back the tentative add — this request doesn't count.
        await r.zrem(key, f"{now}:{id(pipe)}")
        oldest = await r.zrange(key, 0, 0, withscores=True)
        retry_after = int(window_seconds - (now - oldest[0][1])) if oldest else window_seconds
        return False, max(retry_after, 1)

    return True, 0


async def check_rate_limit(scope: str, identifier: str, limit: int, window_seconds: int = 60) -> None:
    """Raises RateLimitExceeded if the identifier has exceeded `limit` within window_seconds."""
    key = f"ratelimit:{scope}:{identifier}"
    allowed, retry_after = await _sliding_window_check(key, limit, window_seconds)
    if not allowed:
        logger.warning("Rate limit exceeded scope=%s identifier=%s", scope, identifier)
        raise RateLimitExceeded(retry_after)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(max_requests: int = 100, window: int = 60, scope: Optional[str] = None):
    """
    Decorator for FastAPI route handlers.

    Applies per-endpoint limiting by default. If the handler also has an
    authenticated `current_user`, per-user limiting is layered on top
    automatically using the global 1000 req/min budget from the spec.

    Usage:
        @app.post("/api/export")
        @rate_limit(max_requests=100, window=60)
        async def export_video(request: Request, current_user: CurrentUser = Depends(require_auth)):
            ...
    """

    def decorator(func: Callable):
        endpoint_scope = scope or func.__name__

        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Optional[Request] = kwargs.get("request")
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request is not None:
                ip = _client_ip(request)
                await check_rate_limit("ip", ip, limit=5000, window_seconds=60)
                await check_rate_limit(f"endpoint:{endpoint_scope}", ip, limit=max_requests, window_seconds=window)

            current_user = kwargs.get("current_user")
            if current_user is not None:
                await check_rate_limit("user", current_user.id, limit=1000, window_seconds=60)

            return await func(*args, **kwargs)

        return wrapper

    return decorator
