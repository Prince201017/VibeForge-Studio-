"""[CollabAgent] collab.py — FastAPI routes: the /ws/projects/{id} endpoint
plus REST endpoints for comments and history, per API_CONTRACT.md."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from models.collaboration import WSMessage
from websocket.handler import CollaborationHandler

router = APIRouter()


# -- dependency wiring (replace with your app's DI container) -----------------

def get_handler() -> CollaborationHandler:
    from main import collaboration_handler  # app-level singleton
    return collaboration_handler


def get_current_user_id(token: str) -> UUID:
    """Placeholder auth resolution — swap for real session/JWT validation."""
    from services.auth import resolve_user_from_token  # provided by security module
    return resolve_user_from_token(token)


# -- websocket ------------------------------------------------------------------

@router.websocket("/ws/projects/{project_id}")
async def project_socket(websocket: WebSocket, project_id: UUID, token: str, display_name: str = ""):
    await websocket.accept()
    handler = get_handler()
    try:
        user_id = get_current_user_id(token)
    except Exception:
        await websocket.close(code=4401)
        return

    await handler.on_connect(project_id, user_id, websocket, display_name)
    try:
        while True:
            raw = await websocket.receive_json()
            message = WSMessage(**raw)
            await handler.on_message(project_id, user_id, message)
    except WebSocketDisconnect:
        pass
    finally:
        await handler.on_disconnect(project_id, user_id)


# -- REST: comments ---------------------------------------------------------------

class CreateCommentRequest(BaseModel):
    layer_id: UUID | None = None
    text: str
    mentions: list[UUID] = []


@router.post("/api/projects/{project_id}/comments")
async def create_comment(project_id: UUID, body: CreateCommentRequest, user_id: UUID = Depends(get_current_user_id)):
    from main import comment_manager, permission_manager

    permission_manager.require(project_id, user_id, "comment")
    comment = comment_manager.add_comment(
        project_id=project_id,
        user_id=user_id,
        text=body.text,
        layer_id=body.layer_id,
        mentions=body.mentions,
    )
    return {"comment_id": str(comment.id)}


@router.get("/api/projects/{project_id}/history")
async def get_history(project_id: UUID, user_id: UUID = Depends(get_current_user_id), from_: float | None = None, to: float | None = None, user: UUID | None = None):
    from main import sync_engine, permission_manager

    permission_manager.require(project_id, user_id, "read")
    state = sync_engine._state(project_id)  # internal accessor, fine within same package
    ops = state.operations
    if from_ is not None:
        ops = [o for o in ops if o.timestamp >= from_]
    if to is not None:
        ops = [o for o in ops if o.timestamp <= to]
    if user is not None:
        ops = [o for o in ops if o.user_id == user]
    return {"operations": [o.model_dump(mode="json") for o in ops]}


@router.post("/api/projects/{project_id}/conflicts/{layer_id}/resolve")
async def resolve_conflict(
    project_id: UUID,
    layer_id: UUID,
    path: str,
    resolution: str,
    user_id: UUID = Depends(get_current_user_id),
):
    from main import sync_engine, permission_manager

    permission_manager.require(project_id, user_id, "write", layer_id=layer_id)
    if resolution not in ("keep_mine", "take_theirs", "manual_merge"):
        raise HTTPException(400, "invalid resolution")
    op = sync_engine.resolve_conflict(project_id, layer_id, path, resolution)
    if op is None:
        raise HTTPException(404, "no matching conflict")
    return {"resolved_operation": op.model_dump(mode="json")}
