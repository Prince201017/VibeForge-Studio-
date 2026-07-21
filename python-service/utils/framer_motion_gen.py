# [CSS.A10] framer_motion_gen.py
from .easing_calculator import Easing, easing_to_framer


def _to_pascal_case(name: str) -> str:
    words = name.replace("-", " ").replace("_", " ").split()
    return "".join(w[0].upper() + w[1:] if w else w for w in words)

# Maps our internal property keys to the JS keys Framer Motion's `animate` prop expects.
FRAMER_KEY_MAP = {
    "translateX": "x", "translateY": "y", "translateZ": "z",
    "rotate": "rotate", "rotateX": "rotateX", "rotateY": "rotateY", "rotateZ": "rotateZ",
    "scale": "scale", "scaleX": "scaleX", "scaleY": "scaleY",
    "skewX": "skewX", "skewY": "skewY",
    "opacity": "opacity",
    "backgroundColor": "backgroundColor", "color": "color", "borderColor": "borderColor",
    "borderRadius": "borderRadius", "boxShadow": "boxShadow",
    "width": "width", "height": "height",
    "blur": "filter",  # composed specially below
}


def _js_value(v):
    if isinstance(v, str):
        return f'"{v}"'
    return v


def _track_keyframe_lists(tracks: list):
    """Framer Motion supports arrays as keyframe values: x: [0, 100, 50]."""
    animate = {}
    initial = {}
    for track in tracks:
        if not track.get("enabled", True):
            continue
        key = FRAMER_KEY_MAP.get(track["property"])
        if not key:
            continue
        kfs = sorted(track["keyframes"], key=lambda k: k["offset"])
        values = [kf["value"] for kf in kfs]
        initial[key] = values[0]
        animate[key] = values[0] if len(values) == 1 else values
    return initial, animate


def generate_framer_component(config: dict, typescript: bool = True) -> str:
    name = config["name"]
    component_name = _to_pascal_case(name)
    initial, animate = _track_keyframe_lists(config["tracks"])
    timing = config["timing"]
    easing = easing_to_framer(Easing.from_dict(timing["easing"]))
    ease_str = str(easing) if isinstance(easing, str) else str(easing)

    initial_str = ", ".join(f"{k}: {_js_value(v)}" for k, v in initial.items())
    animate_str = ", ".join(
        f"{k}: {v if isinstance(v, (int, float)) else v}" for k, v in animate.items()
    )

    props_type = ": React.PropsWithChildren<{}>" if typescript else ""
    import_line = "import { motion } from 'framer-motion';" + ("\nimport React from 'react';" if typescript else "")

    trigger = config.get("trigger", "load")
    trigger_prop = ""
    if trigger == "hover":
        trigger_prop = f"\n      initial={{{{ {initial_str} }}}}\n      whileHover={{{{ {animate_str} }}}}"
        animate_line = ""
    elif trigger == "click":
        trigger_prop = f"\n      initial={{{{ {initial_str} }}}}\n      whileTap={{{{ {animate_str} }}}}"
        animate_line = ""
    elif trigger == "inView":
        trigger_prop = (
            f"\n      initial={{{{ {initial_str} }}}}"
            f"\n      whileInView={{{{ {animate_str} }}}}"
            f"\n      viewport={{{{ once: true, amount: 0.3 }}}}"
        )
        animate_line = ""
    else:
        trigger_prop = f"\n      initial={{{{ {initial_str} }}}}\n      animate={{{{ {animate_str} }}}}"
        animate_line = ""

    repeat = "Infinity" if timing["iterationCount"] == "infinite" else max(0, timing["iterationCount"] - 1)

    return f"""{import_line}

{f"interface {component_name}Props extends React.PropsWithChildren {{}}" if typescript else ""}

export default function {component_name}({{ children }}{props_type}) {{
  return (
    <motion.div{trigger_prop}
      transition={{{{
        duration: {timing['durationMs'] / 1000},
        delay: {timing['delayMs'] / 1000},
        ease: {ease_str if isinstance(ease_str, str) and not ease_str.startswith('[') else ease_str},
        repeat: {repeat},
        repeatType: '{ "reverse" if timing["direction"] in ("alternate", "alternate-reverse") else "loop" }',
      }}}}
    >
      {{children}}
    </motion.div>
  );
}}
"""
