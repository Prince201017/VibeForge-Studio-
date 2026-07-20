# [CSS.A10] anime_js_generator.py
from .easing_calculator import Easing, easing_to_anime

ANIME_MAP = {
    "translateX": "translateX", "translateY": "translateY", "translateZ": "translateZ",
    "rotate": "rotate", "scale": "scale",
    "opacity": "opacity", "backgroundColor": "backgroundColor",
    "borderRadius": "borderRadius", "width": "width", "height": "height",
}


def generate_anime_code(config: dict) -> str:
    name = config["name"]
    selector = config["selector"]
    timing = config["timing"]
    ease = easing_to_anime(Easing.from_dict(timing["easing"]))

    props = {}
    for track in config["tracks"]:
        if not track.get("enabled", True):
            continue
        key = ANIME_MAP.get(track["property"])
        if not key:
            continue
        kfs = sorted(track["keyframes"], key=lambda k: k["offset"])
        values = [kf["value"] for kf in kfs]
        props[key] = values[0] if len(values) == 1 else values

    props_str = ",\n    ".join(
        f"{k}: {v}" if not isinstance(v, str) else f'{k}: "{v}"' for k, v in props.items()
    )
    loop = "true" if timing["iterationCount"] == "infinite" else timing["iterationCount"]
    direction = "alternate" if timing["direction"] in ("alternate", "alternate-reverse") else "normal"
    stagger = config.get("stagger") or {}
    stagger_line = (
        f'    delay: anime.stagger({stagger.get("delayEachMs", 100)}),\n'
        if stagger.get("enabled")
        else ""
    )

    return f"""// [CSS.A10] Generated Anime.js animation for "{name}"
import anime from "animejs";

export function play{name[0].upper()}{name[1:]}() {{
  return anime({{
    targets: "{selector}",
    {props_str},
    duration: {timing['durationMs']},
{stagger_line}    delay: {timing['delayMs']},
    easing: "{ease}",
    loop: {loop},
    direction: "{direction}",
  }});
}}
"""
