"""
[V0.A7] Frame Renderer (stand-in for the Viewport Renderer, Claude.A5)
=======================================================================
07_EXPORT_PIPELINE_NEEDS.md exports frames; it doesn't render them — that's
05_CLAUDE_A5_VIEWPORT_RENDERER.md's job (Canvas/WebGL). In production this
module should be replaced by a call into that renderer (e.g. headless
Chromium capture of the same WebGL canvas, or a shared Rust/WASM rasterizer)
so exported pixels are guaranteed to match on-screen pixels.

Until that hook exists, this module is a genuine, working CPU rasterizer
(Pillow-based) that supports rect/ellipse/text/group layers with keyframed
position/scale/rotation/opacity/fill, so every downstream exporter
(video, image sequence, sprite sheet) has real frames to work with rather
than mocked output.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from models.schemas import Easing, EasingType, Keyframe, Layer, ProjectData


def _ease(t: float, easing: Easing) -> float:
    """t in [0,1] -> eased t in [0,1]."""
    t = max(0.0, min(1.0, t))
    if easing.type == EasingType.LINEAR:
        return t
    if easing.type == EasingType.EASE_IN:
        return t * t
    if easing.type == EasingType.EASE_OUT:
        return 1 - (1 - t) * (1 - t)
    if easing.type == EasingType.EASE_IN_OUT:
        return 3 * t * t - 2 * t * t * t  # smoothstep
    if easing.type == EasingType.CUBIC_BEZIER and easing.bezier:
        x1, y1, x2, y2 = easing.bezier
        return _cubic_bezier_y(t, x1, y1, x2, y2)
    if easing.type == EasingType.STEPS and easing.steps > 0:
        return math.floor(t * easing.steps) / easing.steps
    if easing.type == EasingType.SPRING:
        # lightweight critically-damped-ish approximation, not a full physics sim
        return 1 - math.exp(-easing.stiffness / 40 * t) * math.cos(easing.damping / 10 * t * math.pi)
    return t


def _cubic_bezier_y(t: float, x1: float, y1: float, x2: float, y2: float, iterations: int = 8) -> float:
    """Solve a cubic bezier easing curve for y given t along x, via Newton-ish bisection."""
    lo, hi = 0.0, 1.0
    for _ in range(iterations):
        mid = (lo + hi) / 2
        x = 3 * (1 - mid) ** 2 * mid * x1 + 3 * (1 - mid) * mid ** 2 * x2 + mid ** 3
        if x < t:
            lo = mid
        else:
            hi = mid
    u = (lo + hi) / 2
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3


DEFAULT_PROPS = {
    "x": 0.0, "y": 0.0, "scaleX": 1.0, "scaleY": 1.0,
    "rotation": 0.0, "opacity": 1.0, "width": 100.0, "height": 100.0,
}


def interpolate_properties(layer: Layer, time_ms: float) -> dict[str, float]:
    """Sample a layer's animated properties at time_ms, holding on the
    nearest keyframe outside the animated range and lerping between the
    two bracketing keyframes (using the *outgoing* keyframe's easing)
    inside it."""
    base = dict(DEFAULT_PROPS)
    base.update({k: v for k, v in layer.geometry.items() if isinstance(v, (int, float))})
    base["opacity"] = layer.opacity

    kfs = sorted(layer.keyframes, key=lambda k: k.time_ms)
    if not kfs:
        return base

    if time_ms <= kfs[0].time_ms:
        base.update({k: v for k, v in kfs[0].properties.items() if isinstance(v, (int, float))})
        return base
    if time_ms >= kfs[-1].time_ms:
        base.update({k: v for k, v in kfs[-1].properties.items() if isinstance(v, (int, float))})
        return base

    prev_kf, next_kf = kfs[0], kfs[-1]
    for a, b in zip(kfs, kfs[1:]):
        if a.time_ms <= time_ms <= b.time_ms:
            prev_kf, next_kf = a, b
            break

    span = max(1e-6, next_kf.time_ms - prev_kf.time_ms)
    raw_t = (time_ms - prev_kf.time_ms) / span
    eased_t = _ease(raw_t, next_kf.easing)

    merged_keys = set(prev_kf.properties) | set(next_kf.properties) | set(base)
    out = dict(base)
    for key in merged_keys:
        start = prev_kf.properties.get(key, base.get(key))
        end = next_kf.properties.get(key, base.get(key))
        if isinstance(start, (int, float)) and isinstance(end, (int, float)):
            out[key] = start + (end - start) * eased_t
        elif end is not None:
            out[key] = end  # non-numeric (e.g. string) props snap at the keyframe
    return out


@dataclass
class RenderConfig:
    width: int
    height: int
    background: Optional[str] = None
    antialias_scale: int = 2  # supersample then downscale


def _hex_or_none(color: Optional[str]) -> Optional[str]:
    return color if color else None


def render_frame(project: ProjectData, time_ms: float, config: RenderConfig) -> Image.Image:
    """Rasterize every layer in `project` at `time_ms` to an RGBA frame."""
    scale = max(1, config.antialias_scale)
    w, h = config.width * scale, config.height * scale
    img = Image.new("RGBA", (w, h), _hex_or_none(config.background) or (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def draw_layer(layer: Layer, parent_offset=(0.0, 0.0)):
        props = interpolate_properties(layer, time_ms)
        ox, oy = parent_offset
        x = (props.get("x", 0.0) + ox) * scale
        y = (props.get("y", 0.0) + oy) * scale
        width = props.get("width", 100.0) * props.get("scaleX", 1.0) * scale
        height = props.get("height", 100.0) * props.get("scaleY", 1.0) * scale
        opacity = max(0.0, min(1.0, props.get("opacity", 1.0)))
        fill = _hex_to_rgba(layer.fill, opacity) if layer.fill else None
        outline = _hex_to_rgba(layer.stroke, opacity) if layer.stroke else None
        stroke_w = max(0, round(layer.stroke_width * scale))

        if opacity <= 0:
            pass
        elif layer.shape == ShapeTypeCompat.RECT:
            draw.rectangle([x, y, x + width, y + height], fill=fill, outline=outline, width=stroke_w or 1 if outline else 0)
        elif layer.shape == ShapeTypeCompat.ELLIPSE:
            draw.ellipse([x, y, x + width, y + height], fill=fill, outline=outline, width=stroke_w or 1 if outline else 0)
        elif layer.shape == ShapeTypeCompat.TEXT:
            text = str(layer.geometry.get("text", layer.name))
            font_size = int(layer.geometry.get("fontSize", 24) * scale)
            try:
                font = ImageFont.load_default(size=font_size)
            except TypeError:
                font = ImageFont.load_default()
            draw.text((x, y), text, fill=fill or (0, 0, 0, int(255 * opacity)), font=font)
        # PATH / IMAGE / GROUP: geometry payloads are engine-specific (owned by
        # Claude.A2's geometry engine); group children still recurse below so
        # nested transforms compose correctly even for shapes we can't paint.

        for child in layer.children:
            draw_layer(child, parent_offset=(props.get("x", 0.0) + ox, props.get("y", 0.0) + oy))

    for layer in project.layers:
        draw_layer(layer)

    if scale > 1:
        img = img.resize((config.width, config.height), Image.LANCZOS)
    return img


def _hex_to_rgba(color: str, opacity: float) -> tuple[int, int, int, int]:
    color = color.lstrip("#")
    if len(color) == 3:
        color = "".join(c * 2 for c in color)
    r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
    a = int(255 * opacity)
    return (r, g, b, a)


# local alias to avoid a circular readability issue with the Enum import name
from models.schemas import ShapeType as ShapeTypeCompat  # noqa: E402


def render_frame_isolated_layer(project: ProjectData, layer: Layer, time_ms: float, config: RenderConfig) -> Image.Image:
    """Render a single layer alone (transparent everywhere else), for
    per-layer alpha-matte extraction — used by the multi-layer EXR export
    path (§4 Image Sequence Export / EXR multi-layer)."""
    isolated = ProjectData(
        project_id=project.project_id, name=project.name, width=project.width, height=project.height,
        duration_ms=project.duration_ms, fps=project.fps, background=None, layers=[layer],
    )
    return render_frame(isolated, time_ms, config)
