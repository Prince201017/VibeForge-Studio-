# [CSS.A10] web_animation_gen.py
from .easing_calculator import Easing, easing_to_css
from .css_generator import PROPERTY_MAP, _format_value


def generate_waapi_code(config: dict) -> str:
    name = config["name"]
    selector = config["selector"]
    timing = config["timing"]
    easing = easing_to_css(Easing.from_dict(timing["easing"]))

    # Group by offset -> { cssProp: value } exactly like css_generator, but
    # emit as a JS keyframes array instead of @keyframes text.
    offsets: dict[float, dict[str, list[str]]] = {}
    for track in config["tracks"]:
        if not track.get("enabled", True):
            continue
        prop = track["property"]
        host = PROPERTY_MAP[prop][0]
        group_key = "transform" if host == "transform" else "filter" if host == "filter" else host
        for kf in track["keyframes"]:
            offsets.setdefault(kf["offset"], {}).setdefault(group_key, []).append(
                _format_value(prop, kf["value"], kf.get("unit"))
            )

    frames = []
    for offset in sorted(offsets.keys()):
        entries = ", ".join(f'{_to_camel(k)}: "{" ".join(v)}"' for k, v in offsets[offset].items())
        frames.append(f"  {{ offset: {offset}, {entries} }}")
    frames_str = ",\n".join(frames)

    iterations = "Infinity" if timing["iterationCount"] == "infinite" else timing["iterationCount"]

    return f"""// [CSS.A10] Generated Web Animations API code for "{name}" — zero dependencies
const {name}Keyframes = [
{frames_str}
];

const {name}Options = {{
  duration: {timing['durationMs']},
  delay: {timing['delayMs']},
  easing: "{easing}",
  iterations: {iterations},
  direction: "{timing['direction']}",
  fill: "{timing['fillMode']}",
}};

export function play{name[0].upper()}{name[1:]}(target = document.querySelector("{selector}")) {{
  return target.animate({name}Keyframes, {name}Options);
}}
"""


def _to_camel(kebab: str) -> str:
    parts = kebab.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])
