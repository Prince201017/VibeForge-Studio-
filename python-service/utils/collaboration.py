"""[CollabAgent] collaboration.py — comments, notifications, presence, and
websocket wire-format models shared across services."""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class Comment(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    layer_id: Optional[UUID] = None
    parent_comment_id: Optional[UUID] = None  # set for thread replies
    user_id: UUID
    text: str
    mentions: list[UUID] = Field(default_factory=list)
    resolved: bool = False
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[float] = None
    pinned: bool = False
    reactions: dict[str, list[UUID]] = Field(default_factory=dict)  # emoji -> user_ids
    created_at: float = 0.0
    edited_at: Optional[float] = None


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationType(str, Enum):
    COMMENT = "comment"
    MENTION = "mention"
    PERMISSION_CHANGE = "permission_change"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    VERSION_SAVED = "version_saved"
    CONFLICT = "conflict"


class Notification(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID  # recipient
    type: NotificationType
    project_id: UUID
    actor_id: Optional[UUID] = None
    data: dict[str, Any] = Field(default_factory=dict)
    read: bool = False
    created_at: float = 0.0


# ---------------------------------------------------------------------------
# Presence
# ---------------------------------------------------------------------------

class PresenceState(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    AWAY = "away"


class CursorPosition(BaseModel):
    x: float
    y: float


class Presence(BaseModel):
    user_id: UUID
    project_id: UUID
    cursor: Optional[CursorPosition] = None
    selected_layer_id: Optional[UUID] = None
    state: PresenceState = PresenceState.ACTIVE
    color: str = "#888888"
    display_name: str = ""
    last_seen: float = 0.0


# ---------------------------------------------------------------------------
# WebSocket wire messages
# ---------------------------------------------------------------------------

class WSMessageType(str, Enum):
    JOIN = "join"
    LEAVE = "leave"
    OPERATION = "operation"
    PRESENCE = "presence"
    COMMENT = "comment"
    VERSION_SAVE = "version-save"
    ACK = "ack"
    CONFLICT = "conflict"
    SYNC_STATE = "sync-state"
    ERROR = "error"
    HEARTBEAT = "heartbeat"


class WSMessage(BaseModel):
    """Envelope for all inbound/outbound websocket traffic."""

    type: WSMessageType
    project_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: float = 0.0
