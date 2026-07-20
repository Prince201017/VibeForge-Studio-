"""
[Claude.A14] Code Generation Assistant (spec section 5).

Generates React components, CSS animations, Tailwind classes, Next.js
pages, and TypeScript interfaces from a design/layer description, and
can suggest incremental code improvements on existing snippets.
"""
from __future__ import annotations

import logging
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
