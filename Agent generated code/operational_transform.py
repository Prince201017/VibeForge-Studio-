"""
[CollabAgent] operational_transform.py

Implements operational transformation for concurrent edits on a tree-shaped
document (layers with nested attributes and ordered child lists).

Design notes
------------
Every Operation carries a `path` (dot/bracket JSON-path into the document),
a `type`, and a `lamport_time` used to break ties deterministically. When two
operations are concurrent (neither's `parent_op_id` lineage includes the
other), we transform the *incoming* operation against the *already-applied*
operation so that intention is preserved regardless of arrival order
(convergence property of OT / CRDT-style systems).

The transform is intentionally conservative: for structural ops (list
insert/delete/move) we adjust indices; for scalar ops (modify/attribute) we
apply last-write-wins keyed by (lamport_time, site_id) so all replicas
converge on the same winner without needing central coordination beyond
lamport clock comparison.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from models.operation import Operation, OperationType


def _lamport_wins(a: Operation, b: Operation) -> bool:
    """Deterministic total order tie-break: higher lamport time wins;
    on exact tie, lexicographically larger site_id wins. Used so every
    replica picks the same winner without a central authority."""
    if a.lamport_time != b.lamport_time:
        return a.lamport_time > b.lamport_time
    return (a.site_id or "") > (b.site_id or "")


@dataclass
class TransformResult:
    op: Operation
    dropped: bool = False  # true if op became a no-op after transform
    conflict: bool = False  # true if this required LWW tie-break


class OperationalTransform:
    """Stateless transform functions. One instance can be shared across
    all projects since it holds no per-project state."""

    # -- list index bookkeeping -------------------------------------------------

    @staticmethod
    def _transform_list_index(incoming_index: int, applied: Operation) -> int:
        """Shift an index in `incoming` to account for an already-applied
        structural operation on the same list."""
        applied_index = applied.value.get("index") if isinstance(applied.value, dict) else None
        if applied_index is None:
            return incoming_index

        if applied.type == OperationType.LIST_INSERT:
            if applied_index <= incoming_index:
                return incoming_index + 1
            return incoming_index

        if applied.type == OperationType.LIST_DELETE:
            if applied_index < incoming_index:
                return incoming_index - 1
            if applied_index == incoming_index:
                return -1  # target was deleted concurrently
            return incoming_index

        if applied.type == OperationType.LIST_MOVE:
            from_i = applied.value.get("from_index")
            to_i = applied.value.get("to_index")
            if from_i is None or to_i is None:
                return incoming_index
            idx = incoming_index
            if from_i < idx <= to_i:
                idx -= 1
            elif to_i <= idx < from_i:
                idx += 1
            elif idx == from_i:
                idx = to_i
            return idx

        return incoming_index

    # -- main entry point ---------------------------------------------------

    def transform(self, incoming: Operation, applied: Operation) -> TransformResult:
        """Transform `incoming` (not yet applied locally) against `applied`
        (already applied). Returns a possibly-modified copy of `incoming`."""

        # Different paths/layers never interact.
        if incoming.layer_id != applied.layer_id or incoming.path != applied.path:
            return TransformResult(op=incoming)

        # Same path & layer => genuine conflict candidate.
        if incoming.type in (
            OperationType.LIST_INSERT,
            OperationType.LIST_DELETE,
            OperationType.LIST_MOVE,
        ) and applied.type in (
            OperationType.LIST_INSERT,
            OperationType.LIST_DELETE,
            OperationType.LIST_MOVE,
        ):
            return self._transform_structural(incoming, applied)

        if incoming.type in (OperationType.MODIFY, OperationType.ATTR) and applied.type in (
            OperationType.MODIFY,
            OperationType.ATTR,
        ):
            return self._transform_scalar(incoming, applied)

        if incoming.type == OperationType.DELETE or applied.type == OperationType.DELETE:
            return self._transform_delete(incoming, applied)

        if incoming.type == OperationType.MOVE and applied.type == OperationType.MOVE:
            return self._transform_move(incoming, applied)

        # Insert vs modify, etc — no structural relationship, pass through.
        return TransformResult(op=incoming)

    # -- category-specific transforms ----------------------------------------

    def _transform_structural(self, incoming: Operation, applied: Operation) -> TransformResult:
        new_value = dict(incoming.value) if isinstance(incoming.value, dict) else {}
        if "index" in new_value:
            new_index = self._transform_list_index(new_value["index"], applied)
            if new_index == -1:
                return TransformResult(op=incoming, dropped=True, conflict=True)
            new_value["index"] = new_index
        if "from_index" in new_value:
            new_value["from_index"] = self._transform_list_index(new_value["from_index"], applied)
        if "to_index" in new_value:
            new_value["to_index"] = self._transform_list_index(new_value["to_index"], applied)

        transformed = incoming.model_copy(update={"value": new_value})
        return TransformResult(op=transformed, conflict=True)

    def _transform_scalar(self, incoming: Operation, applied: Operation) -> TransformResult:
        """Last-write-wins for two concurrent value changes to the same field."""
        if _lamport_wins(applied, incoming):
            # The already-applied op wins; incoming becomes a no-op so the
            # client is told its change was superseded (surfaced as a conflict).
            return TransformResult(op=incoming, dropped=True, conflict=True)
        # incoming wins outright — it stands as-is, applied on top.
        return TransformResult(op=incoming, conflict=True)

    def _transform_delete(self, incoming: Operation, applied: Operation) -> TransformResult:
        # If the node was already deleted (tombstoned), any further op on it
        # is dropped — deletion tombstones make this idempotent.
        if applied.type == OperationType.DELETE and applied.tombstone:
            return TransformResult(op=incoming, dropped=True, conflict=True)
        return TransformResult(op=incoming, conflict=True)

    def _transform_move(self, incoming: Operation, applied: Operation) -> TransformResult:
        if _lamport_wins(applied, incoming):
            return TransformResult(op=incoming, dropped=True, conflict=True)
        return TransformResult(op=incoming, conflict=True)

    # -- batch transform ------------------------------------------------------

    def transform_against_history(
        self, incoming: Operation, history: list[Operation]
    ) -> TransformResult:
        """Transform `incoming` sequentially against every operation in
        `history` that happened after the client's known parent_op_id
        (i.e. everything the client hadn't seen yet)."""
        concurrent_ops = [
            op for op in history if op.operation_id > (incoming.parent_op_id or -1)
        ]
        result = TransformResult(op=incoming)
        any_conflict = False
        for applied in concurrent_ops:
            if result.dropped:
                break
            result = self.transform(result.op, applied)
            any_conflict = any_conflict or result.conflict
        result.conflict = any_conflict
        return result
