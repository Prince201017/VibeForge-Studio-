"""
[CollabAgent] operation.py
Pydantic models representing a single collaborative operation (OT unit).
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class OperationType(str, Enum):
    INSERT = "insert"
    DELETE = "delete"
    MODIFY = "modify"
    MOVE = "move"
    ATTR = "attribute"
    LIST_INSERT = "list_insert"
    LIST_DELETE = "list_delete"
    LIST_MOVE = "list_move"


class Operation(BaseModel):
    """A single atomic change made by a user, sequenced per-project."""

    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    operation_id: int  # monotonically increasing sequence number per project
    user_id: UUID
    type: OperationType
    layer_id: Optional[UUID] = None
    path: str  # JSON-path style pointer into the document tree, e.g. "layers.3.fill"
    value: Any = None
    old_value: Any = None  # required for LWW / undo
    timestamp: float  # epoch seconds, server-assigned
    lamport_time: int = 0
    parent_op_id: Optional[int] = None  # last op this client had seen when it authored this op
    tombstone: bool = False  # true if this op represents a soft-delete marker
    site_id: Optional[str] = None  # per-connection id, used for tie-breaking transforms

    class Config:
        use_enum_values = True

    def conflicts_with(self, other: "Operation") -> bool:
        """Two ops conflict if they touch the same path/layer and neither
        causally precedes the other (i.e. same parent_op_id lineage point)."""
        if self.layer_id != other.layer_id:
            return False
        if self.path != other.path:
            return False
        return self.parent_op_id == other.parent_op_id and self.operation_id != other.operation_id


class OperationAck(BaseModel):
    operation_id: int
    server_timestamp: float
    accepted: bool = True
    transformed_against: list[int] = Field(default_factory=list)


class OperationBatch(BaseModel):
    """Used for reconnection state recovery: all ops since a given seq."""

    project_id: UUID
    since_operation_id: int
    operations: list[Operation]
    latest_operation_id: int
