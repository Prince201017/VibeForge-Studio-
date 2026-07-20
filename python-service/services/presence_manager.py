"""[CollabAgent] presence_manager.py — tracks live cursors, selection state,
and idle/away detection per project. Broadcast throttling (500ms) is
enforced here so the websocket layer stays simple."""
from __future__ import annotations

import time
from uuid import UUID

from models.collaboration import CursorPosition, Presence, PresenceState

IDLE_THRESHOLD_SECONDS = 30
AWAY_THRESHOLD_SECONDS = 120
PRESENCE_BROADCAST_THROTTLE_MS = 500

# Deterministic color palette so the same user always gets a stable-ish hue
# within a session (falls back to hashing on user_id).
_PALETTE = [
    "#F87171", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA",
    "#F472B6", "#4ADE80", "#38BDF8", "#FB923C", "#C084FC",
]


class PresenceManager:
    def __init__(self) -> None:
        # project_id -> user_id -> Presence
        self._presence: dict[UUID, dict[UUID, Presence]] = {}
        # project_id -> user_id -> last broadcast timestamp (for throttling)
        self._last_broadcast: dict[UUID, dict[UUID, float]] = {}

    def _color_for(self, user_id: UUID) -> str:
        return _PALETTE[int(str(user_id).replace("-", ""), 16) % len(_PALETTE)]

    def join(self, project_id: UUID, user_id: UUID, display_name: str) -> Presence:
        p = Presence(
            user_id=user_id,
            project_id=project_id,
            state=PresenceState.ACTIVE,
            color=self._color_for(user_id),
            display_name=display_name,
            last_seen=time.time(),
        )
        self._presence.setdefault(project_id, {})[user_id] = p
        return p

    def leave(self, project_id: UUID, user_id: UUID) -> None:
        self._presence.get(project_id, {}).pop(user_id, None)
        self._last_broadcast.get(project_id, {}).pop(user_id, None)

    def update_cursor(
        self,
        project_id: UUID,
        user_id: UUID,
        cursor: CursorPosition | None = None,
        selected_layer_id: UUID | None = None,
    ) -> tuple[Presence, bool]:
        """Returns (presence, should_broadcast). should_broadcast enforces
        the 500ms throttle so noisy mousemove events don't flood the wire."""
        bucket = self._presence.setdefault(project_id, {})
        p = bucket.get(user_id) or self.join(project_id, user_id, "")
        if cursor is not None:
            p.cursor = cursor
        if selected_layer_id is not None:
            p.selected_layer_id = selected_layer_id
        p.state = PresenceState.ACTIVE
        p.last_seen = time.time()

        throttle = self._last_broadcast.setdefault(project_id, {})
        now = time.time()
        last = throttle.get(user_id, 0)
        should_broadcast = (now - last) * 1000 >= PRESENCE_BROADCAST_THROTTLE_MS
        if should_broadcast:
            throttle[user_id] = now
        return p, should_broadcast

    def sweep_idle(self, project_id: UUID) -> list[Presence]:
        """Call periodically (e.g. from a heartbeat loop) to demote stale
        users to idle/away. Returns the list of presences that changed
        state, for broadcasting."""
        now = time.time()
        changed = []
        for p in self._presence.get(project_id, {}).values():
            age = now - p.last_seen
            new_state = p.state
            if age > AWAY_THRESHOLD_SECONDS:
                new_state = PresenceState.AWAY
            elif age > IDLE_THRESHOLD_SECONDS:
                new_state = PresenceState.IDLE
            else:
                new_state = PresenceState.ACTIVE
            if new_state != p.state:
                p.state = new_state
                changed.append(p)
        return changed

    def list_presence(self, project_id: UUID) -> list[Presence]:
        return list(self._presence.get(project_id, {}).values())

    def who_is_editing(self, project_id: UUID, layer_id: UUID) -> list[Presence]:
        return [
            p
            for p in self._presence.get(project_id, {}).values()
            if p.selected_layer_id == layer_id
        ]
