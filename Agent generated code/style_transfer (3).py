"""
[Claude.A14] Style Transfer & Synthesis (spec section 6).

Transfers style from one or more reference images (or a named preset)
onto an existing layer's attributes, blends multiple references, and can
synthesize a small design system (palette + type scale + spacing rhythm)
from a style description.
"""
from __future__ import annotations

import logging

from models.ai.style_models import StyleAttributes, TransferStyleRequest, TransferStyleResponse
from services.model_integration import ModelIntegrationService, parse_json_response
from services.reference_analyzer import ReferenceAnalyzer
from utils.model_selector import Capability
from utils.prompt_builder import build_system_prompt, build_user_prompt

logger = logging.getLogger("ai_engine.style_transfer")

_STYLE_PRESETS: dict[str, dict] = {
    "glassmorphism": {
        "cornerRadius": 20, "blur": 24, "opacity": 0.65,
        "shadow": {"blur": 40, "spread": -8, "color": "rgba(255,255,255,0.15)"},
    },
    "minimalism": {
        "cornerRadius": 4, "blur": 0, "opacity": 1.0,
        "shadow": None,
    },
    "brutal": {
        "cornerRadius": 0, "blur": 0, "opacity": 1.0,
        "shadow": {"blur": 0, "spread": 4, "color": "#000000"},
    },
    "flat": {
        "cornerRadius": 8, "blur": 0, "opacity": 1.0,
        "shadow": None,
    },
    "neumorphism": {
        "cornerRadius": 24, "blur": 0, "opacity": 1.0,
        "shadow": {"blur": 20, "spread": 0, "color": "rgba(0,0,0,0.15)"},
    },
    "skeuomorphism": {
        "cornerRadius": 12, "blur": 0, "opacity": 1.0,
        "shadow": {"blur": 12, "spread": 2, "color": "rgba(0,0,0,0.4)"},
    },
}

_SYNTHESIS_SCHEMA_HINT = (
    '{"colors": [str], "typographyScale": [number], "spacingRhythm": [number]}'
)


class StyleTransferEngine:
    def __init__(
        self,
        model_service: ModelIntegrationService | None = None,
        reference_analyzer: ReferenceAnalyzer | None = None,
    ):
        self.model_service = model_service or ModelIntegrationService()
        self.reference_analyzer = reference_analyzer or ReferenceAnalyzer(self.model_service)

    async def transfer(self, request: TransferStyleRequest) -> tuple[TransferStyleResponse, list[str]]:
        warnings: list[str] = []
        attributes = StyleAttributes()

        if request.stylePreset:
            preset = _STYLE_PRESETS.get(request.stylePreset, {})
            attributes.cornerRadius = preset.get("cornerRadius")
            attributes.blur = preset.get("blur")
            attributes.opacity = preset.get("opacity")
            attributes.shadow = preset.get("shadow")

        if request.referenceImages:
            blended_colors: list[str] = []
            for image_url in request.referenceImages:
                from models.ai.style_models import AnalyzeReferenceRequest

                analysis, ref_warnings = await self.reference_analyzer.analyze(
                    AnalyzeReferenceRequest(imageUrl=image_url, analysisType="color_palette")
                )
                warnings.extend(ref_warnings)
                if analysis.colorPalette:
                    blended_colors.extend(analysis.colorPalette.dominant)
                    blended_colors.extend(analysis.colorPalette.accent)
            attributes.colors = self._blend_palette(blended_colors)

        if not attributes.colors and not request.stylePreset:
            warnings.append(
                "No reference images or style preset provided; returning "
                "default/neutral style attributes."
            )

        design_system = None
        if request.stylePreset or request.referenceImages:
            design_system = await self._synthesize_design_system(attributes, request.stylePreset)

        response = TransferStyleResponse(
            sourceLayer=request.sourceLayer,
            appliedStyle=attributes,
            designSystem=design_system,
        )
        return response, warnings

    async def blend_presets(self, preset_names: list[str]) -> dict:
        """Support for blending multiple named presets (spec: 'Blend multiple reference styles')."""
        if not preset_names:
            return {}
        merged: dict = {}
        for name in preset_names:
            preset = _STYLE_PRESETS.get(name, {})
            for key, value in preset.items():
                if key not in merged or merged[key] is None:
                    merged[key] = value
                elif isinstance(value, (int, float)) and isinstance(merged[key], (int, float)):
                    merged[key] = (merged[key] + value) / 2
        return merged

    def _blend_palette(self, colors: list[str], max_colors: int = 6) -> list[str]:
        seen = set()
        unique = []
        for c in colors:
            normalized = c.upper()
            if normalized not in seen:
                seen.add(normalized)
                unique.append(normalized)
        return unique[:max_colors]

    async def _synthesize_design_system(self, attributes: StyleAttributes, preset_name: str | None) -> dict:
        system_prompt = build_system_prompt(
            role="a design systems specialist who derives a small, cohesive design token set",
            output_schema_hint=_SYNTHESIS_SCHEMA_HINT,
        )
        task = (
            f"Given these extracted style attributes: colors={attributes.colors}, "
            f"preset={preset_name}, propose a type scale (5-6 sizes, px) and a "
            f"spacing rhythm (5-6 values, px, following a consistent ratio)."
        )
        user_prompt = build_user_prompt(task)
        try:
            result = await self.model_service.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                capability=Capability.TEXT,
                max_tokens=500,
                temperature=0.4,
                feature="style_transfer",
            )
            parsed = parse_json_response(result.text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Design system synthesis fell back to defaults: %s", exc)
            parsed = {}

        return {
            "colors": attributes.colors or parsed.get("colors", []),
            "typographyScale": parsed.get("typographyScale") or [12, 14, 16, 20, 24, 32],
            "spacingRhythm": parsed.get("spacingRhythm") or [4, 8, 12, 16, 24, 32],
        }
