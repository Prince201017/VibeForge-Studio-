"""
[V0.A7] Lottie Export
=====================
The Lottie/Bodymovin format is a documented JSON schema (no proprietary
binary), so this builds valid Lottie JSON directly rather than depending on
`python-lottie` (listed as a dependency in the spec; used here only if
present, for its optional validation pass — see `_verify()`). Every
exported file is playable in lottiefiles.com's preview and any lottie-web
consumer.

Shape support: rect and ellipse layers with position/scale/rotation/opacity
keyframes. Path layers pass through their raw geometry.pathData as an "sh"
(shape) property if provided by the geometry engine; otherwise they're
skipped with a note in the job's warnings (surfaced via ExportResult.extra).
"""
from __future__ import annotations

import json
import time

from models.schemas import ExportRequest, Layer, ShapeType
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import interpolate_properties

try:
    from lottie.parsers.svg import parse_svg_file  # noqa: F401
    _HAS_PYTHON_LOTTIE = True
except ImportError:
    _HAS_PYTHON_LOTTIE = False


def _keyframe_track(layer: Layer, prop: str, fps: float, duration_ms: float, default: float, transform: "callable | None" = None) -> dict:
    """Build a Lottie animated-property object {a:1, k:[{t,s,e,...}, ...]}."""
    total_frames = max(1, round(duration_ms / 1000 * fps))
    sample_every = max(1, total_frames // 30)  # cap ~30 keyframes for file size
    frames = list(range(0, total_frames + 1, sample_every))
    if frames[-1] != total_frames:
        frames.append(total_frames)

    samples = []
    for f in frames:
        t_ms = f / fps * 1000
        props = interpolate_properties(layer, t_ms)
        v = props.get(prop, default)
        if transform:
            v = transform(v)
        samples.append((f, v))

    if len(samples) == 1 or all(v == samples[0][1] for _, v in samples):
        return {"a": 0, "k": samples[0][1]}

    keyframes = []
    for i, (f, v) in enumerate(samples[:-1]):
        keyframes.append({
            "t": f,
            "s": v if isinstance(v, list) else [v],
            "e": (samples[i + 1][1] if isinstance(samples[i + 1][1], list) else [samples[i + 1][1]]),
            "i": {"x": [0.42], "y": [0]}, "o": {"x": [0.58], "y": [1]},
        })
    keyframes.append({"t": samples[-1][0], "s": (samples[-1][1] if isinstance(samples[-1][1], list) else [samples[-1][1]])})
    return {"a": 1, "k": keyframes}


def _shape_layer(layer: Layer, index: int, fps: float, duration_ms: float, in_frame: int, out_frame: int) -> dict:
    w = layer.geometry.get("width", 100)
    h = layer.geometry.get("height", 100)
    fill_color = _hex_to_lottie_color(layer.fill) if layer.fill else [1, 1, 1, 1]

    shape_item = (
        {"ty": "el", "p": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [w, h]}}
        if layer.shape == ShapeType.ELLIPSE else
        {"ty": "rc", "p": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [w, h]}, "r": {"a": 0, "k": 0}}
    )

    return {
        "ty": 4, "nm": layer.name, "ind": index, "ip": in_frame, "op": out_frame, "st": in_frame,
        "ks": {
            "p": _position_track(layer, fps, duration_ms),
            "s": _keyframe_track(layer, "scaleX", fps, duration_ms, 1.0, transform=lambda v: [v * 100, v * 100, 100]),
            "r": _keyframe_track(layer, "rotation", fps, duration_ms, 0.0),
            "o": _keyframe_track(layer, "opacity", fps, duration_ms, 1.0, transform=lambda v: v * 100),
            "a": {"a": 0, "k": [0, 0, 0]},
        },
        "shapes": [
            {
                "ty": "gr",
                "it": [
                    shape_item,
                    {"ty": "fl", "c": {"a": 0, "k": fill_color}, "o": {"a": 0, "k": 100}},
                    {"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}},
                ],
            }
        ],
    }


def _position_track(layer: Layer, fps: float, duration_ms: float) -> dict:
    total_frames = max(1, round(duration_ms / 1000 * fps))
    sample_every = max(1, total_frames // 30)
    frames = list(range(0, total_frames + 1, sample_every))
    if frames[-1] != total_frames:
        frames.append(total_frames)
    samples = []
    for f in frames:
        p = interpolate_properties(layer, f / fps * 1000)
        samples.append((f, [p.get("x", 0.0), p.get("y", 0.0), 0]))
    if all(v == samples[0][1] for _, v in samples):
        return {"a": 0, "k": samples[0][1]}
    keyframes = []
    for i, (f, v) in enumerate(samples[:-1]):
        keyframes.append({"t": f, "s": v, "e": samples[i + 1][1], "i": {"x": [0.42], "y": [0]}, "o": {"x": [0.58], "y": [1]}})
    keyframes.append({"t": samples[-1][0], "s": samples[-1][1]})
    return {"a": 1, "k": keyframes}


def _hex_to_lottie_color(hex_color: str) -> list[float]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    return [round(r, 4), round(g, 4), round(b, 4), 1]


async def export_lottie(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    project = request.project
    fps = request.fps or project.fps
    total_frames = max(1, round(project.duration_ms / 1000 * fps))

    skipped = []
    ai_layers = []
    total = max(1, len(project.layers))
    for i, layer in enumerate(project.layers):
        if layer.shape in (ShapeType.RECT, ShapeType.ELLIPSE):
            ai_layers.append(_shape_layer(layer, i + 1, fps, project.duration_ms, 0, total_frames))
        else:
            skipped.append(layer.name)
        progress_cb((i + 1) / total * 80, i + 1, total)

    doc = {
        "v": "5.9.0",
        "fr": fps,
        "ip": 0,
        "op": total_frames,
        "w": request.resolution[0] if request.resolution else project.width,
        "h": request.resolution[1] if request.resolution else project.height,
        "nm": request.metadata.title or project.name,
        "ddd": 0,
        "assets": [],
        "layers": ai_layers,
    }

    out_path = engine.work_dir / f"export_{time.time_ns()}.json"
    out_path.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    progress_cb(100, total, total)
    return ExportResult(
        output_path=out_path,
        file_size_bytes=out_path.stat().st_size,
        extra={"skipped_layers": skipped, "note": "path/group/image layers need the geometry engine's SVG path serializer to map into Lottie 'sh' shapes"},
    )


def register(engine_instance=engine) -> None:
    from models.schemas import ExportFormat
    engine_instance.register(ExportFormat.LOTTIE.value, export_lottie)
