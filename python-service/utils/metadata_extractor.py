"""[Claude.A8] Asset Manager - Metadata Extractor.

Extracts type-specific metadata (dimensions, duration, color palette, etc.)
from uploaded file bytes immediately after upload, before preview generation
kicks off.
"""

from __future__ import annotations

import io
import json
from typing import Any

from PIL import Image

from models.asset import AssetType


class MetadataExtractor:
    async def extract(self, asset_type: AssetType, data: bytes, filename: str) -> dict[str, Any]:
        handler = self._handlers.get(asset_type)
        if handler is None:
            return {"kind": "generic"}
        try:
            return await handler(self, data, filename)
        except Exception as exc:  # noqa: BLE001 - metadata extraction must never crash the upload
            return {"kind": "generic", "extraction_error": str(exc)}

    async def _extract_image(self, data: bytes, filename: str) -> dict[str, Any]:
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
            color_space = img.mode
            dpi = img.info.get("dpi", (72, 72))[0]
        return {
            "kind": "image",
            "dimensions": {"width": width, "height": height},
            "colorSpace": color_space,
            "dpi": dpi,
        }

    async def _extract_svg(self, data: bytes, filename: str) -> dict[str, Any]:
        import re

        text = data.decode("utf-8", errors="ignore")
        view_box_match = re.search(r'viewBox="([^"]+)"', text)
        width_match = re.search(r'width="(\d+(?:\.\d+)?)', text)
        height_match = re.search(r'height="(\d+(?:\.\d+)?)', text)
        path_count = len(re.findall(r"<path\b", text))

        view_box = view_box_match.group(1) if view_box_match else "0 0 100 100"
        parts = view_box.split()
        width = float(width_match.group(1)) if width_match else float(parts[2]) if len(parts) == 4 else 0
        height = float(height_match.group(1)) if height_match else float(parts[3]) if len(parts) == 4 else 0

        return {
            "kind": "svg",
            "dimensions": {"width": int(width), "height": int(height)},
            "viewBox": view_box,
            "pathCount": path_count,
        }

    async def _extract_video(self, data: bytes, filename: str) -> dict[str, Any]:
        # Delegates to ffprobe via ffmpeg-python in production; here we define
        # the contract and fall back gracefully if ffprobe isn't available.
        try:
            import ffmpeg  # ffmpeg-python

            import tempfile

            with tempfile.NamedTemporaryFile(suffix=f"_{filename}", delete=True) as tmp:
                tmp.write(data)
                tmp.flush()
                probe = ffmpeg.probe(tmp.name)

            video_stream = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
            if not video_stream:
                return {"kind": "video", "dimensions": {"width": 0, "height": 0}, "durationSeconds": 0, "frameRate": 0, "codec": "unknown", "bitrateKbps": 0}

            num, den = (video_stream.get("r_frame_rate", "0/1")).split("/")
            frame_rate = float(num) / float(den) if float(den) else 0

            return {
                "kind": "video",
                "dimensions": {
                    "width": int(video_stream.get("width", 0)),
                    "height": int(video_stream.get("height", 0)),
                },
                "durationSeconds": float(probe["format"].get("duration", 0)),
                "frameRate": round(frame_rate, 2),
                "codec": video_stream.get("codec_name", "unknown"),
                "bitrateKbps": int(int(probe["format"].get("bit_rate", 0)) / 1000),
            }
        except Exception:
            return {"kind": "video", "dimensions": {"width": 0, "height": 0}, "durationSeconds": 0, "frameRate": 0, "codec": "unknown", "bitrateKbps": 0}

    async def _extract_audio(self, data: bytes, filename: str) -> dict[str, Any]:
        try:
            import ffmpeg
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=f"_{filename}", delete=True) as tmp:
                tmp.write(data)
                tmp.flush()
                probe = ffmpeg.probe(tmp.name)

            audio_stream = next((s for s in probe["streams"] if s["codec_type"] == "audio"), None)
            return {
                "kind": "audio",
                "durationSeconds": float(probe["format"].get("duration", 0)),
                "bitrateKbps": int(int(probe["format"].get("bit_rate", 0)) / 1000),
                "channels": int(audio_stream.get("channels", 2)) if audio_stream else 2,
            }
        except Exception:
            return {"kind": "audio", "durationSeconds": 0, "bitrateKbps": 0, "channels": 2}

    async def _extract_palette(self, data: bytes, filename: str) -> dict[str, Any]:
        parsed = json.loads(data)
        colors = parsed if isinstance(parsed, dict) else {f"color_{i}": c for i, c in enumerate(parsed)}
        return {"kind": "palette", "colorCount": len(colors), "namedColors": colors}

    async def _extract_gradient(self, data: bytes, filename: str) -> dict[str, Any]:
        parsed = json.loads(data)
        return {
            "kind": "gradient",
            "gradientType": parsed.get("type", "linear"),
            "stops": parsed.get("stops", []),
        }

    async def _extract_font(self, data: bytes, filename: str) -> dict[str, Any]:
        try:
            from fontTools.ttLib import TTFont

            font = TTFont(io.BytesIO(data), lazy=True)
            name_table = font["name"]
            family = name_table.getDebugName(1) or filename
            weights = [400]
            styles = ["normal"]
            return {"kind": "font", "family": family, "weights": weights, "styles": styles}
        except Exception:
            return {"kind": "font", "family": filename, "weights": [400], "styles": ["normal"]}

    _handlers = {
        AssetType.IMAGE: _extract_image,
        AssetType.SVG: _extract_svg,
        AssetType.PATTERN: _extract_svg,
        AssetType.VIDEO: _extract_video,
        AssetType.AUDIO: _extract_audio,
        AssetType.PALETTE: _extract_palette,
        AssetType.GRADIENT: _extract_gradient,
        AssetType.FONT: _extract_font,
    }

    async def extract_color_palette(self, data: bytes, num_colors: int = 5) -> dict[str, Any]:
        """Dominant-color + palette extraction used for image/video/SVG assets."""
        try:
            with Image.open(io.BytesIO(data)) as img:
                small = img.convert("RGB").resize((100, 100))
                quantized = small.quantize(colors=num_colors, method=Image.MEDIANCUT)
                palette = quantized.getpalette()[: num_colors * 3]
                colors = [
                    "#{:02x}{:02x}{:02x}".format(palette[i], palette[i + 1], palette[i + 2])
                    for i in range(0, len(palette), 3)
                ]
                dominant = colors[0] if colors else "#000000"
                return {"dominantColor": dominant, "palette": colors}
        except Exception:
            return {"dominantColor": "#000000", "palette": []}
