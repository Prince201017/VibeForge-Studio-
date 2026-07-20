"""
[Claude.A11] Security response headers middleware
File: python-service/middleware/security_headers.py

Applies CSP, HSTS, frame/MIME protections, and referrer/permissions policy
to every response. Implemented as a plain ASGI middleware (not
BaseHTTPMiddleware) to avoid the streaming-response buffering issues that
come with the latter.
"""

from __future__ import annotations

import os
from starlette.types import ASGIApp, Receive, Scope, Send

_CSP_POLICY = (
    "default-src 'self'; "
    "script-src 'self' https://cdn.example.com; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https://*.public.blob.vercel-storage.com; "
    "media-src 'self' https://*.public.blob.vercel-storage.com; "
    "connect-src 'self' https://api.clerk.dev wss:; "
    "font-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)

_STATIC_HEADERS = [
    (b"content-security-policy", _CSP_POLICY.encode()),
    (b"x-frame-options", b"DENY"),
    (b"x-content-type-options", b"nosniff"),
    (b"x-xss-protection", b"1; mode=block"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), payment=(), geolocation=()"),
]

_HSTS_HEADER = (b"strict-transport-security", b"max-age=31536000; includeSubDomains; preload")


class SecurityHeadersMiddleware:
    """ASGI middleware that injects security headers on every HTTP response."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self.is_production = os.environ.get("ENVIRONMENT", "development") == "production"

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.extend(_STATIC_HEADERS)
                if self.is_production:
                    headers.append(_HSTS_HEADER)
            await send(message)

        await self.app(scope, receive, send_wrapper)
