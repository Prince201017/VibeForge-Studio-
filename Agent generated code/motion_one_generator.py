# [CSS.A10] motion_one_generator.py
from .easing_calculator import Easing, easing_to_css

MOTION_ONE_MAP = {
    "translateX": "x", "translateY": "y", "translateZ": "z",
    "rotate": "rotate", "rotateX": "rotateX", "rotateY": "rotateY", "rotateZ": "rotateZ",
    "scale": "scale", "scaleX": "scaleX", "scaleY": "scaleY",
    "opacity": "opacity", "backgroundColor": "backgroundColor",
    "borderRadius": "borderRadius", "width": "width", "height": "height",
}


def _motion_one_easing(easing: Easing) -> str:
    # Motion One accepts CSS easing keywords/cubic-bezier arrays directly.
    if easing.name == "custom-bezier" and easing.bezier:
        x1, y1, x2, y2 = easing.bezier
        return f"[{x1}, {y1}, {x2}, {y2}]"
    if easing.name in ("linear", "ease-in", "ease-out", "ease-in-out"):
        return f'"{easing.name}"'
    if easing.name.startswith("elastic"):
        return '"ease-out"  // approximated; Motion One has no native elastic'
    return '"ease-in-out"'


def generate_motion_one_code(config: dict) -> str:
    name = config["name"]
    selector = config["selector"]
    timing = config["timing"]
    easing_str = _motion_one_easing(Easing.from_dict(timing["easing"]))

    keyframes = {}
    for track in config["tracks"]:
        if not track.get("enabled", True):
            continue
        key = MOTION_ONE_MAP.get(track["property"])
        if not key:
            continue
        kfs = sorted(track["keyframes"], key=lambda k: k["offset"])
        values = [kf["value"] for kf in kfs]
        keyframes[key] = values[0] if len(values) == 1 else values

    kf_str = ",\n    ".join(
        f"{k}: {v}" if not isinstance(v, str) else f'{k}: "{v}"' for k, v in keyframes.items()
    )
    repeat = "Infinity" if timing["iterationCount"] == "infinite" else timing["iterationCount"]
    direction = "alternate" if timing["direction"] in ("alternate", "alternate-reverse") else "normal"

    return f"""// [CSS.A10] Generated Motion One animation for "{name}"
import {{ animate }} from "motion";

export function play{name[0].upper()}{name[1:]}() {{
  return animate(
    "{selector}",
    {{
    {kf_str}
    }},
    {{
      duration: {timing['durationMs'] / 1000},
      delay: {timing['delayMs'] / 1000},
      easing: {easing_str},
      repeat: {repeat},
      direction: "{direction}",
    }}
  );
}}
"""
