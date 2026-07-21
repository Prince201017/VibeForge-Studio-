"""[CollabAgent] version.py — snapshot/version models."""
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Version(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    snapshot: dict[str, Any]  # full serialized project state
    timestamp: float
    user_id: UUID
    name: Optional[str] = None
    description: Optional[str] = None
    operation_count: int = 0
    parent_version_id: Optional[UUID] = None  # for "branch from version"
    is_auto_save: bool = True


class VersionDiffEntry(BaseModel):
    path: str
    old_value: Any = None
    new_value: Any = None
    change_type: str  # "added" | "removed" | "changed"


class VersionDiff(BaseModel):
    from_version_id: UUID
    to_version_id: UUID
    entries: list[VersionDiffEntry]
