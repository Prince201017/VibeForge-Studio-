# [Claude.A9] FastAPI WebSocket endpoint wiring client connections to a ProjectSession.
# Targets the <100ms sync latency SLA by keeping the transform/apply path synchronous
# in-memory (no DB round-trip on the hot path; persistence happens via periodic
# snapshotting, not shown here since it needs the real DB schema).
from __future__ import annotations
import json
import time
import uuid
from fastapi import WebSocket, WebSocketDisconnect

from .session_manager import SessionRegistry
from .operations import Operation, OpType

registry = SessionRegistry()


async def handle_connection(websocket: WebSocket, project_id: str, user_id: str) -> None:
    await websocket.accept()
    session = registry.get_or_create(project_id)
    client_id = str(uuid.uuid4())
    await session.join(client_id, user_id)

    await websocket.send_json({"type": "init", "scene": session.scene, "op_count": len(session.op_log)})

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            if msg["type"] == "cursor":
                session.update_cursor(client_id, msg["x"], msg["y"])
                for peer in session.other_clients(client_id):
                    # NOTE: real fan-out needs a per-client websocket handle registry;
                    # simplified here to the broadcast contract, not the socket plumbing.
                    pass

            elif msg["type"] == "op":
                op = Operation(
                    op_id=str(uuid.uuid4()),
                    actor_id=user_id,
                    timestamp=time.time(),
                    type=OpType(msg["op_type"]),
                    node_id=msg["node_id"],
                    property=msg.get("property"),
                    value=msg.get("value"),
                    prev_value=msg.get("prev_value"),
                )
                transformed = await session.submit_operation(op, msg.get("known_op_count", 0))
                await websocket.send_json({"type": "ack", "op_id": transformed.op_id})

    except WebSocketDisconnect:
        await session.leave(client_id)
        registry.cleanup_empty(project_id)
