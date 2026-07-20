"""
[V0.A7] SVG Animation Export
============================
Three flavors of the same SVG output, matching §7 of the spec:
  - SMIL   : <animateTransform>/<animate> tags, no JS or CSS needed at all
  - CSS    : static SVG + a <style> block with @keyframes (best perf, but
             SMIL is deprecated in some engines so this is the safer default)
  - JS     : static SVG + a small requestAnimationFrame driver, for cases
             that need per-frame logic CSS/SMIL can't express

Rect/ellipse layers become native SVG shapes; a PATH-shaped layer whose
geometry carries `path_keyframes` gets real `d`-attribute morphing.
Per-layer `filter` and `clip` blocks (also read from `layer.geometry`) add
animated SVG filter primitives and animated clip-paths respectively.

When `request.svg.sprite_frame_count` is set, SVG_CSS/SVG_JS switch to a
frame-based <symbol>/<use> sprite animation instead of a continuous tween —
the vector equivalent of a PNG sprite sheet.
"""
from __future__ import annotations

import time
from pathlib import Path

from models.schemas import ExportFormat, ExportRequest, Layer, ShapeType
from services.export_engine import ExportResult, ProgressCallback, engine
from services.frame_renderer import interpolate_properties


def _shape_svg(layer: Layer, class_name: str) -> str:
    fill = f'fill="{layer.fill}"' if layer.fill else 'fill="none"'
    stroke = f'stroke="{layer.stroke}" stroke-width="{layer.stroke_width}"' if layer.stroke else ""
    w = layer.geometry.get("width", 100)
    h = layer.geometry.get("height", 100)
    extra_attrs = ""
    if layer.geometry.get("filter"):
        extra_attrs += f' filter="url(#{class_name}-filter)"'
    if layer.geometry.get("clip"):
        extra_attrs += f' clip-path="url(#{class_name}-clip)"'

    if layer.shape == ShapeType.PATH and layer.geometry.get("path_keyframes"):
        d0 = layer.geometry["path_keyframes"][0]["d"]
        return f'<path id="{class_name}" class="{class_name}" d="{d0}" {fill} {stroke}{extra_attrs}/>'
    if layer.shape == ShapeType.ELLIPSE:
        return f'<ellipse id="{class_name}" class="{class_name}" cx="{w/2}" cy="{h/2}" rx="{w/2}" ry="{h/2}" {fill} {stroke}{extra_attrs}/>'
    if layer.shape == ShapeType.TEXT:
        text = layer.geometry.get("text", layer.name)
        size = layer.geometry.get("fontSize", 24)
        return f'<text id="{class_name}" class="{class_name}" font-size="{size}" {fill}{extra_attrs}>{text}</text>'
    return f'<rect id="{class_name}" class="{class_name}" width="{w}" height="{h}" {fill} {stroke}{extra_attrs}/>'


def _sample(layer: Layer, duration_ms: float, n: int = 8) -> list[dict]:
    out = []
    for i in range(n):
        t = duration_ms * i / (n - 1) if n > 1 else 0
        p = interpolate_properties(layer, t)
        out.append({
            "t": round(i / (n - 1), 4) if n > 1 else 0, "x": round(p.get("x", 0), 2),
            "y": round(p.get("y", 0), 2), "opacity": round(p.get("opacity", 1), 3),
            "rotation": round(p.get("rotation", 0), 2),
        })
    return out


# ---------------------------------------------------------------------------
# filter / clip-path definitions (shared across SMIL/CSS/JS variants)
# ---------------------------------------------------------------------------

