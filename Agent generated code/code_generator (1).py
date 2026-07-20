"""
[Claude.A14] Code Generation Assistant (spec section 5).

Generates React components, CSS animations, Tailwind classes, Next.js
pages, and TypeScript interfaces from a design/layer description, and
can suggest incremental code improvements on existing snippets.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Literal

from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_code_generation_prompt
from utils.model_selector import Capability
from utils.prompt_builder import build_system_prompt, build_user_prompt

logger = logging.getLogger("ai_engine.code_generator")

Framework = Literal["react", "nextjs", "html", "css"]


class GeneratedCode:
    def __init__(self, code: str, file_name: str, types: str | None = None):
        self.code = code
        self.file_name = file_name
        self.types = types

    def to_dict(self) -> dict[str, Any]:
        return {"code": self.code, "fileName": self.file_name, "types": self.types}


class CodeGenerator:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def generate_from_layer(
        self, layer_id: str, layer_summary: dict, framework: Framework, include_types: bool
    ) -> GeneratedCode:
        system_prompt, user_prompt = build_code_generation_prompt(framework, layer_summary, include_types)
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.CODE,
            max_tokens=2500,
            temperature=0.3,
            feature="code_generation",
        )
        parsed = parse_json_response(result.text)
        return GeneratedCode(
            code=parsed.get("code", ""),
            file_name=parsed.get("fileName") or self._default_filename(layer_id, framework),
            types=parsed.get("types") if include_types else None,
        )

    async def generate_css_animation(self, timeline: dict, class_name: str = "animated-element") -> str:
        """
        Deterministic CSS @keyframes generation from a timeline structure
        (tracks/keyframes shape matches models/ai/animation_models.py) -
        no model call needed since this is a mechanical transform, which
        keeps it well under the spec's tight SLA for code generation.
        """
        tracks = timeline.get("tracks", [])
        duration_ms = timeline.get("durationMs", 300)
        keyframe_name = f"{class_name}-kf"

        percentages: dict[float, dict[str, Any]] = {}
        for track in tracks:
            prop = track.get("property")
            for kf in track.get("keyframes", []):
                pct = round(kf.get("time", 0.0) * 100, 2)
                percentages.setdefault(pct, {})
                percentages[pct][prop] = kf.get("properties", {}).get(prop)

        css_lines = [f"@keyframes {keyframe_name} {{"]
        for pct in sorted(percentages.keys()):
            props = percentages[pct]
            decls = "; ".join(f"{self._css_prop_for(k)}: {self._css_value_for(k, v)}" for k, v in props.items() if v is not None)
            css_lines.append(f"  {pct}% {{ {decls}; }}")
        css_lines.append("}")

        trigger = timeline.get("trigger", "load")
        selector = f".{class_name}:hover" if trigger == "hover" else f".{class_name}"
        css_lines.append(
            f"{selector} {{ animation: {keyframe_name} {duration_ms}ms "
            f"{'infinite ' if trigger == 'loop' else ''}forwards; }}"
        )
        return "\n".join(css_lines)

    async def generate_tailwind_classes(self, style_attributes: dict) -> list[str]:
        """Deterministic mapping from common style attributes to Tailwind utility classes."""
        classes: list[str] = []
        radius_map = {0: "rounded-none", 4: "rounded", 8: "rounded-lg", 16: "rounded-2xl", 24: "rounded-3xl"}
        if "cornerRadius" in style_attributes and style_attributes["cornerRadius"] is not None:
            nearest = min(radius_map, key=lambda k: abs(k - style_attributes["cornerRadius"]))
            classes.append(radius_map[nearest])
        if style_attributes.get("blur"):
            classes.append("backdrop-blur-md")
        if style_attributes.get("opacity") is not None and style_attributes["opacity"] < 1:
            classes.append(f"bg-opacity-{int(style_attributes['opacity'] * 100)}")
        if style_attributes.get("shadow"):
            classes.append("shadow-xl")
        return classes

    async def generate_nextjs_page(self, route_path: str, layers_summary: list[dict], page_title: str) -> GeneratedCode:
        """
        Spec: 'Generate Next.js pages'. Distinct from a single-component
        generation - this composes multiple layer summaries into one
        page-level component with App Router file conventions.
        """
        system_prompt = build_system_prompt(
            role="a senior Next.js (App Router) engineer assembling a full page from a design spec",
            output_schema_hint='{"code": str, "fileName": str, "metadata": object}',
        )
        task = (
            f"Generate a Next.js App Router page component for route '{route_path}' "
            f"titled '{page_title}'. Compose these layer/section descriptions into "
            f"a single page, in the order given, using semantic HTML and Tailwind "
            f"for styling. Export a default function component and a `metadata` "
            f"object with the page title. Layers: {layers_summary}"
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=build_user_prompt(task),
            capability=Capability.CODE,
            max_tokens=3000,
            temperature=0.3,
            feature="nextjs_page_generation",
        )
        parsed = parse_json_response(result.text)
        normalized_route = route_path.strip("/") or "page"
        return GeneratedCode(
            code=parsed.get("code", ""),
            file_name=parsed.get("fileName") or f"app/{normalized_route}/page.tsx",
            types=None,
        )

    async def generate_typescript_interfaces(self, data: dict | list, root_name: str = "Data") -> str:
        """
        Spec: 'Generate TypeScript interfaces from data'. Deterministic
        structural inference (no model call) - given the data is concrete
        JSON, we can derive exact types directly rather than asking a
        model to guess at a schema it's just going to read off the same JSON.
        """
        interfaces: dict[str, str] = {}
        self._infer_type(data, root_name, interfaces)
        # Emit child interfaces before the root so TS doesn't need forward decls.
        ordered = [body for name, body in interfaces.items() if name != root_name]
        ordered.append(interfaces[root_name])
        return "\n\n".join(ordered)

    def _infer_type(self, value: Any, type_name: str, interfaces: dict[str, str]) -> str:
        if isinstance(value, dict):
            fields = []
            for key, val in value.items():
                safe_key = key if key.isidentifier() else f'"{key}"'
                field_type = self._infer_type(val, self._pascal_case(key), interfaces)
                optional = "?" if val is None else ""
                fields.append(f"  {safe_key}{optional}: {field_type};")
            interfaces[type_name] = f"export interface {type_name} {{\n" + "\n".join(fields) + "\n}"
            return type_name
        if isinstance(value, list):
            if not value:
                return "unknown[]"
            element_type = self._infer_type(value[0], type_name.rstrip("s") + "Item", interfaces)
            return f"{element_type}[]"
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, (int, float)):
            return "number"
        if isinstance(value, str):
            return "string"
        if value is None:
            return "null"
        return "unknown"

    def _pascal_case(self, name: str) -> str:
        parts = re.split(r"[_\-\s]+", name)
        return "".join(p[:1].upper() + p[1:] for p in parts if p) or "Field"

    async def suggest_improvements(self, code: str, framework: Framework) -> list[str]:
        system_prompt = build_system_prompt(
            role=f"a senior {framework} code reviewer",
            output_schema_hint='{"suggestions": [str]}',
        )
        user_prompt = build_user_prompt(
            "Review this code and list concrete, actionable improvements "
            "(performance, accessibility, correctness). Keep each suggestion "
            "to one sentence.",
            {"code": code[:4000]},
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.CODE,
            max_tokens=600,
            temperature=0.4,
            feature="code_review",
        )
        parsed = parse_json_response(result.text)
        return parsed.get("suggestions", [])

    def _default_filename(self, layer_id: str, framework: Framework) -> str:
        ext = {"react": "tsx", "nextjs": "tsx", "html": "html", "css": "css"}[framework]
        return f"Layer_{layer_id[:8]}.{ext}"

    def _css_prop_for(self, prop: str) -> str:
        return {
            "opacity": "opacity", "translateY": "transform", "translateX": "transform",
            "scale": "transform", "rotate": "transform",
        }.get(prop, prop)

    def _css_value_for(self, prop: str, value: Any) -> str:
        if prop == "translateY":
            return f"translateY({value}px)"
        if prop == "translateX":
            return f"translateX({value}px)"
        if prop == "scale":
            return f"scale({value})"
        if prop == "rotate":
            return f"rotate({value}deg)"
        return str(value)
