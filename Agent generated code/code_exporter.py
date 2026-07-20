# [V0.A7] Code export: scene graph -> React/CSS/SVG source (feeds into 10-css-codegen
# for animation-aware output; this handles static structural export).
from __future__ import annotations
import json

from .base import Exporter, ExportJob, ExportResult


class CodeExporter(Exporter):
    format_name = "code"

    SUPPORTED_TARGETS = {"react", "html", "svg", "json"}

    def validate_options(self, options: dict) -> None:
        target = options.get("target", "react")
        if target not in self.SUPPORTED_TARGETS:
            raise ValueError(f"Unsupported code target: {target}")

    async def export(self, job: ExportJob) -> ExportResult:
        self.validate_options(job.options)
        target = job.options.get("target", "react")
        nodes = job.scene.get("nodes", [])

        if target == "json":
            src = json.dumps(job.scene, indent=2)
            ext, mime = "json", "application/json"
        elif target == "svg":
            src = self._to_svg(nodes, job.scene.get("width", 800), job.scene.get("height", 600))
            ext, mime = "svg", "image/svg+xml"
        elif target == "html":
            src = self._to_html(nodes)
            ext, mime = "html", "text/html"
        else:  # react
            src = self._to_react(nodes)
            ext, mime = "jsx", "text/plain"

        return ExportResult(
            job_id=job.job_id,
            file_bytes=src.encode("utf-8"),
            mime_type=mime,
            filename=f"export_{job.job_id}.{ext}",
        )

    def _to_svg(self, nodes: list[dict], w: int, h: int) -> str:
        els = []
        for n in nodes:
            kind = n.get("type")
            props = n.get("props", {})
            if kind == "shape" and props.get("kind") == "circle":
                els.append(f'<circle cx="{props.get("x", 0)}" cy="{props.get("y", 0)}" r="{props.get("r", 10)}" fill="{props.get("fill", "#000")}"/>')
            elif kind == "shape":
                els.append(f'<rect x="{props.get("x", 0)}" y="{props.get("y", 0)}" width="{props.get("w", 10)}" height="{props.get("h", 10)}" fill="{props.get("fill", "#000")}"/>')
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">{"".join(els)}</svg>'

    def _to_html(self, nodes: list[dict]) -> str:
        divs = [f'<div class="node node-{i}"></div>' for i, _ in enumerate(nodes)]
        return f"<!doctype html><html><body>{''.join(divs)}</body></html>"

    def _to_react(self, nodes: list[dict]) -> str:
        children = "\n".join(f'      <div key="{i}" className="node" />' for i, _ in enumerate(nodes))
        return f"export default function ExportedDesign() {{\n  return (\n    <div className=\"design-root\">\n{children}\n    </div>\n  );\n}}\n"
