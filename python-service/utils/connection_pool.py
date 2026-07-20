"""[CollabAgent] connection_pool.py — tracks live WebSocket connections per
project, handles heartbeats, and enforces the 30-second timeout / graceful
disconnect described in the spec."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Protocol
from uuid import UUID

HEARTBEAT_INTERVAL_SECONDS = 10
CONNECTION_TIMEOUT_SECONDS = 30


class SendableSocket(Protocol):
    async def send_json(self, data: dict) -> None: ...
    async def close(self, code: int = 1000) -> None: ...


@dataclass
class Connection:
    project_id: UUID
    user_id: UUID
    socket: Any  # SendableSocket
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    last_known_op_id: int = 0


class ConnectionPool:
    def __init__(self) -> None:
        # project_id -> user_id -> Connection  (one active connection per user per project)
        self._connections: dict[UUID, dict[UUID, Connection]] = {}
        self._lock = asyncio.Lock()

    async def add(self, project_id: UUID, user_id: UUID, socket: SendableSocket) -> Connection:
        async with self._lock:
            conn = Connection(project_id=project_id, user_id=user_id, socket=socket)
            self._connections.setdefault(project_id, {})[user_id] = conn
            return conn

    async def remove(self, project_id: UUID, user_id: UUID) -> None:
        async with self._lock:
            self._connections.get(project_id, {}).pop(user_id, None)
            if project_id in self._connections and not self._connections[project_id]:
                del self._connections[project_id]

    def heartbeat(self, project_id: UUID, user_id: UUID) -> None:
        conn = self._connections.get(project_id, {}).get(user_id)
        if conn:
            conn.last_heartbeat = time.time()

    def connections_for(self, project_id: UUID) -> list[Connection]:
        return list(self._connections.get(project_id, {}).values())

    def get(self, project_id: UUID, user_id: UUID) -> Connection | None:
        return self._connections.get(project_id, {}).get(user_id)

    def is_connected(self, project_id: UUID, user_id: UUID) -> bool:
        return user_id in self._connections.get(project_id, {})

    def active_user_count(self, project_id: UUID) -> int:
        return len(self._connections.get(project_id, {}))

    async def sweep_stale(self) -> list[Connection]:
        """Find and remove connections that missed heartbeats past the
        30-second timeout. Returns removed connections so the caller can
        broadcast presence "left" events."""
        now = time.time()
        stale: list[Connection] = []
        async with self._lock:
            for project_id, users in list(self._connections.items()):
                for user_id, conn in list(users.items()):
                    if now - conn.last_heartbeat > CONNECTION_TIMEOUT_SECONDS:
                        stale.append(conn)
                        del users[user_id]
                if not users:
                    del self._connections[project_id]
        return stale

    async def run_heartbeat_loop(self) -> None:
        """Background task: run via asyncio.create_task(pool.run_heartbeat_loop())."""
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
            stale = await self.sweep_stale()
            for conn in stale:
                try:
                    await conn.socket.close(code=1001)
                except Exception:
                    pass
