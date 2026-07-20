"""
[CollabAgent] sync_engine.py

Central per-server coordinator for real-time operation sync. Owns:
- the operation log per project (in-memory cache + delegates persistence)
- lamport clock per project
- applying OT transforms via ConflictResolver
- reconnection state recovery (replay ops since a client's last known seq)

This class is transport-agnostic: the websocket handler calls into it, it
never touches the socket directly. That keeps OT logic testable without a
live connection.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Optional
from uuid import UUID

from models.operation import Operation, OperationAck, OperationBatch
from services.conflict_resolver import ConflictResolver


@dataclass
class ProjectSyncState:
    project_id: UUID
    operations: list[Operation] = field(default_factory=list)
    lamport_clock: int = 0
    next_operation_id: int = 1

    def bump_lamport(self, remote: int = 0) -> int:
        self.lamport_clock = max(self.lamport_clock, remote) + 1
        return self.lamport_clock


class OperationStore:
    """Persistence seam. Default implementation is in-memory; swap with a
    Postgres/Neon-backed implementation in production by subclassing and
    overriding these three methods."""

    async def append(self, op: Operation) -> None:
        raise NotImplementedError

    async def load_since(self, project_id: UUID, since_operation_id: int) -> list[Operation]:
        raise NotImplementedError

    async def load_all(self, project_id: UUID) -> list[Operation]:
        raise NotImplementedError


class InMemoryOperationStore(OperationStore):
    def __init__(self) -> None:
        self._log: dict[UUID, list[Operation]] = {}

    async def append(self, op: Operation) -> None:
        self._log.setdefault(op.project_id, []).append(op)

    async def load_since(self, project_id: UUID, since_operation_id: int) -> list[Operation]:
        ops = self._log.get(project_id, [])
        return [o for o in ops if o.operation_id > since_operation_id]

    async def load_all(self, project_id: UUID) -> list[Operation]:
        return list(self._log.get(project_id, []))


class SyncEngine:
    RATE_LIMIT_OPS_PER_MINUTE = 1000

    def __init__(self, store: Optional[OperationStore] = None) -> None:
        self._store = store or InMemoryOperationStore()
        self._states: dict[UUID, ProjectSyncState] = {}
        self._resolver = ConflictResolver()
        # simple sliding-window rate limiter: project_id -> list[timestamps]
        self._rate_windows: dict[UUID, list[float]] = {}
        self.on_conflict: Optional[Callable[[UUID, Operation], None]] = None

    def _state(self, project_id: UUID) -> ProjectSyncState:
        if project_id not in self._states:
            self._states[project_id] = ProjectSyncState(project_id=project_id)
        return self._states[project_id]

    def _check_rate_limit(self, project_id: UUID) -> bool:
        now = time.time()
        window = self._rate_windows.setdefault(project_id, [])
        window[:] = [t for t in window if now - t < 60]
        if len(window) >= self.RATE_LIMIT_OPS_PER_MINUTE:
            return False
        window.append(now)
        return True

    async def submit_operation(
        self, project_id: UUID, incoming: Operation
    ) -> tuple[Operation, OperationAck]:
        """Validate, order, transform, persist, and return the operation
        that should be broadcast plus an ack for the originating client."""
        if not self._check_rate_limit(project_id):
            raise RuntimeError("rate_limit_exceeded")

        state = self._state(project_id)

        incoming.lamport_time = state.bump_lamport(incoming.lamport_time)
        incoming.operation_id = state.next_operation_id
        incoming.timestamp = time.time()

        history = state.operations
        result = self._resolver.resolve_incoming(project_id, incoming, history)

        if result.dropped:
            # Op is a no-op after transform (e.g. lost LWW tie or deleted target).
            state.next_operation_id += 1
            ack = OperationAck(
                operation_id=incoming.operation_id,
                server_timestamp=incoming.timestamp,
                accepted=False,
                transformed_against=[o.operation_id for o in history[-10:]],
            )
            if self.on_conflict:
                self.on_conflict(project_id, incoming)
            return incoming, ack

        final_op = result.op
        state.operations.append(final_op)
        state.next_operation_id += 1
        await self._store.append(final_op)

        if result.conflict and self.on_conflict:
            self.on_conflict(project_id, final_op)

        ack = OperationAck(
            operation_id=final_op.operation_id,
            server_timestamp=final_op.timestamp,
            accepted=True,
        )
        return final_op, ack

    async def recover_since(self, project_id: UUID, since_operation_id: int) -> OperationBatch:
        """Used on reconnect: client sends the last op id it applied, server
        replays everything after that."""
        state = self._state(project_id)
        ops = await self._store.load_since(project_id, since_operation_id)
        return OperationBatch(
            project_id=project_id,
            since_operation_id=since_operation_id,
            operations=ops,
            latest_operation_id=state.next_operation_id - 1,
        )

    def conflicts_for(self, project_id: UUID):
        return self._resolver.list_conflicts(project_id)

    def resolve_conflict(self, project_id: UUID, layer_id, path: str, resolution: str):
        return self._resolver.apply_manual_resolution(project_id, layer_id, path, resolution)

    async def undo(self, project_id: UUID, user_id: UUID) -> Optional[Operation]:
        """Undo the most recent operation authored by `user_id` in this
        project, generating an inverse operation (using old_value)."""
        state = self._state(project_id)
        for op in reversed(state.operations):
            if op.user_id == user_id and not op.tombstone:
                inverse = op.model_copy(
                    update={
                        "value": op.old_value,
                        "old_value": op.value,
                        "operation_id": state.next_operation_id,
                        "parent_op_id": state.operations[-1].operation_id,
                        "timestamp": time.time(),
                        "lamport_time": state.bump_lamport(),
                    }
                )
                state.operations.append(inverse)
                state.next_operation_id += 1
                await self._store.append(inverse)
                return inverse
        return None
