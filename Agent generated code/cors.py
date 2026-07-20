"""
[Claude.A11] Strict CORS configuration
File: python-service/middleware/cors.py

Centralizes the allow-list so origins are configured once, from environment,
rather than scattered across route decorators.
"""

from __future__ import annotations

import os
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware


def _parse_origins(raw: str) -> list[str]:
    return [o.strip() for o in raw.split(",") if o.strip()]


def configure_cors(app: FastAPI) -> None:
    """
    Reads ALLOWED_ORIGINS from the environment (comma separated). Falls back
    to localhost dev origins only when ENVIRONMENT != "production", so a
    misconfigured prod deploy fails closed instead of opening to '*'.
    """
    env = os.environ.get("ENVIRONMENT", "development")
    raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
    origins = _parse_origins(raw_origins)

    if not origins:
        if env == "production":
            raise RuntimeError(
                "ALLOWED_ORIGINS must be set in production — refusing to start with an open CORS policy."
            )
        origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"],
        expose_headers=["Retry-After"],
        max_age=600,
    )
