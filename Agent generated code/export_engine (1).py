"""
[V0.A7] Export Engine Core
==========================
Job queue, progress tracking, cancellation, retry logic, export history,
and temp-file cleanup. Everything else in the pipeline (video_export,
image_export, code_export, ...) plugs into this as a "handler" — a plain
async function of (job, request, progress_cb) -> ExportResult.

Concurrency model: an asyncio.Semaphore caps concurrent exports per the
spec's "Concurrent exports: 5 max per user" constraint. Each job runs as
an asyncio.Task so /api/export/progress/{job_id} can poll a live in-memory
ExportJob while the encode happens off to the side (video/image work is
delegated to a thread pool since ffmpeg/Pillow calls are blocking).

Swap `_JOBS` / `_HISTORY` for a real DB-backed store (see 11_DATABASE_
SCHEMA_NEEDS.md — not provided in this handoff) before shipping; this
in-memory version is intentionally simple so the queueing *logic* is easy
to review and unit test.
"""
from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
import time
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Awaitable, Callable, Optional

from models.schemas import ExportJob, ExportRequest, JobStatus
from services.performance_monitor import SLA_SECONDS, measure

logger = logging.getLogger("export_engine")

MAX_CONCURRENT_EXPORTS_PER_USER = 5
EXPORT_TIMEOUT_SEC = 5 * 60
MAX_RETRIES = 2
HISTORY_LIMIT = 200

ProgressCallback = Callable[[float, int, int], None]


@dataclass
class ExportResult:
    output_path: Path
    file_size_bytes: int
    extra: dict = field(default_factory=dict)


ExportHandler = Callable[[ExportRequest, ProgressCallback], Awaitable[ExportResult]]


