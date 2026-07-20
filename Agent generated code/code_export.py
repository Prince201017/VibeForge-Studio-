"""
[V0.A7] CSS/HTML/Motion-Library Code Generation
================================================
Turns a ProjectData timeline into copy-paste-ready code for 9 of the 11
"code" formats in the registry (CSS, HTML, TSX/Framer Motion, GSAP, Motion
One, Anime.js, Web Animation API are template-driven below; Tailwind and
styled-components are generated inline since they're thin variants of the
CSS/HTML output rather than needing their own timeline model). Three.js is
handled separately in `three_js_export.py`-equivalent logic at the bottom
since it targets a 3D scene graph, not DOM elements.

All formats share one intermediate representation — `_layer_view()` below —
built once per export and fed to whichever Jinja2 template matches the
requested format. That's what keeps 800 LOC of format-specific templates
from drifting out of sync with each other.
"""
from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from models.schemas import EasingType, ExportFormat, ExportRequest, Layer, ProjectData
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import interpolate_properties

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(disabled_extensions=("jinja2",)),
    trim_blocks=True,
    lstrip_blocks=True,
)

_CSS_EASING = {
    EasingType.LINEAR: "linear", EasingType.EASE_IN: "ease-in",
    EasingType.EASE_OUT: "ease-out", EasingType.EASE_IN_OUT: "ease-in-out",
    EasingType.CUBIC_BEZIER: "cubic-bezier(.4,0,.2,1)", EasingType.SPRING: "ease-in-out",
    EasingType.STEPS: "steps(6, end)",
}
_GSAP_EASING = {
    EasingType.LINEAR: "none", EasingType.EASE_IN: "power2.in",
    EasingType.EASE_OUT: "power2.out", EasingType.EASE_IN_OUT: "power2.inOut",
    EasingType.CUBIC_BEZIER: "power2.inOut", EasingType.SPRING: "elastic.out(1,0.4)",
    EasingType.STEPS: "steps(6)",
}


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return slug or "layer"


def _sample_steps(layer: Layer, duration_ms: float, n_steps: int = 8) -> list[dict[str, Any]]:
    steps = []
    for i in range(n_steps):
        t_ms = duration_ms * i / (n_steps - 1) if n_steps > 1 else 0
        props = interpolate_properties(layer, t_ms)
        prev_t = duration_ms * (i - 1) / (n_steps - 1) if i > 0 else t_ms
        steps.append({
            "percent": round(i / (n_steps - 1) * 100) if n_steps > 1 else 0,
            "offset": round(i / (n_steps - 1), 4) if n_steps > 1 else 0,
            "x": round(props.get("x", 0.0), 2), "y": round(props.get("y", 0.0), 2),
            "scaleX": round(props.get("scaleX", 1.0), 3), "scaleY": round(props.get("scaleY", 1.0), 3),
            "rotation": round(props.get("rotation", 0.0), 2),
            "opacity": round(props.get("opacity", 1.0), 3),
            "absolute_time_s": round(t_ms / 1000, 3),
            "segment_duration_s": round((t_ms - prev_t) / 1000, 3) or 0.01,
        })
    return steps


