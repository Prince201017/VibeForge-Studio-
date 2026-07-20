"""
[V0.A7] Video Export Pipeline
=============================
Renders the animation frame-by-frame (via frame_renderer) to a temp PNG
sequence, then shells out to ffmpeg to encode. ffmpeg's `-progress
pipe:1` output is parsed live so ExportEngine's progress_cb gets real
frame-accurate updates instead of a fake timer.

Requires the `ffmpeg` binary on PATH. Hardware acceleration flags are
best-effort: if the requested encoder isn't available on the host,
ffmpeg's own stderr error is surfaced back to the caller through the
existing retry/error-reporting path in export_engine, rather than silently
falling back (silent fallback would violate the "lossless quality for all
formats" SLA by changing bitrate/codec behavior the user asked for).
"""
from __future__ import annotations

import asyncio
import logging
import shutil
import subprocess
import time
from pathlib import Path

from models.schemas import ExportFormat, ExportRequest, VideoOptions
from services.advanced_rendering import render_frame_with_effects
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import RenderConfig

# codec defaults per container; VideoOptions.codec overrides these
_DEFAULT_CODEC = {
    ExportFormat.MP4: ("libx264", "aac"),
    ExportFormat.WEBM: ("libvpx-vp9", "libopus"),
    ExportFormat.MOV: ("prores_ks", "pcm_s16le"),
    ExportFormat.MKV: ("libx265", "flac"),
    ExportFormat.AVI: ("mpeg4", "mp3"),
}

_HWACCEL_ENCODER_MAP = {
    ("nvenc", "libx264"): "h264_nvenc",
    ("nvenc", "libx265"): "hevc_nvenc",
    ("qsv", "libx264"): "h264_qsv",
    ("qsv", "libx265"): "hevc_qsv",
}


def _require_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError(
            "ffmpeg binary not found on PATH. Install ffmpeg (e.g. `apt-get install "
            "ffmpeg` / `brew install ffmpeg`) — this is a hard dependency listed in "
            "07_EXPORT_PIPELINE_NEEDS.md §Dependencies."
        )
    return path


