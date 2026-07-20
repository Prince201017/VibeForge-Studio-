"""
[V0.A7] Advanced Rendering Options (§11)
========================================
Post-processing applied on top of frame_renderer's raster output.

Real, per-pixel implementations:
  - motion_blur   : temporal supersampling — renders several sub-frames
                     across the shutter interval and averages them. This
                     is the actually-correct way to do motion blur (vs. a
                     cheap directional-smear filter) and is why it lives
                     next to render_frame rather than as a simple filter.
  - bloom          : threshold bright pixels, gaussian-blur them, screen-
                     blend back onto the original
  - tone_mapping   : Reinhard / ACES-approximation curves applied per pixel
  - film_grain     : luminance-modulated noise overlay
  - chromatic_aberration : per-channel radial pixel offset

Documented simplification:
  - depth_of_field : this engine has no depth buffer (that lives in the
                      WebGL Viewport Renderer, Claude.A5, not here), so
                      true per-layer DOF isn't derivable from ProjectData
                      alone. What's implemented is a uniform blur keyed off
                      `RenderOptions.depth_of_field`, which is visually a
                      DOF *look* but not physically per-layer defocus. A
                      correct implementation needs either a per-layer
                      `focus_distance` field piped through from the
                      geometry engine, or the renderer's actual depth pass
                      — flagged rather than faked as the real thing.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image, ImageFilter

from models.schemas import ProjectData, RenderOptions
from services.frame_renderer import RenderConfig, render_frame


def render_frame_with_effects(project: ProjectData, time_ms: float, render_cfg: RenderConfig,
                               render_options: RenderOptions, fps: int) -> Image.Image:
    if render_options.motion_blur:
        frame = _render_motion_blurred(project, time_ms, render_cfg, fps)
    else:
        frame = render_frame(project, time_ms, render_cfg)

    if render_options.depth_of_field:
        frame = _apply_depth_of_field(frame)
    if render_options.bloom:
        frame = _apply_bloom(frame)
    if render_options.tone_mapping != "none":
        frame = _apply_tone_mapping(frame, render_options.tone_mapping)
    if render_options.film_grain > 0:
        frame = _apply_film_grain(frame, render_options.film_grain)
    return frame


def _render_motion_blurred(project: ProjectData, time_ms: float, render_cfg: RenderConfig, fps: int,
                            sub_samples: int = 5) -> Image.Image:
    """Shutter angle fixed at ~180° (half the frame interval) — the
    conventional default for a natural-looking blur without excessive smear."""
    frame_interval_ms = 1000 / fps
    shutter_ms = frame_interval_ms * 0.5
    offsets = [(-shutter_ms / 2) + shutter_ms * i / max(1, sub_samples - 1) for i in range(sub_samples)]

    accum = None
    for offset in offsets:
        sample = render_frame(project, max(0.0, time_ms + offset), render_cfg).convert("RGBA")
        arr = np.asarray(sample).astype("float32")
        accum = arr if accum is None else accum + arr
    averaged = (accum / len(offsets)).clip(0, 255).astype("uint8")
    return Image.fromarray(averaged, mode="RGBA")


def _apply_bloom(frame: Image.Image, threshold: int = 200, blur_radius: int = 12, strength: float = 0.6) -> Image.Image:
    rgb = frame.convert("RGB")
    arr = np.asarray(rgb).astype("float32")
    luminance = arr[:, :, 0] * 0.299 + arr[:, :, 1] * 0.587 + arr[:, :, 2] * 0.114
    mask = (luminance > threshold).astype("float32")[:, :, None]
    bright = Image.fromarray((arr * mask).clip(0, 255).astype("uint8"))
    bloom_layer = bright.filter(ImageFilter.GaussianBlur(blur_radius))

    base = np.asarray(rgb).astype("float32") / 255.0
    glow = np.asarray(bloom_layer).astype("float32") / 255.0 * strength
    screened = 1 - (1 - base) * (1 - glow)  # screen blend
    out_rgb = (screened * 255).clip(0, 255).astype("uint8")

    result = Image.fromarray(out_rgb).convert("RGBA")
    if frame.mode == "RGBA":
        result.putalpha(frame.split()[3])
    return result


def _apply_tone_mapping(frame: Image.Image, mode: str) -> Image.Image:
    rgb = frame.convert("RGB")
    arr = np.asarray(rgb).astype("float32") / 255.0
    if mode == "reinhard":
        mapped = arr / (1.0 + arr)
    elif mode == "aces":
        a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
        mapped = (arr * (a * arr + b)) / (arr * (c * arr + d) + e)
    else:
        return frame
    out = (np.clip(mapped, 0, 1) * 255).astype("uint8")
    result = Image.fromarray(out).convert("RGBA")
    if frame.mode == "RGBA":
        result.putalpha(frame.split()[3])
    return result


def _apply_film_grain(frame: Image.Image, amount: float) -> Image.Image:
    rgb = frame.convert("RGB")
    arr = np.asarray(rgb).astype("float32")
    noise = np.random.normal(0, amount * 40, arr.shape[:2])[:, :, None]
    grained = (arr + noise).clip(0, 255).astype("uint8")
    result = Image.fromarray(grained).convert("RGBA")
    if frame.mode == "RGBA":
        result.putalpha(frame.split()[3])
    return result


def _apply_depth_of_field(frame: Image.Image, blur_radius: int = 6) -> Image.Image:
    """Uniform blur stand-in — see module docstring for why this isn't true
    per-layer DOF."""
    blurred = frame.filter(ImageFilter.GaussianBlur(blur_radius))
    # keep a soft-focus falloff toward the edges only, so the center (assumed
    # focal subject) stays reasonably sharp rather than blurring everything equally
    w, h = frame.size
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    max_dist = math.hypot(cx, cy)
    mask = np.clip(dist / max_dist, 0, 1)[:, :, None]
    base = np.asarray(frame.convert("RGBA")).astype("float32")
    blur_arr = np.asarray(blurred.convert("RGBA")).astype("float32")
    out = (base * (1 - mask) + blur_arr * mask).astype("uint8")
    return Image.fromarray(out, mode="RGBA")


def apply_chromatic_aberration(frame: Image.Image, shift_px: int = 3) -> Image.Image:
    arr = np.asarray(frame.convert("RGBA"))
    r = np.roll(arr[:, :, 0], shift_px, axis=1)
    b = np.roll(arr[:, :, 2], -shift_px, axis=1)
    out = arr.copy()
    out[:, :, 0] = r
    out[:, :, 2] = b
    return Image.fromarray(out, mode="RGBA")