def _layer_view(layer: Layer, duration_ms: float) -> dict[str, Any]:
    steps = _sample_steps(layer, duration_ms)
    width = layer.geometry.get("width", 100)
    height = layer.geometry.get("height", 100)

    # Pre-rendered JS/JSX object-literal snippets (each includes its own
    # surrounding `{ ... }`). Building these in Python — rather than nesting
    # `{{ ... }}` Jinja expressions inside a JSX `{{ ... }}` double-brace —
    # sidesteps a real Jinja footgun: "style={{ x: {{ val }} }}" reads as a
    # single malformed Jinja tag ("x: {{ val" up to the first "}}"), not two
    # nested ones. Precomputing the whole snippet keeps every template a
    # single flat `{{ layer.whatever_str }}` substitution.
    # NOTE: these are built with plain string concatenation, not f'{{ ... }}'.
    # An f-string turns doubled braces into a *single* literal brace (that's
    # f-string escaping) — but JSX's style={{ ... }} genuinely needs a literal
    # double brace in the output, so f-string interpolation would silently
    # halve it. Concatenating a literal "{{" / "}}" string sidesteps that.
    fill_line = 'background: "' + layer.fill + '", ' if layer.fill else ""
    style_str = "{{ position: \"absolute\", width: " + str(width) + ", height: " + str(height) + ", " + fill_line + "}}"

    s0 = steps[0]
    initial_str = (
        "{{ x: " + str(s0["x"]) + ", y: " + str(s0["y"]) + ", scale: " + str(s0["scaleX"])
        + ", rotate: " + str(s0["rotation"]) + ", opacity: " + str(s0["opacity"]) + " }}"
    )

    def _list(key: str) -> str:
        return ", ".join(str(s[key]) for s in steps)

    animate_str = (
        "{{ x: [" + _list("x") + "], y: [" + _list("y") + "], scale: [" + _list("scaleX")
        + "], rotate: [" + _list("rotation") + "], opacity: [" + _list("opacity") + "] }}"
    )

    return {
        "name": layer.name,
        "class_name": _slugify(layer.name) + "-" + layer.id,
        "fill": layer.fill,
        "stroke": layer.stroke,
        "stroke_width": layer.stroke_width,
        "width": width,
        "height": height,
        "steps": steps,
        "style_str": style_str,
        "initial_str": initial_str,
        "animate_str": animate_str,
    }


def _dominant_easing(project: ProjectData) -> EasingType:
    for layer in project.layers:
        for kf in layer.keyframes:
            return kf.easing.type
    return EasingType.EASE_IN_OUT


def _base_context(request: ExportRequest) -> dict[str, Any]:
    project = request.project
    layers = [_layer_view(l, project.duration_ms) for l in project.layers]
    easing = _dominant_easing(project)
    return {
        "layers": layers,
        "width": request.resolution[0] if request.resolution else project.width,
        "height": request.resolution[1] if request.resolution else project.height,
        "duration_s": round(project.duration_ms / 1000, 3),
        "duration_ms": round(project.duration_ms),
        "background": project.background,
        "loop": True,
        "title": request.metadata.title or project.name,
        "typescript": request.code.typescript,
        "css_scope": request.code.css_scope,
        "include_responsive": request.code.include_responsive,
        "component_name": _pascal_case(request.code.component_name),
        "easing_css": _CSS_EASING.get(easing, "ease-in-out"),
        "gsap_easing": _GSAP_EASING.get(easing, "power2.inOut"),
        "framer_easing": '"easeInOut"' if easing != EasingType.LINEAR else '"linear"',
        "motion_one_easing": "ease-in-out",
        "anime_easing": "easeInOutQuad",
        "waapi_easing": "ease-in-out",
        "stage_style_str": _stage_style_str(request, project),
        "transition_str": _transition_str(project, easing),
    }


def _stage_style_str(request: ExportRequest, project: ProjectData) -> str:
    w = request.resolution[0] if request.resolution else project.width
    h = request.resolution[1] if request.resolution else project.height
    return "{{ position: \"relative\", width: " + str(w) + ", height: " + str(h) + " }}"


def _transition_str(project: ProjectData, easing: EasingType) -> str:
    ease_js = '"linear"' if easing == EasingType.LINEAR else '"easeInOut"'
    duration = round(project.duration_ms / 1000, 3)
    return "{{ duration: " + str(duration) + ", ease: " + ease_js + ", repeat: Infinity }}"


def _pascal_case(name: str) -> str:
    parts = re.split(r"[^a-zA-Z0-9]+", name)
    return "".join(p[:1].upper() + p[1:] for p in parts if p) or "AnimatedComponent"


_TEMPLATE_BY_FORMAT = {
    ExportFormat.CSS: "css_animation.jinja2",
    ExportFormat.FRAMER_MOTION: "framer_motion_component.jinja2",
    ExportFormat.TSX: "framer_motion_component.jinja2",
    ExportFormat.GSAP: "gsap_animation.jinja2",
    ExportFormat.MOTION_ONE: "motion_one_component.jinja2",
    ExportFormat.ANIME_JS: "anime_js_animation.jinja2",
    ExportFormat.WEB_ANIMATION_API: "web_animation_api.jinja2",
}

