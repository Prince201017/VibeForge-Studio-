"""
[V0.A7] Format Conversion (§12)
===============================
Operates on an *already-exported* file (or any file the user uploads to
convert) rather than re-rendering from ProjectData — that's the
distinction from the format-specific exporters above. Used by the
"convert this export to a different format" flow in the Export History
panel (re-encode a finished MP4 to WebM without re-rendering all frames,
convert a finished PNG sequence to AVIF, etc).
"""
from __future__ import annotations

import shutil
import subprocess
import time
import zipfile
from pathlib import Path

from PIL import Image

from services.export_engine import engine

_VIDEO_EXT = {".mp4", ".webm", ".mov", ".mkv", ".avi"}
_IMAGE_EXT = {".png", ".webp", ".avif", ".tiff", ".jpg", ".jpeg"}


def detect_format(path: Path) -> str:
    """Format auto-detection: sniff by extension first, then magic bytes as
    a fallback for extension-less uploads."""
    ext = path.suffix.lower()
    if ext:
        return ext.lstrip(".")
    head = path.read_bytes()[:12]
    if head.startswith(b"\x89PNG"):
        return "png"
    if head[4:8] == b"ftyp":
        return "mp4"
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "webp"
    if head.startswith(b"GIF8"):
        return "gif"
    raise ValueError(f"could not detect format for {path.name}: unrecognized header {head!r}")


def convert_video(src: Path, target_ext: str, *, resolution: tuple[int, int] | None = None,
                   fps: int | None = None, aspect_mode: str = "pad") -> Path:
    """Codec transcoding + resolution/frame-rate/aspect-ratio conversion for
    an existing video file."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found on PATH")

    out_path = engine.work_dir / f"converted_{time.time_ns()}.{target_ext}"
    cmd = [ffmpeg, "-y", "-i", str(src)]

    vf_filters = []
    if resolution:
        w, h = resolution
        if aspect_mode == "pad":
            vf_filters.append(f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2")
        elif aspect_mode == "crop":
            vf_filters.append(f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}")
        else:  # stretch
            vf_filters.append(f"scale={w}:{h}")
    if vf_filters:
        cmd += ["-vf", ",".join(vf_filters)]
    if fps:
        cmd += ["-r", str(fps)]

    codec_map = {"mp4": "libx264", "webm": "libvpx-vp9", "mov": "prores_ks", "mkv": "libx265", "avi": "mpeg4"}
    if target_ext in codec_map:
        cmd += ["-c:v", codec_map[target_ext]]
    cmd.append(str(out_path))

    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr.decode(errors='ignore')[-1500:]}")
    return out_path


def convert_image(src: Path, target_ext: str, *, quality: int = 90,
                   resolution: tuple[int, int] | None = None) -> Path:
    """Single-image / single-frame format + resolution conversion (color
    space conversion beyond sRGB is out of scope without an ICC-aware
    pipeline; Pillow's built-in convert() handles mode, not calibrated
    color spaces)."""
    img = Image.open(src)
    if resolution:
        img = img.resize(resolution, Image.LANCZOS)

    out_path = engine.work_dir / f"converted_{time.time_ns()}.{target_ext}"
    save_kwargs: dict = {}
    fmt_name = {"jpg": "JPEG", "jpeg": "JPEG"}.get(target_ext, target_ext.upper())
    if fmt_name == "JPEG":
        img = img.convert("RGB")
        save_kwargs["quality"] = quality
    elif fmt_name in ("WEBP", "AVIF"):
        save_kwargs["quality"] = quality
    img.save(out_path, format=fmt_name, **save_kwargs)
    return out_path


def convert_png_sequence_zip(src_zip: Path, target_ext: str, quality: int = 90) -> Path:
    """Convert every frame inside a PNG-sequence export bundle (a .zip, per
    image_export.py's output) to another image format, re-zipped."""
    work = engine.work_dir / f"seq_convert_{time.time_ns()}"
    work.mkdir(parents=True)
    with zipfile.ZipFile(src_zip) as zf:
        zf.extractall(work)

    for frame in sorted(work.glob("*.png")):
        converted = convert_image(frame, target_ext, quality=quality)
        shutil.move(str(converted), str(frame.with_suffix(f".{target_ext}")))
        frame.unlink()

    archive_path = Path(shutil.make_archive(str(work), "zip", root_dir=work))
    shutil.rmtree(work, ignore_errors=True)
    return archive_path
