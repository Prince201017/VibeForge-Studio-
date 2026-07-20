# [Claude.A8] Thumbnail generation for image/video assets.
from __future__ import annotations
import io
from PIL import Image

MAX_THUMB_SIZE = (256, 256)


def generate_image_thumbnail(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail(MAX_THUMB_SIZE)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def generate_video_thumbnail_frame_extract_cmd(video_path: str, output_path: str, at_seconds: float = 1.0) -> list[str]:
    """Returns the ffmpeg command to extract a thumbnail frame; caller runs it via
    the same asyncio.subprocess pattern as 07-export-pipeline/video_exporter.py."""
    return [
        "ffmpeg", "-y", "-ss", str(at_seconds), "-i", video_path,
        "-vframes", "1", "-vf", f"scale={MAX_THUMB_SIZE[0]}:-1", output_path,
    ]
