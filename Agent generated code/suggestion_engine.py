"""
[Claude.A14] Content-Aware Operations / Suggestion Engine (spec section 9).

Suggests layer compositions, color harmonies, layout improvements,
typography pairings, and responsive breakpoints. Color harmony uses
deterministic HSL color theory (fast path, <1s SLA) while layout/typography
suggestions call the model since they require broader design judgment.
"""
from __future__ import annotations

import colorsys
import logging

from models.ai.design_models import Suggestion, SuggestRequest, SuggestResponse
from services.model_integration import ModelIntegrationService, parse_json_response
from utils.model_selector import Capability
from utils.prompt_builder import build_system_prompt, build_user_prompt
from utils.safety_filter import detect_bias_in_suggestion

logger = logging.getLogger("ai_engine.suggestion_engine")


class SuggestionEngine:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def suggest(self, request: SuggestRequest, layer_context: dict | None = None) -> tuple[SuggestResponse, list[str]]:
        layer_context = layer_context or {}
        warnings: list[str] = []

        if request.suggestionType == "color_harmony":
            suggestions = self._suggest_color_harmonies(layer_context.get("baseColor", "#3B82F6"))
        elif request.suggestionType == "responsive":
            suggestions = self._suggest_breakpoints(layer_context)
        else:
            suggestions = await self._suggest_via_model(request.suggestionType, layer_context)

        for s in suggestions:
            warnings.extend(detect_bias_in_suggestion(request.suggestionType, s.payload))

        return SuggestResponse(layerId=request.layerId, suggestions=suggestions), warnings

    # ------------------------------------------------------------------ #
    # Deterministic color theory (spec: "Recommend color harmonies")
    # ------------------------------------------------------------------ #
    def _suggest_color_harmonies(self, base_hex: str) -> list[Suggestion]:
        h, s, l = self._hex_to_hsl(base_hex)
        harmonies = {
            "complementary": [h, (h + 0.5) % 1.0],
            "analogous": [h, (h + 1 / 12) % 1.0, (h - 1 / 12) % 1.0],
            "triadic": [h, (h + 1 / 3) % 1.0, (h + 2 / 3) % 1.0],
            "split_complementary": [h, (h + 5 / 12) % 1.0, (h + 7 / 12) % 1.0],
        }
        suggestions = []
        for name, hues in harmonies.items():
            colors = [self._hsl_to_hex(hue, s, l) for hue in hues]
            suggestions.append(
                Suggestion(
                    type="color_harmony",
                    description=f"{name.replace('_', ' ').title()} palette derived from base color",
                    payload={"harmony": name, "colors": colors},
                    confidence=0.9,
                )
            )
        return suggestions

    def _suggest_breakpoints(self, layer_context: dict) -> list[Suggestion]:
        width = layer_context.get("width", 1440)
        standard = [
            {"name": "mobile", "maxWidth": 480},
            {"name": "tablet", "maxWidth": 768},
            {"name": "laptop", "maxWidth": 1280},
            {"name": "desktop", "maxWidth": max(1440, int(width))},
        ]
        return [
            Suggestion(
                type="responsive",
                description="Standard 4-tier responsive breakpoint set",
                payload={"breakpoints": standard},
                confidence=0.85,
            )
        ]

    async def _suggest_via_model(self, suggestion_type: str, layer_context: dict) -> list[Suggestion]:
        system_prompt = build_system_prompt(
            role="a design consultant giving concrete, actionable suggestions",
            output_schema_hint='{"suggestions": [{"description": str, "payload": object, "confidence": number}]}',
        )
        user_prompt = build_user_prompt(
            f"Give 2-4 {suggestion_type} suggestions for this layer.",
            layer_context,
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.TEXT,
            max_tokens=800,
            temperature=0.6,
        )
        parsed = parse_json_response(result.text)
        return [
            Suggestion(
                type=suggestion_type,
                description=s.get("description", ""),
                payload=s.get("payload", {}),
                confidence=s.get("confidence", 0.7),
            )
            for s in parsed.get("suggestions", [])
        ]

    @staticmethod
    def _hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
        hex_color = hex_color.lstrip("#")
        r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (0, 2, 4))
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        return h, s, l

    @staticmethod
    def _hsl_to_hex(h: float, s: float, l: float) -> str:
        r, g, b = colorsys.hls_to_rgb(h, l, s)
        return f"#{int(r*255):02X}{int(g*255):02X}{int(b*255):02X}"
