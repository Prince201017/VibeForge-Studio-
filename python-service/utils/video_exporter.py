# [V0.A7] Video export via ffmpeg subprocess — frames must be pre-rendered to a temp
# dir by the caller (headless-render service), this module owns the ffmpeg invocation,
# resource limits, and the <60s SLA enforcement via timeout.
from __future__ import annotations
import asyncio
import os
import tempfile
import shutil

from .base import Exporter, ExportJob, ExportResult

SUPPORTED_CODECS = {"mp4": "libx264", "webm": "libvpx-vp9"}


class VideoExportTimeout(Exception):
    pass


class VideoExporter(Exporter):
    format_name = "video"

    def validate_options(self, options: dict) -> None:
        fmt = options.get("format", "mp4")
        if fmt not in SUPPORTED_CODECS:
            raise ValueError(f"Unsupported video format: {fmt}")
        fps = options.get("fps", 30)
        if not (1 <= fps <= 120):
            raise ValueError("fps must be between 1 and 120")

    async def export(self, job: ExportJob, frames_dir: str | None = None) -> ExportResult:
        self.validate_options(job.options)
        if shutil.which("ffmpeg") is None:
            raise RuntimeError("ffmpeg is not installed on this host")

        fmt = job.options.get("format", "mp4")
        fps = job.options.get("fps", 30)
        codec = SUPPORTED_CODECS[fmt]

        with tempfile.TemporaryDirectory() as tmp:
            frames_src = frames_dir or tmp  # caller populates frame_%05d.png here
            out_path = os.path.join(tmp, f"out.{fmt}")

            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", os.path.join(frames_src, "frame_%05d.png"),
                "-c:v", codec,
                "-pix_fmt", "yuv420p",
                out_path,
            ]

            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            try:
                _, stderr = await asyncio.wait_for(proc.communicate(), timeout=55)
            except asyncio.TimeoutError:
                proc.kill()
                raise VideoExportTimeout("Video export exceeded the 60s SLA budget")

            if proc.returncode != 0:
                raise RuntimeError(f"ffmpeg failed: {stderr.decode(errors='ignore')[:500]}")

            with open(out_path, "rb") as f:
                file_bytes = f.read()

        return ExportResult(
            job_id=job.job_id,
            file_bytes=file_bytes,
            mime_type=f"video/{fmt}",
            filename=f"export_{job.job_id}.{fmt}",
        )