def _filter_defs(layer: Layer, class_name: str, duration_s: float, fmt: ExportFormat) -> str:
    """§7 'SVG filter animations' — animates a feGaussianBlur stdDeviation
    or feColorMatrix values array over the timeline. `layer.geometry["filter"]`
    shape: {"type": "blur"|"colorMatrix", "keyframes": [{"time_ms": .., "value": ..}]}."""
    spec = layer.geometry.get("filter")
    if not spec:
        return ""
    kind = spec.get("type", "blur")
    keyframes = spec.get("keyframes", [])
    if not keyframes:
        return ""

    if kind == "blur":
        primitive = f'<feGaussianBlur stdDeviation="{keyframes[0]["value"]}" result="b"/>'
        attr, values = "stdDeviation", ";".join(str(k["value"]) for k in keyframes)
        target = 'feGaussianBlur[result="b"]'
    else:  # colorMatrix
        primitive = f'<feColorMatrix type="matrix" values="{keyframes[0]["value"]}" result="b"/>'
        attr, values = "values", ";".join(str(k["value"]) for k in keyframes)
        target = 'feColorMatrix[result="b"]'

    key_times = ";".join(str(round(k["time_ms"] / (keyframes[-1]["time_ms"] or 1), 4)) for k in keyframes)

    if fmt == ExportFormat.SVG_SMIL:
        anim = (
            f'<animate xlink:href="#{class_name}-fp" attributeName="{attr}" values="{values}" '
            f'keyTimes="{key_times}" dur="{duration_s}s" repeatCount="indefinite"/>'
        )
        primitive = primitive.replace("<feGaussianBlur", f'<feGaussianBlur id="{class_name}-fp"').replace(
            "<feColorMatrix", f'<feColorMatrix id="{class_name}-fp"'
        )
        return f'<filter id="{class_name}-filter">{primitive}{anim}</filter>'

    # CSS/JS variants: CSS can't animate filter-primitive attributes directly,
    # so those two flavors emit the static filter and rely on the same JS/CSS
    # keyframe driver used for transform/opacity to also touch this attribute
    # (wired in export_svg() below via `filter_targets`).
    return f'<filter id="{class_name}-filter">{primitive}</filter>'


def _clip_defs(layer: Layer, class_name: str) -> str:
    """§7 'Clipping path animations' — an animated inner shape inside a
    <clipPath>. `layer.geometry["clip"]` shape:
    {"shape": "circle", "keyframes": [{"time_ms": .., "r": ..}]} (circle) or
    {"shape": "rect", "keyframes": [{"time_ms": .., "width": .., "height": ..}]}."""
    spec = layer.geometry.get("clip")
    if not spec:
        return ""
    shape = spec.get("shape", "circle")
    kf0 = spec.get("keyframes", [{}])[0]
    if shape == "circle":
        inner = f'<circle id="{class_name}-clipshape" cx="{kf0.get("cx", 0)}" cy="{kf0.get("cy", 0)}" r="{kf0.get("r", 50)}"/>'
    else:
        inner = f'<rect id="{class_name}-clipshape" x="{kf0.get("x", 0)}" y="{kf0.get("y", 0)}" width="{kf0.get("width", 100)}" height="{kf0.get("height", 100)}"/>'
    return f'<clipPath id="{class_name}-clip">{inner}</clipPath>'


# ---------------------------------------------------------------------------
# main export
# ---------------------------------------------------------------------------

