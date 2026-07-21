"""
[V0.A7] Sprite Sheet Export
===========================
Renders every frame (via frame_renderer) and packs them into one PNG atlas
using a simple shelf/row packer, plus a JSON metadata file mapping frame
index -> {x, y, w, h, duration_ms} in the common Texture Packer-ish shape
most game engines (Phaser, PixiJS, Unity) can import directly.
"""
from __future__ import annotations

import asyncio
import json
import math
import time

from PIL import Image

from models.schemas import ExportFormat, ExportRequest
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import RenderConfig, render_frame


async def export_sprite_sheet(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    project = request.project
    width, height = request.resolution or (project.width, project.height)
    fps = request.fps or project.fps
    total_frames = engine._estimate_frame_count(request)

    cols = math.ceil(math.sqrt(total_frames))
    rows = math.ceil(total_frames / cols)
    atlas = Image.new("RGBA", (cols * width, rows * height), (0, 0, 0, 0))

    render_cfg = RenderConfig(width=width, height=height, background=project.background)
    fr = request.frame_range
    start_ms = fr.current_frame_ms if fr.mode == "current_frame" else (fr.start_ms or 0.0)

    loop = asyncio.get_running_loop()
    frame_meta = []
    for i in range(total_frames):
        t_ms = start_ms + (i / fps) * 1000
        frame = await loop.run_in_executor(None, render_frame, project, t_ms, render_cfg)
        col, row = i % cols, i // cols
        x, y = col * width, row * height
        atlas.paste(frame, (x, y), frame)
        frame_meta.append({"frame": i, "x": x, "y": y, "w": width, "h": height, "duration_ms": round(1000 / fps, 3)})
        progress_cb((i + 1) / total_frames * 90, i + 1, total_frames)

    png_path = engine.work_dir / f"spritesheet_{time.time_ns()}.png"
    atlas.save(png_path, format="PNG", optimize=True)

    if request.format == ExportFormat.SPRITE_SHEET_JSON:
        json_path = png_path.with_suffix(".json")
        json_path.write_text(json.dumps({
            "image": png_path.name, "size": {"w": atlas.width, "h": atlas.height},
            "fps": fps, "frames": frame_meta,
        }, indent=2), encoding="utf-8")
        progress_cb(100, total_frames, total_frames)
        return ExportResult(output_path=json_path, file_size_bytes=json_path.stat().st_size, extra={"atlas_png": str(png_path)})

    progress_cb(100, total_frames, total_frames)
    return ExportResult(output_path=png_path, file_size_bytes=png_path.stat().st_size)


def register(engine_instance=engine) -> None:
    for fmt in (ExportFormat.SPRITE_SHEET_PNG, ExportFormat.SPRITE_SHEET_JSON):
        engine_instance.register(fmt.value, export_sprite_sheet)
