"""[CollabAgent] versions.py — version list, restore, diff, and branch
REST endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from models.permission import PermissionDenied

router = APIRouter()


def get_current_user_id() -> UUID:
    from routes.collab import get_current_user_id as _impl
    return _impl


@router.get("/api/projects/{project_id}/versions")
async def list_versions(project_id: UUID, user_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager, version_manager

    try:
        permission_manager.require(project_id, user_id, "read")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    versions = version_manager.list_versions(project_id)
    return {"versions": [v.model_dump(mode="json") for v in versions]}


@router.post("/api/projects/{project_id}/versions/{version_id}/restore")
async def restore_version(project_id: UUID, version_id: UUID, user_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager, version_manager, sync_engine

    try:
        permission_manager.require(project_id, user_id, "write")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))

    version = version_manager.restore(project_id, version_id)
    if version is None:
        raise HTTPException(404, "version not found")

    # Restoring re-seeds the document state; the client applies the snapshot
    # locally and the server records a synthetic operation marking the reset
    # so other collaborators' undo/history stays consistent.
    return {"status": "restored", "snapshot": version.snapshot, "timestamp": version.timestamp}


@router.get("/api/projects/{project_id}/versions/diff")
async def diff_versions(project_id: UUID, from_id: UUID, to_id: UUID, user_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager, version_manager

    try:
        permission_manager.require(project_id, user_id, "read")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    diff = version_manager.diff(project_id, from_id, to_id)
    if diff is None:
        raise HTTPException(404, "one or both versions not found")
    return diff.model_dump(mode="json")


class BranchRequest(BaseModel):
    version_id: UUID


@router.post("/api/projects/{project_id}/versions/branch")
async def branch_version(project_id: UUID, body: BranchRequest, user_id: UUID = Depends(get_current_user_id)):
    from main import permission_manager, version_manager

    try:
        permission_manager.require(project_id, user_id, "write")
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    branched = version_manager.branch_from(project_id, body.version_id, user_id)
    if branched is None:
        raise HTTPException(404, "source version not found")
    return branched.model_dump(mode="json")
