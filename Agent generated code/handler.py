"""[CollabAgent] handler.py — top-level WebSocket message router. Wires
together SyncEngine, PresenceManager, PermissionManager, CommentManager,
VersionManager, and NotificationService for a single project's socket
traffic. Framework-agnostic: `socket` only needs send_json/close/receive_json.
"""
from __future__ import annotations

import time
from uuid import UUID

from models.collaboration import (
    CursorPosition,
    Presence,
    WSMessage,
    WSMessageType,
)
from models.operation import Operation
from models.permission import PermissionDenied
from services.comment_manager import CommentManager
from services.notification_service import NotificationService
from services.permission_manager import PermissionManager
from services.presence_manager import PresenceManager
from services.sync_engine import SyncEngine
from services.version_manager import VersionManager
from websocket.broadcaster import Broadcaster
from websocket.connection_pool import ConnectionPool


class CollaborationHandler:
    def __init__(
        self,
        pool: ConnectionPool,
        sync_engine: SyncEngine,
        presence: PresenceManager,
        permissions: PermissionManager,
        comments: CommentManager,
        versions: VersionManager,
        notifications: NotificationService,
    ) -> None:
        self._pool = pool
        self._sync = sync_engine
        self._presence = presence
        self._permissions = permissions
        self._comments = comments
        self._versions = versions
        self._notifications = notifications
        self._broadcaster = Broadcaster(pool)

    async def on_connect(self, project_id: UUID, user_id: UUID, socket, display_name: str) -> None:
        if not self._permissions.can(project_id, user_id, "read"):
            await socket.close(code=4403)
            return
        await self._pool.add(project_id, user_id, socket)
        self._presence.join(project_id, user_id, display_name)

        others = [c.user_id for c in self._pool.connections_for(project_id) if c.user_id != user_id]
        self._notifications.notify_join(others, project_id, user_id)
        await self._broadcaster.broadcast_presence(
            project_id, user_id, {"event": "joined", "display_name": display_name}
        )

    async def on_disconnect(self, project_id: UUID, user_id: UUID) -> None:
        await self._pool.remove(project_id, user_id)
        self._presence.leave(project_id, user_id)
        others = [c.user_id for c in self._pool.connections_for(project_id)]
        self._notifications.notify_leave(others, project_id, user_id)
        await self._broadcaster.broadcast_presence(project_id, user_id, {"event": "left"})

    async def on_message(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        self._pool.heartbeat(project_id, user_id)

        try:
            if message.type == WSMessageType.OPERATION:
                await self._handle_operation(project_id, user_id, message)
            elif message.type == WSMessageType.PRESENCE:
                await self._handle_presence(project_id, user_id, message)
            elif message.type == WSMessageType.COMMENT:
                await self._handle_comment(project_id, user_id, message)
            elif message.type == WSMessageType.VERSION_SAVE:
                await self._handle_version_save(project_id, user_id, message)
            elif message.type == WSMessageType.HEARTBEAT:
                pass  # already recorded above
            else:
                await self._broadcaster.send_error(project_id, user_id, f"unknown message type {message.type}")
        except PermissionDenied as e:
            await self._broadcaster.send_error(project_id, user_id, str(e))
        except RuntimeError as e:
            await self._broadcaster.send_error(project_id, user_id, str(e))

    async def _handle_operation(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        layer_id = message.payload.get("layer_id")
        self._permissions.require(project_id, user_id, "write", layer_id=layer_id)

        op = Operation(**message.payload)
        op.project_id = project_id
        op.user_id = user_id

        final_op, ack = await self._sync.submit_operation(project_id, op)
        await self._broadcaster.send_ack(
            project_id, user_id, ack.model_dump(mode="json")
        )
        if ack.accepted:
            await self._broadcaster.broadcast_operation(
                project_id, user_id, final_op.model_dump(mode="json")
            )

    async def _handle_presence(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        cursor_data = message.payload.get("cursor")
        cursor = CursorPosition(**cursor_data) if cursor_data else None
        selected_layer = message.payload.get("selected_layer_id")

        presence, should_broadcast = self._presence.update_cursor(
            project_id, user_id, cursor=cursor, selected_layer_id=selected_layer
        )
        if should_broadcast:
            await self._broadcaster.broadcast_presence(
                project_id, user_id, presence.model_dump(mode="json")
            )

    async def _handle_comment(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        self._permissions.require(project_id, user_id, "comment")
        payload = message.payload
        comment = self._comments.add_comment(
            project_id=project_id,
            user_id=user_id,
            text=payload["text"],
            layer_id=payload.get("layer_id"),
            parent_comment_id=payload.get("parent_comment_id"),
            mentions=payload.get("mentions", []),
        )
        await self._broadcaster.broadcast_comment(project_id, user_id, comment.model_dump(mode="json"))

        recipients = [
            c.user_id for c in self._pool.connections_for(project_id) if c.user_id != user_id
        ]
        self._notifications.notify_comment(recipients, project_id, user_id, comment.id, comment.layer_id)
        if comment.mentions:
            self._notifications.notify_mentions(comment.mentions, project_id, user_id, comment.id)

    async def _handle_version_save(self, project_id: UUID, user_id: UUID, message: WSMessage) -> None:
        self._permissions.require(project_id, user_id, "write")
        snapshot = message.payload.get("snapshot", {})
        version = self._versions.manual_save(
            project_id,
            snapshot,
            user_id,
            op_count=message.payload.get("operation_count", 0),
            name=message.payload.get("name"),
            description=message.payload.get("description"),
        )
        recipients = [
            c.user_id for c in self._pool.connections_for(project_id) if c.user_id != user_id
        ]
        self._notifications.notify_version_saved(recipients, project_id, user_id, version.id)
        ack = WSMessage(
            type=WSMessageType.ACK,
            project_id=project_id,
            user_id=user_id,
            payload={"version_id": str(version.id), "timestamp": version.timestamp},
            timestamp=time.time(),
        )
        await self._broadcaster.send_to(project_id, user_id, ack)
