# [CSS.A10] css_generator.py
"""
Authoritative CSS generator. Produces @keyframes + animation shorthand +
responsive breakpoints, with optional vendor prefixing and minification.
This is the source of truth used by /api/css-animation/generate-css and by
html_generator.py when it embeds a <style> block.
"""
from __future__ import annotations
import re
from typing import Dict, List

from .easing_calculator import Easing, easing_to_css

# property key -> (css-host-property, transform-fn | filter-fn | None, default unit)
PROPERTY_MAP: Dict[str, tuple] = {
    "translateX": ("transform", "translateX", "px"),
    "translateY": ("transform", "translateY", "px"),
    "translateZ": ("transform", "translateZ", "px"),
    "rotate": ("transform", "rotate", "deg"),
    "rotateX": ("transform", "rotateX", "deg"),
    "rotateY": ("transform", "rotateY", "deg"),
    "rotateZ": ("transform", "rotateZ", "deg"),
    "scale": ("transform", "scale", ""),
    "scaleX": ("transform", "scaleX", ""),
    "scaleY": ("transform", "scaleY", ""),
    "scaleZ": ("transform", "scaleZ", ""),
    "skewX": ("transform", "skewX", "deg"),
    "skewY": ("transform", "skewY", "deg"),
    "perspective": ("transform", "perspective", "px"),
    "opacity": ("opacity", None, ""),
    "color": ("color", None, ""),
    "backgroundColor": ("background-color", None, ""),
    "borderColor": ("border-color", None, ""),
    "blur": ("filter", "blur", "px"),
    "brightness": ("filter", "brightness", ""),
    "contrast": ("filter", "contrast", ""),
    "dropShadow": ("filter", "drop-shadow", ""),
    "grayscale": ("filter", "grayscale", ""),
    "hueRotate": ("filter", "hue-rotate", "deg"),
    "invert": ("filter", "invert", ""),
    "saturate": ("filter", "saturate", ""),
    "sepia": ("filter", "sepia", ""),
    "fontSize": ("font-size", None, "px"),
    "fontWeight": ("font-weight", None, ""),
    "letterSpacing": ("letter-spacing", None, "em"),
    "width": ("width", None, "px"),
    "height": ("height", None, "px"),
    "maxWidth": ("max-width", None, "px"),
    "maxHeight": ("max-height", None, "px"),
    "margin": ("margin", None, "px"),
    "padding": ("padding", None, "px"),
    "borderRadius": ("border-radius", None, "px"),
    "borderWidth": ("border-width", None, "px"),
    "boxShadow": ("box-shadow", None, ""),
    "textShadow": ("text-shadow", None, ""),
    "backdropFilter": ("backdrop-filter", None, ""),
    "clipPath": ("clip-path", None, ""),
    "maskImage": ("mask-image", None, ""),
    "backgroundPosition": ("background-position", None, "%"),
    "backgroundSize": ("background-size", None, "%"),
    "gradientAngle": ("--gradient-angle", None, "deg"),
}


def _format_value(prop: str, value, unit: str | None) -> str:
    host, fn, default_unit = PROPERTY_MAP[prop]
    u = unit if unit is not None else default_unit
    raw = f"{value}{u}" if isinstance(value, (int, float)) else str(value)
    if fn:
        return f"{fn}({raw})"
    return raw


def generate_keyframes(name: str, tracks: List[dict]) -> str:
    offsets: Dict[float, Dict[str, List[str]]] = {}
    for track in tracks:
        if not track.get("enabled", True):
            continue
        prop = track["property"]
        host = PROPERTY_MAP[prop][0]
        group_key = "transform" if host == "transform" else "filter" if host == "filter" else host
        for kf in track["keyframes"]:
            offset = kf["offset"]
            offsets.setdefault(offset, {}).setdefault(group_key, []).append(
                _format_value(prop, kf["value"], kf.get("unit"))
            )

    lines = [f"@keyframes {name} {{"]
    for offset in sorted(offsets.keys()):
        pct = f"{round(offset * 100)}%"
        lines.append(f"  {pct} {{")
        for css_prop, values in offsets[offset].items():
            lines.append(f"    {css_prop}: {' '.join(values)};")
        lines.append("  }")
    lines.append("}")
    return "\n".join(lines)


def generate_shorthand(name: str, timing: dict) -> str:
    easing = easing_to_css(Easing.from_dict(timing["easing"]))
    iteration = "infinite" if timing["iterationCount"] == "infinite" else str(timing["iterationCount"])
    return (
        f"animation: {name} {timing['durationMs']}ms {easing} "
        f"{timing['delayMs']}ms {iteration} {timing['direction']} {timing['fillMode']};"
    )


def generate_media_queries(name: str, selector: str, breakpoints: List[dict]) -> str:
    blocks = []
    for bp in breakpoints or []:
        overrides = bp.get("overrides") or {}
        if not overrides:
            continue
        decls = []
        if "durationMs" in overrides:
            decls.append(f"animation-duration: {overrides['durationMs']}ms;")
        if "delayMs" in overrides:
            decls.append(f"animation-delay: {overrides['delayMs']}ms;")
        if not decls:
            continue
        max_width = bp.get("maxWidth")
        query = f"@media (max-width: {max_width}px)" if max_width else "@media (min-width: 1024px)"
        blocks.append(f"{query} {{\n  {selector} {{\n    " + "\n    ".join(decls) + "\n  }\n}")
    return "\n\n".join(blocks)


def generate_full_css(config: dict, vendor_prefixes: bool = True, minify: bool = False) -> str:
    name = config["name"]
    selector = config["selector"]
    if config.get("trigger") == "hover":
        selector = f"{selector}:hover"

    keyframes = generate_keyframes(name, config["tracks"])
    shorthand = generate_shorthand(name, config["timing"])

    prefix_lines = []
    if vendor_prefixes:
        prefix_lines = [f"  -webkit-{shorthand}", f"  -moz-{shorthand}"]

    rule = "\n".join([f"{selector} {{", *prefix_lines, f"  {shorthand}", "}"])
    media = generate_media_queries(name, selector, config.get("breakpoints", []))

    parts = [keyframes, "", rule]
    if media:
        parts += ["", media]
    css = "\n".join(parts)

    if minify:
        css = re.sub(r"\s*\n\s*", "", css)
        css = re.sub(r"\s{2,}", " ", css)
        css = re.sub(r";\s*}", "}", css)
    return css


def generate_tailwind_config(config: dict) -> str:
    """Emits the tailwind.config.js `extend.animation`/`keyframes` snippet."""
    name = config["name"]
    css_kf = generate_keyframes(name, config["tracks"])
    # Convert CSS keyframe percentages into JS object literal form for tailwind.config.js
    body_lines = []
    for line in css_kf.splitlines()[1:-1]:
        body_lines.append("  " + line)
    js_keyframes = "\n".join(body_lines)
    timing = config["timing"]
    duration_s = timing["durationMs"] / 1000
    return (
        f"// tailwind.config.js\nmodule.exports = {{\n"
        f"  theme: {{\n    extend: {{\n"
        f"      keyframes: {{\n        {name}: {{\n{js_keyframes}\n        }}\n      }},\n"
        f"      animation: {{\n        {name}: '{name} {duration_s}s {easing_to_css(Easing.from_dict(timing['easing']))} "
        f"{timing['delayMs']}ms {timing['iterationCount']} {timing['direction']} {timing['fillMode']}',\n      }}\n"
        f"    }}\n  }}\n}}\n\n<div className=\"animate-{name}\"></div>"
    )
