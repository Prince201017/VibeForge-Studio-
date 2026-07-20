# [V0.A7] Raster export (PNG/JPG/WebP) — renders scene via a headless renderer call.
# Actual pixel rendering is delegated to the frontend's viewport-renderer (05) via a
# headless browser render service; this module owns format conversion + validation.
from __future__ import annotations
import io
from PIL import Image

from .base import Exporter, ExportJob, ExportResult

SUPPORTED_FORMATS = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


class ImageExporter(Exporter):
    format_name = "image"

    def validate_options(self, options: dict) -> None:
        fmt = options.get("format", "png")
        if fmt not in SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported image format: {fmt}")
        width = options.get("width", 1920)
        height = options.get("height", 1080)
        if not (1 <= width <= 8192 and 1 <= height <= 8192):
            raise ValueError("Image dimensions must be between 1 and 8192px")

    async def export(self, job: ExportJob) -> ExportResult:
        self.validate_options(job.options)
        fmt = job.options.get("format", "png")
        width = job.options.get("width", 1920)
        height = job.options.get("height", 1080)

        # Placeholder raster: real pipeline calls the headless-render service which
        # runs the actual viewport renderer (05) and returns raw pixels. Here we
        # produce a correctly-formatted, correctly-sized blank canvas so the format
        # conversion / validation code path is real and testable end-to-end.
        img = Image.new("RGBA" if fmt == "png" else "RGB", (width, height), (255, 255, 255, 0))
        buf = io.BytesIO()
        pil_format = {"png": "PNG", "jpg": "JPEG", "webp": "WEBP"}[fmt]
        img.save(buf, format=pil_format, quality=job.options.get("quality", 90))

        return ExportResult(
            job_id=job.job_id,
            file_bytes=buf.getvalue(),
            mime_type=SUPPORTED_FORMATS[fmt],
            filename=f"export_{job.job_id}.{fmt}",
        )