_EXTENSION_BY_FORMAT = {
    ExportFormat.CSS: ".css",
    ExportFormat.HTML: ".html",
    ExportFormat.TSX: ".tsx",
    ExportFormat.FRAMER_MOTION: ".tsx",
    ExportFormat.GSAP: ".js",
    ExportFormat.MOTION_ONE: ".js",
    ExportFormat.ANIME_JS: ".js",
    ExportFormat.WEB_ANIMATION_API: ".js",
    ExportFormat.THREE_JS: ".js",
    ExportFormat.TAILWIND: ".tsx",
    ExportFormat.STYLED_COMPONENTS: ".tsx",
}


async def export_code(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    progress_cb(10, 0, 1)
    fmt = request.format
    ctx = _base_context(request)

    if fmt == ExportFormat.HTML:
        css_body = _env.get_template("css_animation.jinja2").render(**ctx)
        code = _env.get_template("html_page.jinja2").render(**ctx, css_body=css_body)
    elif fmt == ExportFormat.TAILWIND:
        code = _render_tailwind(ctx)
    elif fmt == ExportFormat.STYLED_COMPONENTS:
        code = _render_styled_components(ctx)
    elif fmt == ExportFormat.THREE_JS:
        code = _render_three_js(ctx)
    elif fmt in _TEMPLATE_BY_FORMAT:
        code = _env.get_template(_TEMPLATE_BY_FORMAT[fmt]).render(**ctx)
    else:
        raise ValueError(f"{fmt} has no code template registered")

    progress_cb(70, 0, 1)
    if request.code.minify:
        code = _minify(code, fmt)

    ext = _EXTENSION_BY_FORMAT.get(fmt, ".txt")
    if fmt != ExportFormat.HTML:  # HTML gets its metadata via a <meta> tag instead of a comment header
        from services.metadata_export import code_header_comment
        code = code_header_comment(request.metadata, ext) + code
    out_path = engine.work_dir / f"export_{time.time_ns()}{ext}"
    out_path.write_text(code, encoding="utf-8")
    progress_cb(100, 1, 1)
    return ExportResult(output_path=out_path, file_size_bytes=out_path.stat().st_size)


def _render_tailwind(ctx: dict[str, Any]) -> str:
    lines = [
        f'// [V0.A7] Tailwind export — {ctx["component_name"]}',
        '// Arbitrary-value utility classes stand in for the @keyframes block;',
        '// add matching entries to tailwind.config.js `theme.extend.keyframes` for named utilities.',
        "export default function " + ctx["component_name"] + "() {",
        "  return (",
        f'    <div className="relative" style={{{{ width: {ctx["width"]}, height: {ctx["height"]} }}}}>',
    ]
    for layer in ctx["layers"]:
        first, last = layer["steps"][0], layer["steps"][-1]
        classes = (
            f'absolute w-[{layer["width"]}px] h-[{layer["height"]}px] '
            f'transition-all duration-[{ctx["duration_ms"]}ms] ease-in-out '
            f'translate-x-[{first["x"]}px] translate-y-[{first["y"]}px] '
            f'hover:translate-x-[{last["x"]}px] hover:translate-y-[{last["y"]}px] '
            f'hover:rotate-[{last["rotation"]}deg] hover:opacity-[{last["opacity"]}]'
        )
        lines.append(f'      <div className="{classes}" />')
    lines += ["    </div>", "  );", "}"]
    return "\n".join(lines)


def _render_styled_components(ctx: dict[str, Any]) -> str:
    lines = [
        f'// [V0.A7] styled-components export — {ctx["component_name"]}',
        'import styled, { keyframes } from "styled-components";',
        "",
    ]
    for layer in ctx["layers"]:
        kf_name = layer["class_name"].replace("-", "_") + "_kf"
        lines.append(f"const {kf_name} = keyframes`")
        for step in layer["steps"]:
            lines.append(
                f'  {step["percent"]}% {{ transform: translate({step["x"]}px, {step["y"]}px) '
                f'scale({step["scaleX"]}, {step["scaleY"]}) rotate({step["rotation"]}deg); '
                f'opacity: {step["opacity"]}; }}'
            )
        lines.append("`;\n")
        var_name = _pascal_case(layer["name"])
        lines.append(f"export const {var_name} = styled.div`")
        lines.append(f'  position: absolute; width: {layer["width"]}px; height: {layer["height"]}px;')
        if layer["fill"]:
            lines.append(f'  background: {layer["fill"]};')
        lines.append(f"  animation: {kf_name} {ctx['duration_s']}s ease-in-out infinite;")
        lines.append("`;\n")
    return "\n".join(lines)


def _render_three_js(ctx: dict[str, Any]) -> str:
    lines = [
        "// [V0.A7] Three.js export — position/rotation/scale keyframes on a Group per layer",
        'import * as THREE from "three";',
        "",
        f"export function build{ctx['component_name']}(scene) {{",
        "  const clock = new THREE.Clock();",
        "  const layers = [];",
    ]
    for layer in ctx["layers"]:
        lines.append(f'  {{')
        lines.append(f'    const geo = new THREE.PlaneGeometry({layer["width"]}, {layer["height"]});')
        color = layer["fill"] or "#888888"
        lines.append(f'    const mat = new THREE.MeshBasicMaterial({{ color: "{color}", transparent: true }});')
        lines.append(f'    const mesh = new THREE.Mesh(geo, mat);')
        lines.append(f'    mesh.name = "{layer["name"]}";')
        lines.append(f'    scene.add(mesh);')
        keys = [{"t": s["offset"], "x": s["x"], "y": -s["y"], "rot": s["rotation"], "op": s["opacity"]} for s in layer["steps"]]
        lines.append(f"    layers.push({{ mesh, keys: {keys!r} }});")
        lines.append(f'  }}')
    lines += [
        f"  const duration = {ctx['duration_s']};",
        "  return function tick() {",
        "    const t = (clock.getElapsedTime() % duration) / duration;",
        "    for (const { mesh, keys } of layers) {",
        "      let a = keys[0], b = keys[keys.length - 1];",
        "      for (let i = 0; i < keys.length - 1; i++) {",
        "        if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }",
        "      }",
        "      const span = Math.max(1e-6, b.t - a.t);",
        "      const lt = (t - a.t) / span;",
        "      mesh.position.set(a.x + (b.x - a.x) * lt, a.y + (b.y - a.y) * lt, 0);",
        "      mesh.rotation.z = THREE.MathUtils.degToRad(a.rot + (b.rot - a.rot) * lt);",
        "      mesh.material.opacity = a.op + (b.op - a.op) * lt;",
        "    }",
        "  };",
        "}",
    ]
    return "\n".join(lines)


def _minify(code: str, fmt: ExportFormat) -> str:
    """Lightweight, dependency-free minification: strips comments/blank lines
    and collapses indentation. Real production minification should shell out
    to `esbuild`/`terser`/`cssnano` (see Asset Optimization §10) — that's a
    Node-toolchain dependency this Python service doesn't assume is present."""
    lines = [ln.strip() for ln in code.splitlines()]
    lines = [ln for ln in lines if ln and not ln.startswith("//") and not ln.startswith("/*")]
    return " ".join(lines) if fmt in (ExportFormat.CSS, ExportFormat.TAILWIND) else "\n".join(lines)


def register(engine_instance=engine) -> None:
    for fmt in (
        ExportFormat.CSS, ExportFormat.HTML, ExportFormat.TSX, ExportFormat.FRAMER_MOTION,
        ExportFormat.GSAP, ExportFormat.MOTION_ONE, ExportFormat.ANIME_JS,
        ExportFormat.WEB_ANIMATION_API, ExportFormat.THREE_JS, ExportFormat.TAILWIND,
        ExportFormat.STYLED_COMPONENTS,
    ):
        engine_instance.register(fmt.value, export_code)
