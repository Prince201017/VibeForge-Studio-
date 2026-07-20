# [CSS.A10] gsap_generator.py
from .easing_calculator import Easing, easing_to_gsap

GSAP_PROP_MAP = {
    "translateX": "x", "translateY": "y", "translateZ": "z",
    "rotate": "rotation", "rotateX": "rotationX", "rotateY": "rotationY", "rotateZ": "rotation",
    "scale": "scale", "scaleX": "scaleX", "scaleY": "scaleY",
    "skewX": "skewX", "skewY": "skewY",
    "opacity": "opacity",
    "backgroundColor": "backgroundColor", "color": "color",
    "borderRadius": "borderRadius", "boxShadow": "boxShadow",
    "width": "width", "height": "height",
    "blur": "filter",
}


def _fmt(v):
    return f'"{v}"' if isinstance(v, str) else v


def generate_gsap_code(config: dict, use_scroll_trigger: bool = False) -> str:
    name = config["name"]
    selector = config["selector"]
    timing = config["timing"]
    ease = easing_to_gsap(Easing.from_dict(timing["easing"]))

    from_props = {}
    to_props = {}
    for track in config["tracks"]:
        if not track.get("enabled", True):
            continue
        gsap_key = GSAP_PROP_MAP.get(track["property"])
        if not gsap_key:
            continue
        kfs = sorted(track["keyframes"], key=lambda k: k["offset"])
        from_props[gsap_key] = kfs[0]["value"]
        to_props[gsap_key] = kfs[-1]["value"]

    to_str = ",\n    ".join(f"{k}: {_fmt(v)}" for k, v in to_props.items())
    from_str = ",\n    ".join(f"{k}: {_fmt(v)}" for k, v in from_props.items())

    repeat = -1 if timing["iterationCount"] == "infinite" else timing["iterationCount"] - 1
    yoyo = "true" if timing["direction"] in ("alternate", "alternate-reverse") else "false"

    scroll_trigger_block = ""
    if use_scroll_trigger or config.get("trigger") == "scroll":
        scroll_trigger_block = f""",
    scrollTrigger: {{
      trigger: "{selector}",
      start: "top 80%",
      toggleActions: "play none none reverse",
    }}"""

    stagger_block = ""
    stagger = config.get("stagger") or {}
    if stagger.get("enabled"):
        stagger_block = f""",
    stagger: {{
      each: {stagger.get('delayEachMs', 100) / 1000},
      from: "{stagger.get('from', 'start')}"
    }}"""

    return f"""// [CSS.A10] Generated GSAP animation for "{name}"
import {{ gsap }} from "gsap";
{"import { ScrollTrigger } from \"gsap/ScrollTrigger\";\ngsap.registerPlugin(ScrollTrigger);" if (use_scroll_trigger or config.get("trigger") == "scroll") else ""}

export function play{name[0].upper()}{name[1:]}() {{
  gsap.fromTo(
    "{selector}",
    {{
    {from_str}
    }},
    {{
    {to_str},
      duration: {timing['durationMs'] / 1000},
      delay: {timing['delayMs'] / 1000},
      ease: "{ease}",
      repeat: {repeat},
      yoyo: {yoyo}{stagger_block}{scroll_trigger_block}
    }}
  );
}}
"""


def generate_gsap_timeline(configs: list) -> str:
    """Chains multiple AnimationConfigs into a single GSAP timeline (for sequenced/multi-track compositions)."""
    lines = ["// [CSS.A10] Chained GSAP timeline", "import { gsap } from \"gsap\";", "",
             "export function playTimeline() {", "  const tl = gsap.timeline();"]
    for cfg in configs:
        timing = cfg["timing"]
        ease = easing_to_gsap(Easing.from_dict(timing["easing"]))
        to_props = {}
        for track in cfg["tracks"]:
            if not track.get("enabled", True):
                continue
            key = GSAP_PROP_MAP.get(track["property"])
            if key:
                to_props[key] = sorted(track["keyframes"], key=lambda k: k["offset"])[-1]["value"]
        to_str = ", ".join(f"{k}: {_fmt(v)}" for k, v in to_props.items())
        lines.append(
            f'  tl.to("{cfg["selector"]}", {{ {to_str}, duration: {timing["durationMs"]/1000}, ease: "{ease}" }});'
        )
    lines.append("  return tl;")
    lines.append("}")
    return "\n".join(lines)
