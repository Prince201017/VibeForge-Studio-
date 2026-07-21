"""[CollabAgent] notification_service.py — creates and dispatches
notifications for comments, mentions, permission changes, join/leave, and
version saves. Real-time delivery is pushed via the broadcaster; email
digests are batched separately."""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable, Optional
from uuid import UUID

from models.collaboration import Notification, NotificationType


class NotificationPreferences:
    def __init__(
        self,
        realtime: bool = True,
        email_digest: bool = False,
        digest_interval_hours: int = 24,
        mute_types: Optional[set[NotificationType]] = None,
    ) -> None:
        self.realtime = realtime
        self.email_digest = email_digest
        self.digest_interval_hours = digest_interval_hours
        self.mute_types = mute_types or set()


class NotificationService:
    def __init__(self) -> None:
        # user_id -> list[Notification]
        self._store: dict[UUID, list[Notification]] = defaultdict(list)
        self._prefs: dict[UUID, NotificationPreferences] = {}
        self.on_notify: Optional[Callable[[Notification], None]] = None

    def set_preferences(self, user_id: UUID, prefs: NotificationPreferences) -> None:
        self._prefs[user_id] = prefs

    def _prefs_for(self, user_id: UUID) -> NotificationPreferences:
        return self._prefs.get(user_id, NotificationPreferences())

    def notify(
        self,
        user_id: UUID,
        type_: NotificationType,
        project_id: UUID,
        actor_id: UUID | None = None,
        data: dict | None = None,
    ) -> Notification | None:
        prefs = self._prefs_for(user_id)
        if type_ in prefs.mute_types:
            return None
        note = Notification(
            user_id=user_id,
            type=type_,
            project_id=project_id,
            actor_id=actor_id,
            data=data or {},
            created_at=time.time(),
        )
        self._store[user_id].append(note)
        if prefs.realtime and self.on_notify:
            self.on_notify(note)
        return note

    def notify_comment(self, recipients: list[UUID], project_id: UUID, actor_id: UUID, comment_id: UUID, layer_id: UUID | None):
        for uid in recipients:
            self.notify(uid, NotificationType.COMMENT, project_id, actor_id, {"comment_id": str(comment_id), "layer_id": str(layer_id) if layer_id else None})

    def notify_mentions(self, mentioned: list[UUID], project_id: UUID, actor_id: UUID, comment_id: UUID):
        for uid in mentioned:
            self.notify(uid, NotificationType.MENTION, project_id, actor_id, {"comment_id": str(comment_id)})

    def notify_permission_change(self, user_id: UUID, project_id: UUID, actor_id: UUID, new_role: str):
        self.notify(user_id, NotificationType.PERMISSION_CHANGE, project_id, actor_id, {"new_role": new_role})

    def notify_join(self, recipients: list[UUID], project_id: UUID, joined_user_id: UUID):
        for uid in recipients:
            self.notify(uid, NotificationType.USER_JOINED, project_id, joined_user_id, {})

    def notify_leave(self, recipients: list[UUID], project_id: UUID, left_user_id: UUID):
        for uid in recipients:
            self.notify(uid, NotificationType.USER_LEFT, project_id, left_user_id, {})

    def notify_version_saved(self, recipients: list[UUID], project_id: UUID, actor_id: UUID, version_id: UUID):
        for uid in recipients:
            self.notify(uid, NotificationType.VERSION_SAVED, project_id, actor_id, {"version_id": str(version_id)})

    def notify_conflict(self, user_id: UUID, project_id: UUID, layer_id: UUID | None, path: str):
        self.notify(user_id, NotificationType.CONFLICT, project_id, None, {"layer_id": str(layer_id) if layer_id else None, "path": path})

    def mark_read(self, user_id: UUID, notification_id: UUID) -> None:
        for n in self._store.get(user_id, []):
            if n.id == notification_id:
                n.read = True

    def mark_all_read(self, user_id: UUID) -> None:
        for n in self._store.get(user_id, []):
            n.read = True

    def list_for_user(self, user_id: UUID, unread_only: bool = False) -> list[Notification]:
        notes = self._store.get(user_id, [])
        if unread_only:
            notes = [n for n in notes if not n.read]
        return sorted(notes, key=lambda n: n.created_at, reverse=True)

    def build_email_digest(self, user_id: UUID, since: float) -> list[Notification]:
        prefs = self._prefs_for(user_id)
        if not prefs.email_digest:
            return []
        return [n for n in self._store.get(user_id, []) if n.created_at >= since]
