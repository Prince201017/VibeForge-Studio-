"""
[Claude.A11] Safe error handling
File: python-service/middleware/error_handler.py

Ensures internal exceptions never leak stack traces, SQL fragments, or
file paths to the client. Full detail still goes to structured logs for
debugging; the client only ever sees a generic message + error code.
"""

from __future__ import annotations

import logging
import traceback
import uuid

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("forgeos.errors")

# Messages considered safe to show verbatim (raised deliberately by our own code).
_SAFE_EXPOSURE_STATUS_CODES = {400, 401, 403, 404, 409, 422, 429}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # These are exceptions we raised ourselves (require_auth, validation, etc.)
        # so the detail message is already safe to expose.
        if exc.status_code in _SAFE_EXPOSURE_STATUS_CODES:
            return JSONResponse(
                status_code=exc.status_code,
                content={"error": exc.detail, "status": exc.status_code},
                headers=getattr(exc, "headers", None) or {},
            )

        error_id = str(uuid.uuid4())
        logger.error("HTTP %s error_id=%s detail=%s", exc.status_code, error_id, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "Something went wrong", "error_id": error_id},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        error_id = str(uuid.uuid4())
        logger.error(
            "Unhandled exception error_id=%s path=%s\n%s",
            error_id,
            request.url.path,
            "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Something went wrong. If this persists, contact support.", "error_id": error_id},
        )


def safe_error(message: str, status_code: int = 400) -> HTTPException:
    """Helper for route handlers to raise a client-safe error explicitly."""
    return HTTPException(status_code=status_code, detail=message)
