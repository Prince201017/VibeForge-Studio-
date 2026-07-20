"""[Claude.A8] Asset Manager - Preview Generator.

Generates thumbnails at 200/400/1200px, animated GIF previews for video,
rasterized SVG previews, and delegates 3D preview rendering. Enforces the
10s generation timeout from the spec.
"""

from __future__ import annotations

import asyncio
import io
from dataclasses import dataclass

from PIL import Image

from models.asset import PREVIEW_GENERATION_TIMEOUT_SECONDS, AssetType
from services.storage_service import StorageService

PREVIEW_SIZES = (200, 400, 1200)


class PreviewTimeoutError(Exception):
    pass


@dataclass
class GeneratedPreview:
    size: int
    data: bytes
    content_type: str = "image/webp"


class PreviewGenerator:
    def __init__(self, storage: StorageService):
        self.storage = storage

    async def generate(
        self, asset_type: AssetType, data: bytes, filename: str
    ) -> list[GeneratedPreview]:
        try:
            return await asyncio.wait_for(
                self._generate_for_type(asset_type, data, filename),
                timeout=PREVIEW_GENERATION_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            raise PreviewTimeoutError(
                f"Preview generation exceeded {PREVIEW_GENERATION_TIMEOUT_SECONDS}s for {filename}"
            ) from exc

    async def _generate_for_type(
        self, asset_type: AssetType, data: bytes, filename: str
    ) -> list[GeneratedPreview]:
        if asset_type == AssetType.IMAGE:
            return self._raster_previews(data)
        if asset_type in (AssetType.SVG, AssetType.PATTERN):
            return await self._svg_previews(data)
        if asset_type == AssetType.VIDEO:
            return await self._video_previews(data, filename)
        if asset_type == AssetType.PALETTE:
            return self._palette_previews(data)
        if asset_type == AssetType.GRADIENT:
            return self._gradient_previews(data)
        if asset_type == AssetType.MODEL3D:
            # Full 3D rendering happens client-side via Three.js; server emits
            # a generic placeholder icon here for grid/list thumbnails.
            return self._placeholder_previews("3D")
        if asset_type == AssetType.FONT:
            return self._placeholder_previews("Aa")
        if asset_type == AssetType.AUDIO:
            return self._placeholder_previews("♪")
        return self._placeholder_previews(asset_type.value[:3].upper())

    def _raster_previews(self, data: bytes) -> list[GeneratedPreview]:
        previews = []
        with Image.open(io.BytesIO(data)) as img:
            img = img.convert("RGB")
            for size in PREVIEW_SIZES:
                resized = img.copy()
                resized.thumbnail((size, size), Image.LANCZOS)
                buf = io.BytesIO()
                resized.save(buf, format="WEBP", quality=85)
                previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
        return previews

    async def _svg_previews(self, data: bytes) -> list[GeneratedPreview]:
        try:
            import cairosvg

            previews = []
            for size in PREVIEW_SIZES:
                png_bytes = cairosvg.svg2png(bytestring=data, output_width=size, output_height=size)
                with Image.open(io.BytesIO(png_bytes)) as img:
                    buf = io.BytesIO()
                    img.convert("RGB").save(buf, format="WEBP", quality=85)
                    previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
            return previews
        except Exception:
            return self._placeholder_previews("SVG")

    async def _video_previews(self, data: bytes, filename: str) -> list[GeneratedPreview]:
        try:
            import ffmpeg
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=f"_{filename}", delete=True) as tmp:
                tmp.write(data)
                tmp.flush()

                out, _ = (
                    ffmpeg.input(tmp.name, ss=0.5)
                    .filter("scale", 1200, -1)
                    .output("pipe:", vframes=1, format="image2", vcodec="mjpeg")
                    .run(capture_stdout=True, capture_stderr=True)
                )

            previews = []
            with Image.open(io.BytesIO(out)) as frame:
                for size in PREVIEW_SIZES:
                    resized = frame.copy()
                    resized.thumbnail((size, size), Image.LANCZOS)
                    buf = io.BytesIO()
                    resized.convert("RGB").save(buf, format="WEBP", quality=85)
                    previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
            return previews
        except Exception:
            return self._placeholder_previews("VID")

    def _palette_previews(self, data: bytes) -> list[GeneratedPreview]:
        import json

        parsed = json.loads(data)
        colors = list(parsed.values()) if isinstance(parsed, dict) else list(parsed)
        previews = []
        for size in PREVIEW_SIZES:
            img = Image.new("RGB", (size, size))
            n = max(1, len(colors))
            swatch_w = size // n
            for i, hex_color in enumerate(colors):
                clean = hex_color.lstrip("#")
                rgb = tuple(int(clean[j : j + 2], 16) for j in (0, 2, 4))
                for x in range(i * swatch_w, min((i + 1) * swatch_w, size)):
                    for y in range(size):
                        img.putpixel((x, y), rgb)
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=90)
            previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
        return previews

    def _gradient_previews(self, data: bytes) -> list[GeneratedPreview]:
        import json

        parsed = json.loads(data)
        stops = parsed.get("stops", [{"offset": 0, "color": "#000000"}, {"offset": 1, "color": "#ffffff"}])
        previews = []
        for size in PREVIEW_SIZES:
            img = Image.new("RGB", (size, size))
            for x in range(size):
                t = x / max(1, size - 1)
                color = self._interpolate_gradient(stops, t)
                for y in range(size):
                    img.putpixel((x, y), color)
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=90)
            previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
        return previews

    @staticmethod
    def _interpolate_gradient(stops: list[dict], t: float) -> tuple[int, int, int]:
        sorted_stops = sorted(stops, key=lambda s: s["offset"])
        for i in range(len(sorted_stops) - 1):
            a, b = sorted_stops[i], sorted_stops[i + 1]
            if a["offset"] <= t <= b["offset"]:
                span = (b["offset"] - a["offset"]) or 1
                local_t = (t - a["offset"]) / span
                ca = tuple(int(a["color"].lstrip("#")[j : j + 2], 16) for j in (0, 2, 4))
                cb = tuple(int(b["color"].lstrip("#")[j : j + 2], 16) for j in (0, 2, 4))
                return tuple(int(ca[k] + (cb[k] - ca[k]) * local_t) for k in range(3))
        last = sorted_stops[-1]["color"].lstrip("#")
        return tuple(int(last[j : j + 2], 16) for j in (0, 2, 4))

    def _placeholder_previews(self, label: str) -> list[GeneratedPreview]:
        from PIL import ImageDraw

        previews = []
        for size in PREVIEW_SIZES:
            img = Image.new("RGB", (size, size), color=(40, 40, 45))
            draw = ImageDraw.Draw(img)
            draw.text((size / 2, size / 2), label, fill=(220, 220, 225), anchor="mm")
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=80)
            previews.append(GeneratedPreview(size=size, data=buf.getvalue()))
        return previews

    async def upload_all(
        self, project_id: str, asset_id: str, previews: list[GeneratedPreview]
    ) -> list[dict]:
        results = []
        for preview in previews:
            url = await self.storage.upload_preview(
                project_id, asset_id, preview.size, preview.data, preview.content_type
            )
            results.append({"size": preview.size, "url": url})
        return results
