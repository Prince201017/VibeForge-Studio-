"""[CollabAgent] conflict_resolver.py — merge strategy layer that sits on
top of the raw OT transform, producing user-facing conflict records and
applying CRDT-ish convergence rules per data type."""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from uuid import UUID

from models.operation import Operation
from services.operational_transform import OperationalTransform, TransformResult


@dataclass
class ConflictRecord:
    project_id: UUID
    layer_id: UUID | None
    path: str
    losing_op: Operation
    winning_op: Operation
    created_at: float = field(default_factory=time.time)
    resolution: str = "auto"  # "auto" | "keep_mine" | "take_theirs" | "manual_merge"


class ConflictResolver:
    """Coordinates OT transforms and records conflicts for the UI to surface
    (red badges, merge dialog) per project."""

    def __init__(self) -> None:
        self._ot = OperationalTransform()
        # project_id -> list of unresolved conflicts
        self._conflicts: dict[UUID, list[ConflictRecord]] = {}

    def resolve_incoming(
        self, project_id: UUID, incoming: Operation, history: list[Operation]
    ) -> TransformResult:
        result = self._ot.transform_against_history(incoming, history)
        if result.conflict:
            # Find the most recent applied op on the same path to attribute blame to.
            same_path = [
                op
                for op in history
                if op.layer_id == incoming.layer_id and op.path == incoming.path
            ]
            winning_op = same_path[-1] if same_path else incoming
            record = ConflictRecord(
                project_id=project_id,
                layer_id=incoming.layer_id,
                path=incoming.path,
                losing_op=incoming if result.dropped else winning_op,
                winning_op=result.op if not result.dropped else winning_op,
            )
            self._conflicts.setdefault(project_id, []).append(record)
        return result

    def list_conflicts(self, project_id: UUID) -> list[ConflictRecord]:
        return self._conflicts.get(project_id, [])

    def apply_manual_resolution(
        self, project_id: UUID, layer_id: UUID | None, path: str, resolution: str
    ) -> Operation | None:
        """User picked "keep mine" / "take theirs" / merged value in the
        Conflict Resolution UI. Removes the conflict record and returns the
        operation that should be broadcast to reconcile all clients."""
        records = self._conflicts.get(project_id, [])
        target = next(
            (r for r in records if r.layer_id == layer_id and r.path == path), None
        )
        if target is None:
            return None
        target.resolution = resolution
        chosen = target.losing_op if resolution == "keep_mine" else target.winning_op
        records.remove(target)
        return chosen

    def clear_project(self, project_id: UUID) -> None:
        self._conflicts.pop(project_id, None)