async def export_video(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    fmt = request.format
    if fmt not in _DEFAULT_CODEC:
        raise ValueError(f"{fmt} is not a video format")

    ffmpeg_bin = _require_ffmpeg()
    project = request.project
    width, height = request.resolution or (project.width, project.height)
    fps = request.fps or project.fps
    total_frames = engine._estimate_frame_count(request)

    frames_dir = engine.work_dir / f"frames_{time.time_ns()}"
    frames_dir.mkdir(parents=True, exist_ok=True)

    fr = request.frame_range
    if fr.mode == "current_frame":
        start_ms = fr.current_frame_ms or 0.0
    elif fr.mode == "range" and fr.start_ms is not None:
        start_ms = fr.start_ms
    else:
        start_ms = 0.0

    render_cfg = RenderConfig(
        width=width, height=height, background=project.background,
        antialias_scale={"off": 1, "2x": 2, "4x": 2, "8x": 4}.get(request.render.antialiasing, 2),
    )

    # -- Phase 1: render frames (0% - 60% of progress) ------------------
    loop = asyncio.get_running_loop()
    for i in range(total_frames):
        t_ms = start_ms + (i / fps) * 1000
        frame = await loop.run_in_executor(None, render_frame_with_effects, project, t_ms, render_cfg, request.render, fps)
        await loop.run_in_executor(None, frame.save, str(frames_dir / f"f_{i:06d}.png"))
        progress_cb((i + 1) / total_frames * 60, i + 1, total_frames)

    # -- Phase 2: encode with ffmpeg (60% - 100%) ------------------------
    video_codec, audio_codec = _resolve_codecs(fmt, request.video)
    out_path = engine.work_dir / f"export_{time.time_ns()}.{fmt.value}"

    cmd = [
        ffmpeg_bin, "-y",
        "-framerate", str(fps),
        "-i", str(frames_dir / "f_%06d.png"),
    ]
    if request.video.include_audio and request.video.audio_path:
        cmd += ["-i", request.video.audio_path]

    sub_codec = _subtitle_codec_for(fmt) if request.video.captions else None
    subtitle_path = None
    if request.video.captions:
        if sub_codec:
            subtitle_path = _write_subtitle_file(request.video.captions, fmt)
            cmd += ["-i", str(subtitle_path)]
        else:
            logging.getLogger("video_export").warning(
                "%s does not support soft subtitles; %d caption(s) were skipped",
                fmt.value, len(request.video.captions),
            )

    pix_fmt, color_flags = _resolve_color_space(fmt, request.video.color_space)
    cmd += ["-c:v", video_codec, "-pix_fmt", pix_fmt, *color_flags]
    if request.video.bitrate_kbps:
        cmd += ["-b:v", f"{request.video.bitrate_kbps}k"]
    if request.video.include_audio and request.video.audio_path:
        cmd += ["-c:a", audio_codec, "-shortest"]
    if subtitle_path:
        cmd += ["-c:s", sub_codec]

    video_filters = [f"scale={width}:{height}"]
    if request.video.interpolate_to_fps and request.video.interpolate_to_fps > fps:
        # motion-compensated frame interpolation (real optical-flow based
        # interpolation, not just frame duplication) — see spec's "Frame
        # interpolation options"
        video_filters.append(f"minterpolate=fps={request.video.interpolate_to_fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1")
    cmd += ["-vf", ",".join(video_filters)]
    cmd += ["-progress", "pipe:1", "-nostats", str(out_path)]

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stderr_chunks: list[bytes] = []

    async def _read_stderr():
        assert proc.stderr
        async for line in proc.stderr:
            stderr_chunks.append(line)

    stderr_task = asyncio.create_task(_read_stderr())

    assert proc.stdout
    async for raw_line in proc.stdout:
        line = raw_line.decode(errors="ignore").strip()
        if line.startswith("frame="):
            try:
                current = int(line.split("=", 1)[1])
                pct = 60 + min(1.0, current / total_frames) * 40
                progress_cb(pct, current, total_frames)
            except ValueError:
                pass

    returncode = await proc.wait()
    await stderr_task

    if returncode != 0:
        stderr_text = b"".join(stderr_chunks).decode(errors="ignore")[-2000:]
        raise RuntimeError(f"ffmpeg exited {returncode}: {stderr_text}")

    shutil.rmtree(frames_dir, ignore_errors=True)
    size = out_path.stat().st_size
    progress_cb(100, total_frames, total_frames)
    return ExportResult(output_path=out_path, file_size_bytes=size)


def _resolve_codecs(fmt: ExportFormat, opts: VideoOptions) -> tuple[str, str]:
    default_v, default_a = _DEFAULT_CODEC[fmt]
    video_codec = opts.codec or default_v
    if opts.hardware_accel and opts.hardware_accel != "none":
        video_codec = _HWACCEL_ENCODER_MAP.get((opts.hardware_accel, video_codec), video_codec)
    return video_codec, default_a


def _subtitle_codec_for(fmt: ExportFormat) -> str | None:
    """Which soft-subtitle codec (if any) each container actually supports.
    AVI's subtitle support is inconsistent enough across players that we
    don't attempt it — captions are dropped with a logged warning instead
    of shipping a file that silently doesn't show captions in most players."""
    return {
        ExportFormat.MP4: "mov_text",
        ExportFormat.MOV: "mov_text",
        ExportFormat.MKV: "srt",
        ExportFormat.WEBM: "webvtt",
    }.get(fmt)


def _write_subtitle_file(captions: list, fmt: ExportFormat) -> Path:
    """§3 'Subtitle/caption support' — writes a real SRT (or WebVTT for
    WebM, since WebM only accepts WebVTT soft subtitles) from the caption
    list on the request, for ffmpeg to mux in as a soft subtitle track."""
    use_vtt = fmt == ExportFormat.WEBM
    ext = "vtt" if use_vtt else "srt"
    path = engine.work_dir / f"captions_{time.time_ns()}.{ext}"

    lines = ["WEBVTT", ""] if use_vtt else []
    for i, cap in enumerate(captions, start=1):
        if not use_vtt:
            lines.append(str(i))
        lines.append(f"{_format_timestamp(cap.start_ms, use_vtt)} --> {_format_timestamp(cap.end_ms, use_vtt)}")
        lines.append(cap.text)
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _format_timestamp(ms: float, vtt: bool) -> str:
    total_ms = round(ms)
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    seconds, millis = divmod(rem, 1000)
    sep = "." if vtt else ","
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}{sep}{millis:03d}"


# Color space management (§3): tags the container with the right primaries/
# transfer/matrix and picks a pixel format that can actually hold the range
# requested. This sets *metadata* correctly (what every downstream player
# needs to display the file right) rather than doing a full ICC-calibrated
# pixel remap, which would require color-managed source data this pipeline
# doesn't have.
def _resolve_color_space(fmt: ExportFormat, color_space: str) -> tuple[str, list[str]]:
    if color_space == "hdr10":
        pix_fmt = "yuv420p10le"
        flags = [
            "-colorspace", "bt2020nc", "-color_primaries", "bt2020", "-color_trc", "smpte2084",
            "-color_range", "tv",
        ]
    elif color_space == "p3":
        pix_fmt = "yuv422p10le" if fmt == ExportFormat.MOV else "yuv420p"
        flags = ["-colorspace", "bt709", "-color_primaries", "smpte432", "-color_trc", "bt709"]
    else:  # srgb
        pix_fmt = "yuv422p10le" if fmt == ExportFormat.MOV else "yuv420p"
        flags = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]
    return pix_fmt, flags


def register(engine_instance=engine) -> None:
    for fmt in _DEFAULT_CODEC:
        engine_instance.register(fmt.value, export_video)
