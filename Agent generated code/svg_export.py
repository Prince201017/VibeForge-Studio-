"""
[V0.A7] SVG Animation Export
============================
Three flavors of the same SVG output, matching §7 of the spec:
  - SMIL   : <animateTransform>/<animate> tags, no JS or CSS needed at all
  - CSS    : static SVG + a <style> block with @keyframes (best perf, but
             SMIL is deprecated in some engines so this is the safer default)
  - JS     : static SVG + a small requestAnimationFrame driver, for cases
             that need per-frame logic CSS/SMIL can't express

Rect/ellipse layers become native SVG shapes; everything else degrades to
a labeled placeholder <rect> (path/group geometry belongs to the Geometry
Engine's own SVG serializer, which this handoff doesn't include).
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
    if layer.shape == ShapeType.ELLIPSE:
        return f'<ellipse id="{class_name}" class="{class_name}" cx="{w/2}" cy="{h/2}" rx="{w/2}" ry="{h/2}" {fill} {stroke}/>'
    if layer.shape == ShapeType.TEXT:
        text = layer.geometry.get("text", layer.name)
        size = layer.geometry.get("fontSize", 24)
        return f'<text id="{class_name}" class="{class_name}" font-size="{size}" {fill}>{text}</text>'
    return f'<rect id="{class_name}" class="{class_name}" width="{w}" height="{h}" {fill} {stroke}/>'


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


async def export_svg(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    fmt = request.format
    project = request.project
    width, height = request.resolution or (project.width, project.height)
    duration_s = project.duration_ms / 1000

    body_shapes, style_block, script_block = [], [], []

    total = max(1, len(project.layers))
    for idx, layer in enumerate(project.layers):
        class_name = f"l{idx}-{layer.id}"
        body_shapes.append(_shape_svg(layer, class_name))
        steps = _sample(layer, project.duration_ms)

        if fmt == ExportFormat.SVG_SMIL:
            values_x = ";".join(str(s["x"]) for s in steps)
            values_y = ";".join(str(s["y"]) for s in steps)
            values_op = ";".join(str(s["opacity"]) for s in steps)
            key_times = ";".join(str(s["t"]) for s in steps)
            body_shapes.append(
                f'<animateTransform xlink:href="#{class_name}" attributeName="transform" type="translate" '
                f'values="{values_x.replace(";", " 0;")} 0" keyTimes="{key_times}" dur="{duration_s}s" '
                f'repeatCount="indefinite"/>'
            )
            body_shapes.append(
                f'<animate xlink:href="#{class_name}" attributeName="opacity" values="{values_op}" '
                f'keyTimes="{key_times}" dur="{duration_s}s" repeatCount="indefinite"/>'
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
        elif fmt == ExportFormat.SVG_JS:
            script_block.append(f"  {{ el: doc.getElementById('{class_name}'), keys: {steps!r} }},")

        progress_cb((idx + 1) / total * 70, idx + 1, total)

    svg_open = f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' \
                f'viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
    parts = [svg_open]
    if style_block:
        parts.append("<style>" + "\n".join(style_block) + "</style>")
    if fmt == ExportFormat.SVG_JS:
        parts.append(
            "<script><![CDATA[\n"
            "(function(){\n"
            "  var doc = document; var start = performance.now();\n"
            f"  var duration = {project.duration_ms};\n"
            "  var layers = [\n" + "\n".join(script_block) + "\n  ];\n"
            "  function lerp(a,b,t){return a+(b-a)*t;}\n"
            "  function frame(now){\n"
            "    var t = ((now - start) % duration) / duration;\n"
            "    layers.forEach(function(L){\n"
            "      var a=L.keys[0], b=L.keys[L.keys.length-1];\n"
            "      for (var i=0;i<L.keys.length-1;i++){ if(t>=L.keys[i].t && t<=L.keys[i+1].t){ a=L.keys[i]; b=L.keys[i+1]; break; } }\n"
            "      var span = Math.max(1e-6, b.t-a.t); var lt = (t-a.t)/span;\n"
            "      var x=lerp(a.x,b.x,lt), y=lerp(a.y,b.y,lt), op=lerp(a.opacity,b.opacity,lt), rot=lerp(a.rotation,b.rotation,lt);\n"
            "      if (L.el) L.el.setAttribute('transform','translate('+x+','+y+') rotate('+rot+')'), L.el.style.opacity=op;\n"
            "    });\n"
            "    requestAnimationFrame(frame);\n"
            "  }\n"
            "  requestAnimationFrame(frame);\n"
            "})();\n"
            "]]></script>"
        )
    parts.append("\n".join(body_shapes))
    parts.append("</svg>")

    out_path = engine.work_dir / f"export_{time.time_ns()}.svg"
    out_path.write_text("\n".join(parts), encoding="utf-8")
    progress_cb(100, total, total)
    return ExportResult(output_path=out_path, file_size_bytes=out_path.stat().st_size)


def register(engine_instance=engine) -> None:
    for fmt in (ExportFormat.SVG_SMIL, ExportFormat.SVG_CSS, ExportFormat.SVG_JS):
        engine_instance.register(fmt.value, export_svg)
