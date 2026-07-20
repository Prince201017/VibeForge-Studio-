"""
[Claude.A11] App wiring — shows how every security piece plugs together.
File: python-service/main.py

This is the integration point other agents' FastAPI apps should mirror.
Order matters: security headers and CORS should wrap everything; error
handling needs to be registered before routes so it catches route-level
exceptions.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends

from .auth import CurrentUser
from .middleware.auth_middleware import require_auth, require_role
from .middleware.cors import configure_cors
from .middleware.security_headers import SecurityHeadersMiddleware
from .middleware.error_handler import register_error_handlers
from .middleware.rate_limit import rate_limit
from .security import rbac, audit_logger
from .security.validation import validate_input, ProjectCreateSchema

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forgeos.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Wire real DB connection here (asyncpg pool, SQLAlchemy engine, etc.)
    # db = await create_db_pool()
    # rbac.bind_database(db)
    # audit_logger.bind_database(db)
    await audit_logger.start_audit_worker()
    logger.info("ForgeOS security service starting up")
    yield
    await audit_logger.stop_audit_worker()
    logger.info("ForgeOS security service shutting down")


app = FastAPI(title="ForgeOS Security Service", lifespan=lifespan)

# Order: security headers wraps everything, then CORS, then routes.
app.add_middleware(SecurityHeadersMiddleware)
configure_cors(app)
register_error_handlers(app)


@app.get("/health")
async def health():
    """Unauthenticated health check — no sensitive data, safe to expose."""
    return {"status": "ok"}


@app.post("/api/projects")
@rate_limit(max_requests=100, window=60)
@validate_input(ProjectCreateSchema)
async def create_project(
    request: Request,
    validated: ProjectCreateSchema,
    current_user: CurrentUser = Depends(require_auth),
):
    """Example endpoint demonstrating the full stack: auth -> rate limit -> validation -> audit."""
    # project = await db.projects.create(owner_id=current_user.id, name=validated.name, ...)
    await audit_logger.log_action(
        action="project.created",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", ""),
        project_name=validated.name,
    )
    return {"status": "created", "name": validated.name}


@app.get("/api/projects/{project_id}")
async def get_project(
    project_id: str,
    current_user: CurrentUser = Depends(require_role("viewer")),
):
    """require_role handles both auth and permission checking for this route."""
    # project = await db.projects.get(project_id)
    return {"project_id": project_id, "requested_by": current_user.id}


@app.delete("/api/projects/{project_id}")
async def delete_project(
    request: Request,
    project_id: str,
    current_user: CurrentUser = Depends(require_role("owner")),
):
    # await db.projects.delete(project_id)
    await audit_logger.log_action(
        action="project.deleted",
        user_id=current_user.id,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", ""),
        project_id=project_id,
    )
    return {"status": "deleted"}
