"""[CollabAgent] version_manager.py — auto/manual snapshotting, diffing,
restore, branching, and 30-day retention cleanup."""
from __future__ import annotations

import time
from typing import Any
from uuid import UUID

from models.version import Version, VersionDiff, VersionDiffEntry

AUTO_SAVE_INTERVAL_SECONDS = 60
RETENTION_SECONDS = 30 * 24 * 60 * 60


class VersionManager:
    def __init__(self) -> None:
        self._versions: dict[UUID, list[Version]] = {}
        self._last_auto_save: dict[UUID, float] = {}

    def maybe_auto_save(
        self, project_id: UUID, snapshot: dict[str, Any], user_id: UUID, op_count: int
    ) -> Version | None:
        """Called on each operation; only actually snapshots once per
        AUTO_SAVE_INTERVAL_SECONDS to satisfy the 'every 1 minute' spec."""
        now = time.time()
        last = self._last_auto_save.get(project_id, 0)
        if now - last < AUTO_SAVE_INTERVAL_SECONDS:
            return None
        self._last_auto_save[project_id] = now
        return self._save(project_id, snapshot, user_id, op_count, is_auto_save=True)

    def manual_save(
        self,
        project_id: UUID,
        snapshot: dict[str, Any],
        user_id: UUID,
        op_count: int,
        name: str | None = None,
        description: str | None = None,
    ) -> Version:
        return self._save(
            project_id, snapshot, user_id, op_count, is_auto_save=False, name=name, description=description
        )

    def _save(
        self,
        project_id: UUID,
        snapshot: dict[str, Any],
        user_id: UUID,
        op_count: int,
        is_auto_save: bool,
        name: str | None = None,
        description: str | None = None,
    ) -> Version:
        version = Version(
            project_id=project_id,
            snapshot=snapshot,
            timestamp=time.time(),
            user_id=user_id,
            name=name,
            description=description,
            operation_count=op_count,
            is_auto_save=is_auto_save,
        )
        self._versions.setdefault(project_id, []).append(version)
        self._cleanup(project_id)
        return version

    def _cleanup(self, project_id: UUID) -> None:
        cutoff = time.time() - RETENTION_SECONDS
        versions = self._versions.get(project_id, [])
        # keep all manual saves regardless of age; only prune old auto-saves
        self._versions[project_id] = [
            v for v in versions if not v.is_auto_save or v.timestamp >= cutoff
        ]

    def list_versions(self, project_id: UUID) -> list[Version]:
        return sorted(self._versions.get(project_id, []), key=lambda v: v.timestamp, reverse=True)

    def get(self, project_id: UUID, version_id: UUID) -> Version | None:
        return next(
            (v for v in self._versions.get(project_id, []) if v.id == version_id), None
        )

    def restore(self, project_id: UUID, version_id: UUID) -> Version | None:
        target = self.get(project_id, version_id)
        return target  # caller applies target.snapshot to live document state

    def branch_from(
        self, project_id: UUID, version_id: UUID, user_id: UUID
    ) -> Version | None:
        source = self.get(project_id, version_id)
        if source is None:
            return None
        branched = Version(
            project_id=project_id,
            snapshot=source.snapshot,
            timestamp=time.time(),
            user_id=user_id,
            name=f"Branch of {source.name or source.id}",
            operation_count=0,
            parent_version_id=source.id,
            is_auto_save=False,
        )
        self._versions.setdefault(project_id, []).append(branched)
        return branched

    def diff(self, project_id: UUID, from_id: UUID, to_id: UUID) -> VersionDiff | None:
        v_from = self.get(project_id, from_id)
        v_to = self.get(project_id, to_id)
        if v_from is None or v_to is None:
            return None
        entries = list(self._diff_dict(v_from.snapshot, v_to.snapshot))
        return VersionDiff(from_version_id=from_id, to_version_id=to_id, entries=entries)

    def _diff_dict(self, a: dict, b: dict, prefix: str = "") -> list[VersionDiffEntry]:
        entries: list[VersionDiffEntry] = []
        keys = set(a.keys()) | set(b.keys())
        for key in keys:
            path = f"{prefix}.{key}" if prefix else str(key)
            if key not in a:
                entries.append(VersionDiffEntry(path=path, new_value=b[key], change_type="added"))
            elif key not in b:
                entries.append(VersionDiffEntry(path=path, old_value=a[key], change_type="removed"))
            elif a[key] != b[key]:
                if isinstance(a[key], dict) and isinstance(b[key], dict):
                    entries.extend(self._diff_dict(a[key], b[key], path))
                else:
                    entries.append(
                        VersionDiffEntry(
                            path=path, old_value=a[key], new_value=b[key], change_type="changed"
                        )
                    )
        return entries
