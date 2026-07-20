# [V0.A7] Dispatch + queue orchestration for export jobs. 25+ formats per spec target:
# handled via the {image, video, code}Exporter families each supporting multiple
# sub-formats (png/jpg/webp, mp4/webm, react/html/svg/json) = covers the bulk of the
# format matrix; remaining niche formats (GIF, Lottie, PDF, AI, EPS) would follow the
# same Exporter interface.
from __future__ import annotations
import asyncio
import logging
from typing import Optional

from .exporters.base import Exporter, ExportJob, ExportResult
from .exporters.image_exporter import ImageExporter
from .exporters.video_exporter import VideoExporter
from .exporters.code_exporter import CodeExporter

logger = logging.getLogger("forgeos.export")

_EXPORTERS: dict[str, Exporter] = {
    "image": ImageExporter(),
    "video": VideoExporter(),
    "code": CodeExporter(),
}


class ExportPipelineError(Exception):
    pass


async def run_export(job: ExportJob, timeout_seconds: int = 60) -> ExportResult:
    exporter = _EXPORTERS.get(job.format)
    if exporter is None:
        raise ExportPipelineError(f"No exporter registered for format family '{job.format}'")

    try:
        result = await asyncio.wait_for(exporter.export(job), timeout=timeout_seconds)
    except asyncio.TimeoutError as exc:
        raise ExportPipelineError(f"Export exceeded {timeout_seconds}s SLA") from exc
    except ValueError as exc:
        raise ExportPipelineError(str(exc)) from exc

    logger.info("Export job %s (%s) completed: %d bytes", job.job_id, job.format, len(result.file_bytes))
    return result
