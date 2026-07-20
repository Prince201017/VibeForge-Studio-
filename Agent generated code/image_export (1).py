"""
[V0.A7] Image Sequence Export
=============================
PNG / APNG / WebP / AVIF / EXR / TIFF sequence export. PNG, APNG, WebP and
TIFF are handled entirely by Pillow (a hard dependency already). AVIF needs
the optional `pillow-avif-plugin` package; EXR needs `OpenEXR` + `Imath`
(native libs, not pip-installable everywhere). Both are wrapped in a
try/import so this module still loads and every *other* format keeps
working even if those two aren't present on the host — the handler for the
missing format raises a clear, actionable RuntimeError instead of the
whole export service failing to boot.
"""
from __future__ import annotations

import re
import time
from pathlib import Path

from PIL import Image

from models.schemas import ExportFormat, ExportRequest
from services.advanced_rendering import render_frame_with_effects
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import RenderConfig

try:
    import pillow_avif  # noqa: F401  (registers AVIF with Pillow on import)
    _HAS_AVIF = True
except ImportError:
    _HAS_AVIF = False

try:
    import OpenEXR
    import Imath
    _HAS_EXR = True
except ImportError:
    _HAS_EXR = False


async def export_image_sequence(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    import asyncio

    fmt = request.format
    project = request.project
    width, height = request.resolution or (project.width, project.height)
    fps = request.fps or project.fps
    total_frames = engine._estimate_frame_count(request)
    pad = request.image_seq.name_padding

    out_dir = engine.work_dir / f"seq_{fmt.value}_{time.time_ns()}"
    out_dir.mkdir(parents=True, exist_ok=True)

    render_cfg = RenderConfig(width=width, height=height, background=project.background)
    fr = request.frame_range
    start_ms = fr.current_frame_ms if fr.mode == "current_frame" else (fr.start_ms or 0.0)

    loop = asyncio.get_running_loop()
    frames_written: list[Path] = []

    for i in range(total_frames):
        t_ms = start_ms + (i / fps) * 1000
        frame = await loop.run_in_executor(None, render_frame_with_effects, project, t_ms, render_cfg, request.render, fps)
        path = out_dir / f"frame_{i:0{pad}d}{_extension(fmt)}"
        await loop.run_in_executor(None, _save_single_frame, frame, path, fmt, request, project, t_ms, render_cfg)
        frames_written.append(path)
        progress_cb((i + 1) / total_frames * 90, i + 1, total_frames)

    if fmt == ExportFormat.APNG:
        # collapse the sequence into one animated file, matching the format's semantics
        apng_path = out_dir.parent / f"{out_dir.name}.apng.png"
        frames = [Image.open(p).convert("RGBA") for p in frames_written]
        frames[0].save(
            apng_path, save_all=True, append_images=frames[1:],
            duration=int(1000 / fps), loop=0, format="PNG",
        )
        for p in frames_written:
            p.unlink(missing_ok=True)
        progress_cb(100, total_frames, total_frames)
        return ExportResult(output_path=apng_path, file_size_bytes=apng_path.stat().st_size)

    # otherwise zip the sequence directory into one downloadable archive
    import shutil as _shutil
    archive_base = out_dir.parent / out_dir.name
    archive_path = Path(_shutil.make_archive(str(archive_base), "zip", root_dir=out_dir))
    _shutil.rmtree(out_dir, ignore_errors=True)
    progress_cb(100, total_frames, total_frames)
    return ExportResult(output_path=archive_path, file_size_bytes=archive_path.stat().st_size)


def _extension(fmt: ExportFormat) -> str:
    return {
        ExportFormat.PNG_SEQUENCE: ".png",
        ExportFormat.APNG: ".png",
        ExportFormat.WEBP_SEQUENCE: ".webp",
        ExportFormat.AVIF_SEQUENCE: ".avif",
        ExportFormat.EXR_SEQUENCE: ".exr",
        ExportFormat.TIFF_SEQUENCE: ".tiff",
    }[fmt]


def _save_single_frame(frame: Image.Image, path: Path, fmt: ExportFormat, request: ExportRequest,
                        project=None, time_ms: float | None = None, render_cfg=None) -> None:
    opts = request.image_seq
    if fmt == ExportFormat.PNG_SEQUENCE or fmt == ExportFormat.APNG:
        mode = {8: "RGBA", 16: "I;16"}.get(opts.bit_depth, "RGBA")
        img = frame if mode == "RGBA" else frame.convert("L").convert(mode)
        img.save(path, format="PNG", compress_level=opts.compression_level)
    elif fmt == ExportFormat.WEBP_SEQUENCE:
        frame.save(path, format="WEBP", lossless=True, quality=100)
    elif fmt == ExportFormat.TIFF_SEQUENCE:
        frame.save(path, format="TIFF", compression="tiff_lzw")
    elif fmt == ExportFormat.AVIF_SEQUENCE:
        if not _HAS_AVIF:
            raise RuntimeError(
                "AVIF export requires the optional `pillow-avif-plugin` package "
                "(pip install pillow-avif-plugin). Not installed on this host."
            )
        frame.save(path, format="AVIF", quality=90)
    elif fmt == ExportFormat.EXR_SEQUENCE:
        _save_exr(frame, path, project=project, time_ms=time_ms, render_cfg=render_cfg, multi_layer=opts.multi_layer)
    else:
        raise ValueError(f"{fmt} is not an image sequence format")


def _save_exr(frame: Image.Image, path: Path, *, project=None, time_ms: float | None = None,
              render_cfg=None, multi_layer: bool = False) -> None:
    if not _HAS_EXR:
        raise RuntimeError(
            "EXR export requires the `OpenEXR` + `Imath` native libraries "
            "(not always pip-installable — e.g. `apt-get install libopenexr-dev` "
            "then `pip install OpenEXR`). Not installed on this host."
        )
    if multi_layer and project is not None:
        _save_exr_multilayer(frame, path, project, time_ms, render_cfg)
    else:
        _save_exr_single(frame, path)


def _save_exr_single(frame: Image.Image, path: Path) -> None:
    import numpy as np

    arr = np.asarray(frame.convert("RGBA")).astype("float32") / 255.0
    header = OpenEXR.Header(frame.width, frame.height)
    half_chan = Imath.Channel(Imath.PixelType(Imath.PixelType.FLOAT))
    header["channels"] = {c: half_chan for c in ("R", "G", "B", "A")}
    exr = OpenEXR.OutputFile(str(path), header)
    exr.writePixels({
        "R": arr[:, :, 0].tobytes(), "G": arr[:, :, 1].tobytes(),
        "B": arr[:, :, 2].tobytes(), "A": arr[:, :, 3].tobytes(),
    })
    exr.close()


def _save_exr_multilayer(frame: Image.Image, path: Path, project, time_ms: float, render_cfg) -> None:
    """Multi-part EXR: a 'composite' part with the full RGBA frame, plus one
    part per layer holding that layer's isolated alpha matte — the standard
    way compositing tools (Nuke, After Effects) consume per-element mattes
    from a single EXR file."""
    import numpy as np

    from services.frame_renderer import render_frame_isolated_layer

    composite_arr = np.asarray(frame.convert("RGBA")).astype("float32") / 255.0
    parts = [
        OpenEXR.Part(
            {}, {
                "R": OpenEXR.Channel(composite_arr[:, :, 0].copy()),
                "G": OpenEXR.Channel(composite_arr[:, :, 1].copy()),
                "B": OpenEXR.Channel(composite_arr[:, :, 2].copy()),
                "A": OpenEXR.Channel(composite_arr[:, :, 3].copy()),
            },
            name="composite",
        )
    ]

    for i, layer in enumerate(project.layers):
        matte_frame = render_frame_isolated_layer(project, layer, time_ms, render_cfg)
        matte_arr = np.asarray(matte_frame.convert("RGBA")).astype("float32")[:, :, 3] / 255.0
        safe_name = re.sub(r"[^a-zA-Z0-9_]+", "_", layer.name).strip("_") or f"layer{i}"
        parts.append(OpenEXR.Part({}, {"A": OpenEXR.Channel(matte_arr.copy())}, name=f"matte_{safe_name}"))

    OpenEXR.File(parts).write(str(path))


def register(engine_instance=engine) -> None:
    for fmt in (
        ExportFormat.PNG_SEQUENCE, ExportFormat.APNG, ExportFormat.WEBP_SEQUENCE,
        ExportFormat.AVIF_SEQUENCE, ExportFormat.EXR_SEQUENCE, ExportFormat.TIFF_SEQUENCE,
    ):
        engine_instance.register(fmt.value, export_image_sequence)
