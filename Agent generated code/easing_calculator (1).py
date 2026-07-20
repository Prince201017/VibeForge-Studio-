# [CSS.A10] easing_calculator.py
"""
Server-side easing utilities. Mirrors frontend/lib/css-animation/easing.ts
so exported code (CSS, GSAP, Framer Motion, etc.) matches what LivePreview
rendered in the browser.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional

BEZIER_PRESETS = {
    "linear": (0.0, 0.0, 1.0, 1.0),
    "ease": (0.25, 0.1, 0.25, 1.0),
    "ease-in": (0.42, 0.0, 1.0, 1.0),
    "ease-out": (0.0, 0.0, 0.58, 1.0),
    "ease-in-out": (0.42, 0.0, 0.58, 1.0),
    "power1": (0.25, 0.46, 0.45, 0.94),
    "power2": (0.25, 0.46, 0.45, 0.94),
    "power3": (0.165, 0.84, 0.44, 1.0),
    "power4": (0.19, 1.0, 0.22, 1.0),
    "back-in": (0.36, 0.0, 0.66, -0.56),
    "back-out": (0.34, 1.56, 0.64, 1.0),
    "back-in-out": (0.68, -0.6, 0.32, 1.6),
}

NON_NATIVE_CSS = {
    "power1", "power2", "power3", "power4",
    "back-in", "back-out", "back-in-out",
    "elastic-in", "elastic-out", "elastic-in-out",
    "bounce-in", "bounce-out", "bounce-in-out",
}


@dataclass
class Easing:
    name: str = "ease-in-out"
    bezier: Optional[tuple] = None       # (x1, y1, x2, y2)
    steps: Optional[int] = None
    step_position: str = "jump-end"
    amplitude: float = 1.0
    period: float = 0.3

    @classmethod
    def from_dict(cls, d: dict) -> "Easing":
        bezier = d.get("bezier")
        bez_tuple = (bezier["x1"], bezier["y1"], bezier["x2"], bezier["y2"]) if bezier else None
        return cls(
            name=d.get("name", "ease-in-out"),
            bezier=bez_tuple,
            steps=d.get("steps"),
            step_position=d.get("stepPosition", "jump-end"),
            amplitude=d.get("amplitude", 1.0),
            period=d.get("period", 0.3),
        )


def easing_to_css(easing: Easing) -> str:
    if easing.name == "steps":
        n = easing.steps or 4
        return f"steps({n}, {easing.step_position})"
    if easing.name == "custom-bezier" and easing.bezier:
        x1, y1, x2, y2 = easing.bezier
        return f"cubic-bezier({x1}, {y1}, {x2}, {y2})"
    if easing.name in NON_NATIVE_CSS:
        x1, y1, x2, y2 = BEZIER_PRESETS.get(easing.name, BEZIER_PRESETS["ease"])
        return f"cubic-bezier({x1}, {y1}, {x2}, {y2})"
    if easing.name in ("linear", "ease", "ease-in", "ease-out", "ease-in-out"):
        return easing.name
    return "ease-in-out"


def easing_to_gsap(easing: Easing) -> str:
    simple = {
        "linear": "none",
        "ease": "power1.inOut",
        "ease-in": "power1.in",
        "ease-out": "power1.out",
        "ease-in-out": "power1.inOut",
        "power1": "power1.inOut",
        "power2": "power2.inOut",
        "power3": "power3.inOut",
        "power4": "power4.inOut",
        "back-in": "back.in(1.7)",
        "back-out": "back.out(1.7)",
        "back-in-out": "back.inOut(1.7)",
    }
    if easing.name in simple:
        return simple[easing.name]
    if easing.name.startswith("elastic"):
        direction = easing.name.split("-")[1] if "-" in easing.name else "out"
        return f"elastic.{direction}({easing.amplitude}, {easing.period})"
    if easing.name.startswith("bounce"):
        direction = easing.name.split("-")[1] if "-" in easing.name else "out"
        return f"bounce.{direction}"
    if easing.name == "steps":
        return f"steps({easing.steps or 4})"
    if easing.name == "custom-bezier" and easing.bezier:
        x1, y1, x2, y2 = easing.bezier
        return f'CustomEase.create("custom", "M0,0 C{x1},{y1} {x2},{y2} 1,1")'
    return "power1.inOut"


def easing_to_framer(easing: Easing):
    if easing.name == "custom-bezier" and easing.bezier:
        return list(easing.bezier)
    named = {
        "linear": "linear",
        "ease": "easeInOut",
        "ease-in": "easeIn",
        "ease-out": "easeOut",
        "ease-in-out": "easeInOut",
        "back-in": "backIn",
        "back-out": "backOut",
        "back-in-out": "backInOut",
    }
    return named.get(easing.name, "easeInOut")


def easing_to_anime(easing: Easing) -> str:
    """Anime.js v3 ease string format, e.g. 'easeInOutQuad', 'easeOutElastic(1, .5)'."""
    power_map = {"power1": "Quad", "power2": "Cubic", "power3": "Quart", "power4": "Quint"}
    if easing.name in power_map:
        return f"easeInOut{power_map[easing.name]}"
    if easing.name.startswith("elastic"):
        direction = "Out" if "out" in easing.name else "In" if easing.name.endswith("in") else "InOut"
        return f"easeElastic{direction}({easing.amplitude}, {easing.period})"
    if easing.name.startswith("bounce"):
        direction = "Out" if "out" in easing.name else "In" if easing.name.endswith("in") else "InOut"
        return f"easeBounce{direction}"
    if easing.name == "custom-bezier" and easing.bezier:
        x1, y1, x2, y2 = easing.bezier
        return f"cubicBezier({x1}, {y1}, {x2}, {y2})"
    simple = {"linear": "linear", "ease": "easeInOutQuad", "ease-in": "easeInQuad",
              "ease-out": "easeOutQuad", "ease-in-out": "easeInOutQuad"}
    return simple.get(easing.name, "easeInOutQuad")
