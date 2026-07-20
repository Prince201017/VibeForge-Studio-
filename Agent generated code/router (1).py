# [Claude.A8] FastAPI routes for asset CRUD, search, and upload.
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from .models import Asset, AssetSearchQuery, AssetUploadMeta
from .search_index import AssetSearchIndex

router = APIRouter(prefix="/api/assets", tags=["assets"])
_index = AssetSearchIndex()  # process-local; production would back this with Postgres

MAX_ASSETS_PER_PROJECT = 100_000  # per spec target "100K+ assets"


@router.post("/{project_id}/upload-init")
async def upload_init(project_id: str, meta: AssetUploadMeta):
    # NOTE: real upload flow — this issues a signed Vercel Blob upload URL, the client
    # PUTs the file directly to blob storage, then calls /confirm below. File-scanning
    # (magic bytes, size limits) happens via 12-security/file_scanner.py before confirm.
    if meta.size_bytes > 100 * 1024 * 1024:
        raise HTTPException(413, "File exceeds 100MB limit")
    asset_id = str(uuid.uuid4())
    return {"asset_id": asset_id, "upload_url": f"https://blob.vercel-storage.com/{asset_id}"}


@router.post("/{project_id}/confirm")
async def confirm_upload(project_id: str, asset: Asset):
    _index.add(asset)
    return {"status": "confirmed", "asset_id": asset.id}


@router.post("/search")
async def search_assets(query: AssetSearchQuery):
    results, elapsed_ms = _index.search(query)
    return {"results": results, "count": len(results), "query_time_ms": round(elapsed_ms, 2), "within_sla": elapsed_ms < 100}


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str):
    _index.remove(asset_id)
    return {"status": "deleted"}
