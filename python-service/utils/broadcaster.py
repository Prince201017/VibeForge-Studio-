"""[CollabAgent] broadcaster.py — sends WS messages to interested users only.
Implements the "broadcast optimization (only affected users)" requirement:
operations go to everyone in a project except the author (who already has
local state via the ack); presence updates go to everyone except the
subject; layer-scoped events (e.g. "who's editing this layer") can be
targeted to a subset."""
from __future__ import annotations

import time
from uuid import UUID

from models.collaboration import WSMessage, WSMessageType
from websocket.connection_pool import ConnectionPool


class Broadcaster:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    async def _send(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        conn = self._pool.get(project_id, user_id)
        if conn is None:
            return
        try:
            await conn.socket.send_json(message.model_dump(mode="json"))
        except Exception:
            # Connection likely dead; let the heartbeat sweep clean it up.
            pass

    async def send_to(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        await self._send(project_id, user_id, message)

    async def broadcast(
        self, project_id: UUID, message: WSMessage, exclude_user: UUID | None = None
    ) -> None:
        for conn in self._pool.connections_for(project_id):
            if exclude_user is not None and conn.user_id == exclude_user:
                continue
            await self._send(project_id, conn.user_id, message)

    async def broadcast_to_subset(
        self, project_id: UUID, user_ids: list[UUID], message: WSMessage
    ) -> None:
        for uid in user_ids:
            await self._send(project_id, uid, message)

    # -- convenience wrappers for common event types ---------------------------

    async def broadcast_operation(self, project_id: UUID, author_id: UUID, op_payload: dict) -> None:
        msg = WSMessage(
            type=WSMessageType.OPERATION,
            project_id=project_id,
            user_id=author_id,
            payload=op_payload,
            timestamp=time.time(),
        )
        await self.broadcast(project_id, msg, exclude_user=author_id)

    async def broadcast_presence(self, project_id: UUID, user_id: UUID, presence_payload: dict) -> None:
        msg = WSMessage(
            type=WSMessageType.PRESENCE,
            project_id=project_id,
            user_id=user_id,
            payload=presence_payload,
            timestamp=time.time(),
        )
        await self.broadcast(project_id, msg, exclude_user=user_id)

    async def broadcast_comment(self, project_id: UUID, author_id: UUID, comment_payload: dict) -> None:
        msg = WSMessage(
            type=WSMessageType.COMMENT,
            project_id=project_id,
            user_id=author_id,
            payload=comment_payload,
            timestamp=time.time(),
        )
        await self.broadcast(project_id, msg)  # comments visible to all, including author (confirms save)

    async def broadcast_conflict(self, project_id: UUID, payload: dict) -> None:
        msg = WSMessage(
            type=WSMessageType.CONFLICT, project_id=project_id, payload=payload, timestamp=time.time()
        )
        await self.broadcast(project_id, msg)

    async def send_ack(self, project_id: UUID, user_id: UUID, ack_payload: dict) -> None:
        msg = WSMessage(
            type=WSMessageType.ACK, project_id=project_id, user_id=user_id, payload=ack_payload, timestamp=time.time()
        )
        await self.send_to(project_id, user_id, msg)

    async def send_error(self, project_id: UUID, user_id: UUID, error: str) -> None:
        msg = WSMessage(
            type=WSMessageType.ERROR, project_id=project_id, user_id=user_id, payload={"error": error}, timestamp=time.time()
        )
        await self.send_to(project_id, user_id, msg)
