"""
[V0.A7] Export API Routes
=========================
Implements exactly the 6 endpoints listed under "API Endpoints Required"
in 07_EXPORT_PIPELINE_NEEDS.md. Mounted at /api/export in main.py.

Auth: per 12_SECURITY_AUTH_NEEDS.md (Clerk) this should sit behind an
auth dependency that resolves `user_id` from the request; that dependency
isn't part of this handoff, so `get_current_user_id` below is a narrow
seam — swap its body for the real Clerk verification and every route
downstream is already wired to use whatever it returns.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from models.schemas import (
    CancelResponse, ExportRequest, FormatInfo, JobStatus, ProgressResponse, StartExportResponse,
)
from services.export_engine import engine

router = APIRouter(prefix="/api/export", tags=["export"])


async def get_current_user_id(request: Request) -> str:
    """Seam for real auth (see module docstring). Falls back to a header the
    frontend can set in dev, then to 'anonymous' so the router is runnable
    standalone."""
    return request.headers.get("x-user-id", "anonymous")


@router.post("/start", response_model=StartExportResponse)
async def start_export(payload: ExportRequest, user_id: str = Depends(get_current_user_id)):
    try:
        job = await engine.start(payload, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    fps = payload.fps or payload.project.fps
    estimated_sec = max(1.0, job.total_frames / fps * 1.4)  # rough render+encode multiplier
    return StartExportResponse(job_id=job.job_id, estimated_time_sec=round(estimated_sec, 1))


@router.get("/progress/{job_id}", response_model=ProgressResponse)
async def get_progress(job_id: str):
    job = engine.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return ProgressResponse(
        job_id=job.job_id, status=job.status, percent_complete=job.percent_complete,
        current_frame=job.current_frame, total_frames=job.total_frames,
        time_remaining_sec=job.time_remaining_sec, error=job.error,
    )


@router.post("/cancel/{job_id}", response_model=CancelResponse)
async def cancel_export(job_id: str):
    job = await engine.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return CancelResponse(job_id=job.job_id, status=job.status)


@router.get("/download/{job_id}")
async def download_export(job_id: str):
    job = engine.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    if job.status != JobStatus.COMPLETE or not job.output_path:
        raise HTTPException(status_code=409, detail=f"job is {job.status.value}, not ready for download")
    path = Path(job.output_path)
    if not path.exists():
        raise HTTPException(status_code=410, detail="export file has been cleaned up")
    return FileResponse(path, filename=path.name)


@router.get("/history")
async def get_history(limit: int = 50):
    return [j.model_dump(mode="json") for j in engine.history(limit=limit)]


@router.post("/convert/{job_id}")
async def convert_export(job_id: str, target_format: str, width: int | None = None, height: int | None = None):
    """Format Conversion (§12): re-encode an already-completed export to a
    different container/codec without re-rendering the animation."""
    job = engine.get(job_id)
    if job is None or job.status != JobStatus.COMPLETE or not job.output_path:
        raise HTTPException(status_code=409, detail="source job is not a completed export")

    from services.format_conversion import _IMAGE_EXT, _VIDEO_EXT, convert_image, convert_video

    src = Path(job.output_path)
    resolution = (width, height) if width and height else None
    try:
        if src.suffix in _VIDEO_EXT:
            out = convert_video(src, target_format, resolution=resolution)
        elif src.suffix in _IMAGE_EXT:
            out = convert_image(src, target_format, resolution=resolution)
        else:
            raise HTTPException(status_code=400, detail=f"conversion not supported for {src.suffix} sources")
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"path": str(out), "size_bytes": out.stat().st_size, "download": f"/api/export/download/{job_id}?converted={out.name}"}


@router.get("/formats", response_model=list[FormatInfo])
async def list_formats():
    from services.format_registry import FORMAT_CATALOG
    return FORMAT_CATALOG