class ExportEngine:
    """Singleton-ish coordinator. Instantiate once per process."""

    def __init__(self, work_dir: Optional[Path] = None):
        self.work_dir = work_dir or Path(tempfile.mkdtemp(prefix="forgeos_export_"))
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: dict[str, ExportJob] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._history: list[ExportJob] = []
        self._handlers: dict[str, ExportHandler] = {}
        # per-user semaphores, created lazily
        self._user_semaphores: dict[str, asyncio.Semaphore] = {}

    # -- handler registry ----------------------------------------------
    def register(self, format_key: str, handler: ExportHandler) -> None:
        self._handlers[format_key] = handler

    def _semaphore_for(self, user_id: str) -> asyncio.Semaphore:
        if user_id not in self._user_semaphores:
            self._user_semaphores[user_id] = asyncio.Semaphore(MAX_CONCURRENT_EXPORTS_PER_USER)
        return self._user_semaphores[user_id]

    # -- public API -------------------------------------------------------
    async def start(self, request: ExportRequest, user_id: str = "anonymous") -> ExportJob:
        handler = self._handlers.get(request.format.value)
        if handler is None:
            raise ValueError(f"No exporter registered for format={request.format.value!r}")

        job = ExportJob(format=request.format, status=JobStatus.QUEUED)
        job.total_frames = self._estimate_frame_count(request)
        self._jobs[job.job_id] = job

        task = asyncio.create_task(self._run(job, request, handler, user_id))
        self._tasks[job.job_id] = task
        return job

    def get(self, job_id: str) -> Optional[ExportJob]:
        return self._jobs.get(job_id) or next((j for j in self._history if j.job_id == job_id), None)

    async def cancel(self, job_id: str) -> Optional[ExportJob]:
        job = self._jobs.get(job_id)
        if job is None:
            return None
        task = self._tasks.get(job_id)
        if task and not task.done():
            task.cancel()
        job.status = JobStatus.CANCELLED
        self._retire(job)
        return job

    def history(self, limit: int = 50) -> list[ExportJob]:
        return sorted(self._history, key=lambda j: j.created_at, reverse=True)[:limit]

    def cleanup_temp_files(self, older_than_sec: float = 3600) -> int:
        """Resource cleanup sweep — call from a periodic background task."""
        removed = 0
        now = time.time()
        for p in self.work_dir.glob("*"):
            try:
                if now - p.stat().st_mtime > older_than_sec:
                    if p.is_dir():
                        shutil.rmtree(p, ignore_errors=True)
                    else:
                        p.unlink(missing_ok=True)
                    removed += 1
            except OSError:
                continue
        return removed

    # -- internals ----------------------------------------------------
    async def _run(self, job: ExportJob, request: ExportRequest, handler: ExportHandler, user_id: str) -> None:
        sem = self._semaphore_for(user_id)
        async with sem:
            job.status = JobStatus.RUNNING
            job.started_at = _utcnow()
            start_t = time.monotonic()

            def progress_cb(percent: float, current_frame: int, total_frames: int) -> None:
                job.percent_complete = max(0.0, min(100.0, percent))
                job.current_frame = current_frame
                job.total_frames = total_frames or job.total_frames
                elapsed = time.monotonic() - start_t
                if percent > 1:
                    job.time_remaining_sec = elapsed * (100 - percent) / percent
                else:
                    job.time_remaining_sec = None

            attempt = 0
            while True:
                try:
                    with measure(f"export:{request.format.value}", _sla_key_for(request)) as bench:
                        result = await asyncio.wait_for(
                            handler(request, progress_cb), timeout=EXPORT_TIMEOUT_SEC
                        )
                    result.output_path = _embed_metadata_safe(result.output_path, request)
                    job.output_path = str(result.output_path)
                    job.file_size_bytes = result.file_size_bytes
                    job.percent_complete = 100.0
                    job.status = JobStatus.COMPLETE
                    job.finished_at = _utcnow()
                    job.benchmark = {
                        "duration_sec": round(bench.duration_sec, 3),
                        "peak_rss_mb": round(bench.peak_rss_mb, 1),
                    }
                    if request.storage.destination != "local":
                        job.output_url = await _upload_safe(result.output_path, request, job)
                    break
                except asyncio.CancelledError:
                    job.status = JobStatus.CANCELLED
                    job.finished_at = _utcnow()
                    raise
                except asyncio.TimeoutError:
                    job.error = f"Export exceeded {EXPORT_TIMEOUT_SEC}s timeout"
                    job.status = JobStatus.FAILED
                    job.finished_at = _utcnow()
                    logger.error("export %s timed out", job.job_id)
                    break
                except Exception as exc:  # noqa: BLE001 - surfaced to the user via job.error
                    attempt += 1
                    job.retries = attempt
                    logger.warning("export %s failed (attempt %d): %s", job.job_id, attempt, exc)
                    if attempt > MAX_RETRIES:
                        job.error = f"{type(exc).__name__}: {exc}"
                        job.status = JobStatus.FAILED
                        job.finished_at = _utcnow()
                        logger.error("export %s exhausted retries:\n%s", job.job_id, traceback.format_exc())
                        break
                    await asyncio.sleep(min(2 ** attempt, 8))  # backoff, then retry loop continues

            self._retire(job)

    def _retire(self, job: ExportJob) -> None:
        self._jobs.pop(job.job_id, None)
        self._tasks.pop(job.job_id, None)
        self._history.append(job)
        if len(self._history) > HISTORY_LIMIT:
            self._history.pop(0)

    @staticmethod
    def _estimate_frame_count(request: ExportRequest) -> int:
        fps = request.fps or request.project.fps
        fr = request.frame_range
        if fr.mode == "current_frame":
            return 1
        if fr.mode == "range" and fr.start_ms is not None and fr.end_ms is not None:
            duration = max(0.0, fr.end_ms - fr.start_ms)
        else:
            duration = request.project.duration_ms
        return max(1, round(duration / 1000 * fps))


def _sla_key_for(request: ExportRequest) -> Optional[str]:
    from models.schemas import CODE_FORMATS, IMAGE_SEQ_FORMATS, VIDEO_FORMATS

    fmt = request.format
    if fmt.value == "lottie":
        return "lottie_export"
    if fmt in CODE_FORMATS:
        return "code_export"
    if fmt in VIDEO_FORMATS:
        duration_s = request.project.duration_ms / 1000
        return "video_60s" if duration_s > 30 else "video_10s"
    if fmt in IMAGE_SEQ_FORMATS:
        return "image_sequence_1000_frames"
    return None


def _embed_metadata_safe(path: Path, request: ExportRequest):
    try:
        from services.metadata_export import embed_metadata
        return embed_metadata(path, request.format, request.metadata)
    except Exception as exc:  # noqa: BLE001 - metadata is best-effort, never fail the export over it
        logger.warning("metadata embedding skipped for %s: %s", path, exc)
        return path


async def _upload_safe(path: Path, request: ExportRequest, job: ExportJob) -> Optional[str]:
    try:
        from services.storage_export import upload
        result = await upload(path, request.storage)
        job.storage_destination = request.storage.destination
        job.storage_provider_ref = result.provider_ref
        job.storage_public = request.storage.public
        return result.url
    except Exception as exc:  # noqa: BLE001 - storage upload failure shouldn't fail a *completed* export
        logger.warning("storage upload skipped for %s: %s", path, exc)
        return None


def _utcnow():
    from datetime import UTC, datetime
    return datetime.now(UTC)


# module-level singleton used by routes/export.py
engine = ExportEngine()
