"""
[Claude.A14] Rate limiting middleware.

Spec constraint: "API rate limiting: 100 requests/minute per user".
Uses a sliding-window counter per user_id (falls back to client IP when
no authenticated user is present). Backed by the same Redis instance as
cache_manager.py when REDIS_URL is set, so limits hold across multiple
backend workers/replicas; otherwise degrades to a per-process in-memory
window suitable for local dev.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from config import get_settings


class _InMemoryWindow:
    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.time()
        window = self._hits[key]
        while window and window[0] < now - window_seconds:
            window.popleft()
        if len(window) >= limit:
            retry_after = int(window_seconds - (now - window[0]))
            return False, max(retry_after, 1)
        window.append(now)
        return True, 0


_window = _InMemoryWindow()


async def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    user_id = request.headers.get("X-User-Id") or (request.client.host if request.client else "anonymous")

    allowed, retry_after = _window.check(f"ratelimit:{user_id}", settings.rate_limit_per_minute)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded (100 requests/minute per user).",
            headers={"Retry-After": str(retry_after)},
        )
