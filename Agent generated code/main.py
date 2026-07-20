"""[CollabAgent] main.py — FastAPI application entrypoint. Wires all
collaboration services as module-level singletons (swap for a proper DI
container / lifespan context in production) and mounts the route modules."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from services.comment_manager import CommentManager
from services.notification_service import NotificationService
from services.permission_manager import PermissionManager
from services.presence_manager import PresenceManager
from services.sync_engine import SyncEngine
from services.version_manager import VersionManager
from websocket.connection_pool import ConnectionPool
from websocket.handler import CollaborationHandler

# -- singletons, imported by route modules via `from main import ...` ---------

connection_pool = ConnectionPool()
sync_engine = SyncEngine()
presence_manager = PresenceManager()
permission_manager = PermissionManager()
comment_manager = CommentManager()
version_manager = VersionManager()
notification_service = NotificationService()

collaboration_handler = CollaborationHandler(
    pool=connection_pool,
    sync_engine=sync_engine,
    presence=presence_manager,
    permissions=permission_manager,
    comments=comment_manager,
    versions=version_manager,
    notifications=notification_service,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    heartbeat_task = asyncio.create_task(connection_pool.run_heartbeat_loop())
    yield
    heartbeat_task.cancel()


app = FastAPI(title="Collaboration Service", lifespan=lifespan)

from routes import collab, permissions, versions  # noqa: E402  (avoid circular import at module load)

app.include_router(collab.router)
app.include_router(permissions.router)
app.include_router(versions.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