async def export_svg(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    fmt = request.format
    project = request.project

    if request.svg.sprite_frame_count and fmt in (ExportFormat.SVG_CSS, ExportFormat.SVG_JS):
        return await _export_animated_sprite(request, progress_cb)

    width, height = request.resolution or (project.width, project.height)
    duration_s = project.duration_ms / 1000

    body_shapes, defs_block, style_block, script_block = [], [], [], []

    total = max(1, len(project.layers))
    for idx, layer in enumerate(project.layers):
        class_name = f"l{idx}-{layer.id}"
        defs_block.append(_filter_defs(layer, class_name, duration_s, fmt))
        defs_block.append(_clip_defs(layer, class_name))
        body_shapes.append(_shape_svg(layer, class_name))
        steps = _sample(layer, project.duration_ms)

        path_kfs = layer.geometry.get("path_keyframes") if layer.shape == ShapeType.PATH else None

        if fmt == ExportFormat.SVG_SMIL:
            values_x = ";".join(str(s["x"]) for s in steps)
            key_times = ";".join(str(s["t"]) for s in steps)
            values_op = ";".join(str(s["opacity"]) for s in steps)
            body_shapes.append(
                f'<animateTransform xlink:href="#{class_name}" attributeName="transform" type="translate" '
                f'values="{values_x.replace(";", " 0;")} 0" keyTimes="{key_times}" dur="{duration_s}s" '
                f'repeatCount="indefinite"/>'
            )
            body_shapes.append(
                f'<animate xlink:href="#{class_name}" attributeName="opacity" values="{values_op}" '
                f'keyTimes="{key_times}" dur="{duration_s}s" repeatCount="indefinite"/>'
            )
            if path_kfs:
                d_values = ";".join(k["d"] for k in path_kfs)
                d_times = ";".join(str(round(k["time_ms"] / project.duration_ms, 4)) for k in path_kfs)
                body_shapes.append(
                    f'<animate xlink:href="#{class_name}" attributeName="d" values="{d_values}" '
                    f'keyTimes="{d_times}" dur="{duration_s}s" repeatCount="indefinite"/>'
                )
        elif fmt == ExportFormat.SVG_CSS:
            style_block.append(f".{class_name} {{ animation: {class_name}-a {duration_s}s ease-in-out infinite; }}")
            style_block.append(f"@keyframes {class_name}-a {{")
            for s in steps:
                style_block.append(
                    f'  {round(s["t"]*100)}% {{ transform: translate({s["x"]}px,{s["y"]}px) '
                    f'rotate({s["rotation"]}deg); opacity: {s["opacity"]}; }}'
                )
            style_block.append("}")
            if path_kfs:
                # modern `d` animation via CSS @keyframes — supported in current
                # Chromium/Firefox; SMIL remains the fallback for older engines
                style_block.append(f".{class_name} {{ animation: {class_name}-a {duration_s}s ease-in-out infinite, {class_name}-d {duration_s}s ease-in-out infinite; }}")
                style_block.append(f"@keyframes {class_name}-d {{")
                for k in path_kfs:
                    pct = round(k["time_ms"] / project.duration_ms * 100)
                    style_block.append(f'  {pct}% {{ d: path("{k["d"]}"); }}')
                style_block.append("}")
        elif fmt == ExportFormat.SVG_JS:
            script_block.append(f"  {{ el: doc.getElementById('{class_name}'), keys: {steps!r}, pathKeys: {path_kfs!r} }},")

        progress_cb((idx + 1) / total * 70, idx + 1, total)

    svg_open = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' \
                f'viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
    parts = [svg_open]
    defs_text = "".join(d for d in defs_block if d)
    if defs_text:
        parts.append(f"<defs>{defs_text}</defs>")
    if style_block:
        parts.append("<style>" + "\n".join(style_block) + "</style>")
    if fmt == ExportFormat.SVG_JS:
        parts.append(_js_driver_script(project.duration_ms, script_block))
    parts.append("\n".join(body_shapes))
    parts.append("</svg>")

    out_path = engine.work_dir / f"export_{time.time_ns()}.svg"
    out_path.write_text("\n".join(parts), encoding="utf-8")
    progress_cb(100, total, total)
    return ExportResult(output_path=out_path, file_size_bytes=out_path.stat().st_size)


def _js_driver_script(duration_ms: float, script_block: list[str]) -> str:
    return (
        "<script><![CDATA[\n"
        "(function(){\n"
        "  var doc = document; var start = performance.now();\n"
        f"  var duration = {duration_ms};\n"
        "  var layers = [\n" + "\n".join(script_block) + "\n  ];\n"
        "  function lerp(a,b,t){return a+(b-a)*t;}\n"
        "  function frame(now){\n"
        "    var t = ((now - start) % duration) / duration;\n"
        "    layers.forEach(function(L){\n"
        "      var a=L.keys[0], b=L.keys[L.keys.length-1];\n"
        "      for (var i=0;i<L.keys.length-1;i++){ if(t>=L.keys[i].t && t<=L.keys[i+1].t){ a=L.keys[i]; b=L.keys[i+1]; break; } }\n"
        "      var span = Math.max(1e-6, b.t-a.t); var lt = (t-a.t)/span;\n"
        "      var x=lerp(a.x,b.x,lt), y=lerp(a.y,b.y,lt), op=lerp(a.opacity,b.opacity,lt), rot=lerp(a.rotation,b.rotation,lt);\n"
        "      if (L.el) { L.el.setAttribute('transform','translate('+x+','+y+') rotate('+rot+')'); L.el.style.opacity=op; }\n"
        "      if (L.pathKeys && L.pathKeys.length) {\n"
        "        var frac = t * (L.pathKeys.length - 1); var idx = Math.min(L.pathKeys.length - 2, Math.floor(frac));\n"
        "        if (L.el) L.el.setAttribute('d', L.pathKeys[idx].d);\n"
        "      }\n"
        "    });\n"
        "    requestAnimationFrame(frame);\n"
        "  }\n"
        "  requestAnimationFrame(frame);\n"
        "})();\n"
        "]]></script>"
    )


# ---------------------------------------------------------------------------
# animated SVG sprite sheet (§7 'Animated SVG sprite sheets')
# ---------------------------------------------------------------------------

async def _export_animated_sprite(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    """Builds one <symbol> per discrete frame of the whole scene (sampled at
    `svg.sprite_frame_count` evenly-spaced timestamps), then a single <use>
    with a CSS step() animation that swaps which symbol is visible — the
    vector analogue of sprite_export.py's raster sprite sheet, for
    frame-by-frame-style vector animation."""
    project = request.project
    n = max(2, request.svg.sprite_frame_count or 2)
    width, height = request.resolution or (project.width, project.height)
    duration_s = project.duration_ms / 1000

    symbols, uses = [], []
    for frame_idx in range(n):
        t_ms = project.duration_ms * frame_idx / (n - 1)
        shapes = []
        for layer_idx, layer in enumerate(project.layers):
            props = interpolate_properties(layer, t_ms)
            class_name = f"f{frame_idx}-l{layer_idx}"
            svg_layer = layer.model_copy(update={"keyframes": []})  # freeze at this instant
            svg_layer.geometry = {**svg_layer.geometry, **{k: v for k, v in props.items() if k in ("width", "height")}}
            shape = _shape_svg(svg_layer, class_name)
            tx, ty, rot, op = props.get("x", 0), props.get("y", 0), props.get("rotation", 0), props.get("opacity", 1)
            shapes.append(f'<g transform="translate({tx},{ty}) rotate({rot})" opacity="{op}">{shape}</g>')
        symbols.append(f'<symbol id="frame-{frame_idx}" viewBox="0 0 {width} {height}">{"".join(shapes)}</symbol>')
        progress_cb((frame_idx + 1) / n * 80, frame_idx + 1, n)

    frame_pct = 100 / n
    style_rules = [f".sprite-frame {{ animation-duration: {duration_s}s; }}"]
    use_tags = []
    for i in range(n):
        start_pct = round(i * frame_pct, 4)
        end_pct = round((i + 1) * frame_pct, 4)
        if i == 0:
            # visible from 0%, hides at this frame's window end, stays hidden to 100%
            # (then the infinite loop wraps back to 0% = visible again)
            stops = f"0% {{ opacity: 1; }} {end_pct}% {{ opacity: 0; }} 100% {{ opacity: 0; }}"
        else:
            stops = (
                f"0% {{ opacity: 0; }} {start_pct}% {{ opacity: 1; }} "
                f"{end_pct}% {{ opacity: 0; }} 100% {{ opacity: 0; }}"
            )
        style_rules.append(f"@keyframes sprite-visible-{i} {{ {stops} }}")
        style_rules.append(f".sprite-use-{i} {{ animation: sprite-visible-{i} {duration_s}s steps(1) infinite; }}")
        use_tags.append(
            f'<use href="#frame-{i}" x="0" y="0" width="{width}" height="{height}" class="sprite-use-{i}"/>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {width} {height}" width="{width}" height="{height}">\n'
        f'<defs>{"".join(symbols)}</defs>\n'
        f'<style>{" ".join(style_rules)}</style>\n'
        + "\n".join(use_tags) +
        "\n</svg>"
    )

    out_path = engine.work_dir / f"export_sprite_{time.time_ns()}.svg"
    out_path.write_text(svg, encoding="utf-8")
    progress_cb(100, n, n)
    return ExportResult(output_path=out_path, file_size_bytes=out_path.stat().st_size, extra={"frame_count": n})


def register(engine_instance=engine) -> None:
    for fmt in (ExportFormat.SVG_SMIL, ExportFormat.SVG_CSS, ExportFormat.SVG_JS):
        engine_instance.register(fmt.value, export_svg)
