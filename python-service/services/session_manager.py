# [Claude.A9] Tracks connected clients per project, sequences ops, and rebroadcasts
# transformed ops — the server-side counterpart to a websocket handler below.
from __future__ import annotations
import asyncio
import time
import uuid
from dataclasses import dataclass, field

from .operations import Operation, transform, apply_operation


@dataclass
class ClientConnection:
    client_id: str
    user_id: str
    project_id: str
    cursor: dict | None = None
    connected_at: float = field(default_factory=time.time)


class ProjectSession:
    """One per actively-collaborated project. Holds authoritative op log + scene state."""

    def __init__(self, project_id: str, initial_scene: dict | None = None):
        self.project_id = project_id
        self.scene: dict = initial_scene or {"nodes": {}}
        self.op_log: list[Operation] = []
        self.clients: dict[str, ClientConnection] = {}
        self._lock = asyncio.Lock()

    async def join(self, client_id: str, user_id: str) -> ClientConnection:
        conn = ClientConnection(client_id=client_id, user_id=user_id, project_id=self.project_id)
        self.clients[client_id] = conn
        return conn

    async def leave(self, client_id: str) -> None:
        self.clients.pop(client_id, None)

    async def submit_operation(self, op: Operation, client_known_ops: int) -> Operation:
        """Transform an incoming op against any ops applied since the client's last
        known state, then apply + append to the authoritative log."""
        async with self._lock:
            concurrent_ops = self.op_log[client_known_ops:]
            transformed = op
            for concurrent in concurrent_ops:
                transformed = transform(transformed, concurrent)
            self.scene = apply_operation(self.scene, transformed)
            self.op_log.append(transformed)
            return transformed

    def update_cursor(self, client_id: str, x: float, y: float) -> None:
        conn = self.clients.get(client_id)
        if conn:
            conn.cursor = {"x": x, "y": y, "ts": time.time()}

    def other_clients(self, exclude_client_id: str) -> list[ClientConnection]:
        return [c for cid, c in self.clients.items() if cid != exclude_client_id]


class SessionRegistry:
    def __init__(self) -> None:
        self._sessions: dict[str, ProjectSession] = {}

    def get_or_create(self, project_id: str) -> ProjectSession:
        if project_id not in self._sessions:
            self._sessions[project_id] = ProjectSession(project_id)
        return self._sessions[project_id]

    def cleanup_empty(self, project_id: str) -> None:
        session = self._sessions.get(project_id)
        if session and not session.clients:
            del self._sessions[project_id]
