"""[CollabAgent] comment_manager.py — threaded comments, @mentions, emoji
reactions, resolve/unresolve, and pinning."""
from __future__ import annotations

import re
import time
from uuid import UUID

from models.collaboration import Comment

MENTION_PATTERN = re.compile(r"@(\w+)")


class CommentManager:
    def __init__(self) -> None:
        self._comments: dict[UUID, list[Comment]] = {}  # project_id -> comments

    def extract_mentions(self, text: str, username_to_id: dict[str, UUID]) -> list[UUID]:
        handles = MENTION_PATTERN.findall(text)
        return [username_to_id[h] for h in handles if h in username_to_id]

    def add_comment(
        self,
        project_id: UUID,
        user_id: UUID,
        text: str,
        layer_id: UUID | None = None,
        parent_comment_id: UUID | None = None,
        mentions: list[UUID] | None = None,
    ) -> Comment:
        comment = Comment(
            project_id=project_id,
            layer_id=layer_id,
            parent_comment_id=parent_comment_id,
            user_id=user_id,
            text=text,
            mentions=mentions or [],
            created_at=time.time(),
        )
        self._comments.setdefault(project_id, []).append(comment)
        return comment

    def edit_comment(self, project_id: UUID, comment_id: UUID, new_text: str) -> Comment | None:
        c = self._find(project_id, comment_id)
        if c:
            c.text = new_text
            c.edited_at = time.time()
        return c

    def resolve(self, project_id: UUID, comment_id: UUID, resolved_by: UUID) -> Comment | None:
        c = self._find(project_id, comment_id)
        if c:
            c.resolved = True
            c.resolved_by = resolved_by
            c.resolved_at = time.time()
        return c

    def unresolve(self, project_id: UUID, comment_id: UUID) -> Comment | None:
        c = self._find(project_id, comment_id)
        if c:
            c.resolved = False
            c.resolved_by = None
            c.resolved_at = None
        return c

    def toggle_pin(self, project_id: UUID, comment_id: UUID) -> Comment | None:
        c = self._find(project_id, comment_id)
        if c:
            c.pinned = not c.pinned
        return c

    def react(self, project_id: UUID, comment_id: UUID, emoji: str, user_id: UUID) -> Comment | None:
        c = self._find(project_id, comment_id)
        if c is None:
            return None
        users = c.reactions.setdefault(emoji, [])
        if user_id in users:
            users.remove(user_id)
        else:
            users.append(user_id)
        return c

    def thread(self, project_id: UUID, root_comment_id: UUID) -> list[Comment]:
        all_comments = self._comments.get(project_id, [])
        root = self._find(project_id, root_comment_id)
        if root is None:
            return []
        replies = [c for c in all_comments if c.parent_comment_id == root_comment_id]
        return [root] + sorted(replies, key=lambda c: c.created_at)

    def for_layer(self, project_id: UUID, layer_id: UUID) -> list[Comment]:
        return [
            c
            for c in self._comments.get(project_id, [])
            if c.layer_id == layer_id and c.parent_comment_id is None
        ]

    def all_for_project(self, project_id: UUID) -> list[Comment]:
        return list(self._comments.get(project_id, []))

    def _find(self, project_id: UUID, comment_id: UUID) -> Comment | None:
        return next(
            (c for c in self._comments.get(project_id, []) if c.id == comment_id), None
        )
