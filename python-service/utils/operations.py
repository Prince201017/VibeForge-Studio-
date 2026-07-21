# [Claude.A9] Operational Transform primitives for concurrent scene-graph edits.
# Scoped to the mutation types the shared-types/history.ts contract implies:
# property SET ops on nodes (position, size, color, etc.) — a practical OT subset,
# not a general-purpose text-OT system (which the design-tool use case doesn't need).
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Any


class OpType(str, Enum):
    SET_PROPERTY = "set_property"
    INSERT_NODE = "insert_node"
    DELETE_NODE = "delete_node"
    REORDER = "reorder"


@dataclass
class Operation:
    op_id: str
    actor_id: str
    timestamp: float
    type: OpType
    node_id: str
    property: str | None = None
    value: Any = None
    prev_value: Any = None
    index: int | None = None


def transform(op_a: Operation, op_b: Operation) -> Operation:
    """Transform op_a against a concurrently-applied op_b so op_a can still apply
    cleanly on top of a state that already has op_b applied. Last-write-wins on the
    same (node_id, property) pair, tie-broken by actor_id for determinism."""
    if op_a.type == OpType.SET_PROPERTY and op_b.type == OpType.SET_PROPERTY:
        if op_a.node_id == op_b.node_id and op_a.property == op_b.property:
            if op_b.timestamp > op_a.timestamp or (
                op_b.timestamp == op_a.timestamp and op_b.actor_id > op_a.actor_id
            ):
                # op_b wins; op_a becomes a no-op (still valid, just superseded)
                return Operation(**{**op_a.__dict__, "value": op_a.prev_value})
    if op_a.type == OpType.DELETE_NODE and op_b.type == OpType.SET_PROPERTY:
        if op_a.node_id == op_b.node_id:
            # deletion wins regardless of property edits on the same node
            return op_a
    if op_a.type == OpType.SET_PROPERTY and op_b.type == OpType.DELETE_NODE:
        if op_a.node_id == op_b.node_id:
            # target was deleted concurrently; this op becomes a no-op
            return Operation(**{**op_a.__dict__, "type": OpType.SET_PROPERTY, "value": op_a.prev_value})
    return op_a


def apply_operation(scene: dict, op: Operation) -> dict:
    nodes = scene.setdefault("nodes", {})
    if op.type == OpType.SET_PROPERTY:
        node = nodes.get(op.node_id)
        if node is not None and op.property:
            node[op.property] = op.value
    elif op.type == OpType.INSERT_NODE:
        nodes[op.node_id] = op.value
    elif op.type == OpType.DELETE_NODE:
        nodes.pop(op.node_id, None)
    return scene
