"""[Claude.A8] Asset Manager - FastAPI routes.

Implements every endpoint listed in 08_ASSET_MANAGER_NEEDS.md /
contracts/API_CONTRACT.md. Auth/permission checks assume a `current_user`
dependency provided by the security subsystem (12_SECURITY_AUTH_NEEDS.md).
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import RedirectResponse

from models.asset import (
    AssetSearchParams,
    AssetType,
    AssetUpdatePatch,
    AssetUploadMetadata,
    PaginatedAssets,
)
from services.asset_manager import (
    AssetLimitExceededError,
    AssetLockedError,
    AssetManagerService,
    UnsupportedFileTypeError,
)
from services.search_service import SearchService

# These dependencies are wired up in the app factory (main.py) via
# dependency_overrides; declared here as callables for typing/documentation.
from dependencies import get_asset_service, get_current_user, get_search_service  # type: ignore

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=PaginatedAssets)
async def list_assets(
    folder: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None, description="comma-separated"),
    search: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None, description="comma-separated AssetType values"),
    sort: str = Query(default="date"),
    direction: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=60, ge=1, le=200),
    favoritedOnly: bool = Query(default=False),
    user=Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    params = AssetSearchParams(
        folderId=folder,
        tags=tags.split(",") if tags else None,
        query=search,
        types=[AssetType(t) for t in type.split(",")] if type else None,
        sort=sort,  # type: ignore[arg-type]
        direction=direction,  # type: ignore[arg-type]
        page=page,
        pageSize=pageSize,
        favoritedOnly=favoritedOnly,
    )
    assets, total = await search_service.search(user.project_id, params)
    return PaginatedAssets(
        assets=assets,
        total=total,
        page=page,
        pageSize=pageSize,
        hasMore=(page * pageSize) < total,
    )


@router.get("/search", response_model=PaginatedAssets)
async def search_assets(
    query: str = Query(...),
    types: Optional[str] = Query(default=None),
    tags: Optional[str] = Query(default=None),
    color: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=60, ge=1, le=200),
    user=Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service),
):
    if color:
        matches = await search_service.color_search(user.project_id, color)
        return PaginatedAssets(assets=matches, total=len(matches), page=1, pageSize=len(matches), hasMore=False)

    params = AssetSearchParams(
        query=query,
        types=[AssetType(t) for t in types.split(",")] if types else None,
        tags=tags.split(",") if tags else None,
        page=page,
        pageSize=pageSize,
    )
    assets, total = await search_service.search(user.project_id, params)
    return PaginatedAssets(
        assets=assets, total=total, page=page, pageSize=pageSize, hasMore=(page * pageSize) < total
    )


@router.get("/preview/{asset_id}")
async def get_preview(
    asset_id: str,
    size: int = Query(default=400),
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    asset = await asset_service.get_asset(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    match = next((p for p in asset.preview_sizes if p.size == size), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"No preview at size {size}")
    return RedirectResponse(url=match.url)


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    asset = await asset_service.get_asset(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    await asset_service.record_usage(asset_id)
    return asset


@router.post("", status_code=201)
async def upload_asset(
    file: UploadFile = File(...),
    metadata: str = Form(default="{}"),
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    try:
        parsed_metadata = AssetUploadMetadata.model_validate(json.loads(metadata))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {exc}") from exc

    data = await file.read()

    try:
        asset = await asset_service.upload_asset(
            user.project_id, user.id, file.filename or "untitled", data, parsed_metadata
        )
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except AssetLimitExceededError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return {"assetId": asset.id, "previewUrl": asset.preview_url}


@router.post("/batch-upload")
async def batch_upload(
    files: list[UploadFile] = File(...),
    folderId: Optional[str] = Form(default=None),
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    results = []
    errors = []
    for f in files:
        data = await f.read()
        try:
            asset = await asset_service.upload_asset(
                user.project_id,
                user.id,
                f.filename or "untitled",
                data,
                AssetUploadMetadata(folderId=folderId),
            )
            results.append(asset.id)
        except (UnsupportedFileTypeError, AssetLimitExceededError) as exc:
            errors.append({"file": f.filename, "error": str(exc)})

    return {"jobId": "sync-batch", "uploaded": results, "errors": errors}


@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    patch: AssetUpdatePatch,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    try:
        return await asset_service.update_asset(asset_id, patch, user.id)
    except AssetLockedError as exc:
        raise HTTPException(status_code=423, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    try:
        deleted = await asset_service.delete_asset(asset_id, user.id)
    except AssetLockedError as exc:
        raise HTTPException(status_code=423, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"deleted": True}


@router.post("/batch-delete")
async def batch_delete(
    body: dict,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    asset_ids = body.get("assetIds", [])
    deleted = []
    for asset_id in asset_ids:
        try:
            if await asset_service.delete_asset(asset_id, user.id):
                deleted.append(asset_id)
        except AssetLockedError:
            continue
    return {"deleted": deleted}


@router.post("/import-from-url")
async def import_from_url(
    body: dict,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    url = body.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    metadata_raw = body.get("metadata") or {}
    metadata = AssetUploadMetadata.model_validate(metadata_raw)

    stream = await asset_service.storage.stream_download(url)
    data = stream.read()
    filename = url.rsplit("/", 1)[-1] or "imported-asset"

    try:
        asset = await asset_service.upload_asset(user.project_id, user.id, filename, data, metadata)
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    return {"assetId": asset.id}


@router.get("/folders")
async def list_folders(
    projectId: str = Query(...),
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    async with asset_service.pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM asset_folders WHERE project_id = $1 ORDER BY name", projectId
        )
    return [dict(row) for row in rows]


@router.post("/folders", status_code=201)
async def create_folder(
    body: dict,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    return await asset_service.create_folder(
        body["projectId"], body["name"], body.get("parentId")
    )


@router.put("/folders/{folder_id}")
async def rename_folder(
    folder_id: str,
    body: dict,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    async with asset_service.pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE asset_folders SET name = $2 WHERE id = $1 RETURNING *",
            folder_id,
            body["name"],
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    return dict(row)


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    user=Depends(get_current_user),
    asset_service: AssetManagerService = Depends(get_asset_service),
):
    async with asset_service.pool.acquire() as conn:
        # Assets in a deleted folder move to the project root rather than
        # being deleted themselves.
        await conn.execute("UPDATE assets SET folder_id = NULL WHERE folder_id = $1", folder_id)
        result = await conn.execute("DELETE FROM asset_folders WHERE id = $1", folder_id)
    return {"deleted": result.endswith("1")}
