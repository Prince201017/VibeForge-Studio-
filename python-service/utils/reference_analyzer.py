"""
[Claude.A14] Reference Image Analysis (spec section 2).

Extracts color palettes, detects design patterns (glass, neumorphism,
minimalism, etc.), analyzes typography and layout, using a vision-capable
model. Falls back to local pixel-based palette extraction (Pillow) when
no vision model is available or as a cheap first pass to ground the
model's palette output in the actual image data.
"""
from __future__ import annotations

import io
import logging

import httpx

from models.ai.style_models import (
    AnalyzeReferenceRequest,
    AnalyzeReferenceResponse,
    ColorPaletteResult,
    DesignPatternResult,
    LayoutResult,
    TypographyResult,
)
from services.model_integration import ModelIntegrationService, parse_json_response
from utils.model_selector import Capability
from utils.prompt_builder import build_system_prompt, build_user_prompt
from utils.safety_filter import check_reference_image_risk

logger = logging.getLogger("ai_engine.reference_analyzer")

_ANALYSIS_SCHEMA_HINT = (
    '{"colorPalette": {"dominant": [str], "accent": [str], "background": [str], '
    '"harmony": str}, "designPatterns": {"detected": [str], '
    '"confidence": {str: number}}, "typography": {"primaryTypeface": str|null, '
    '"scale": [number], "weightRange": [number,number]}, '
    '"layout": {"grid": str|null, "balance": str|null, "whitespaceRatio": number|null}, '
    '"compositionNotes": str}'
)

_KNOWN_PATTERNS = [
    "glassmorphism", "neumorphism", "minimalism", "brutalism", "flat design",
    "skeuomorphism", "gradient mesh", "dark mode", "material design",
    "retro / vaporwave", "3D / claymorphism",
]


class ReferenceAnalyzer:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def analyze(self, request: AnalyzeReferenceRequest) -> tuple[AnalyzeReferenceResponse, list[str]]:
        risk = check_reference_image_risk(request.imageUrl)
        warnings = list(risk.warnings)

        local_palette = await self._extract_local_palette(request.imageUrl)

        system_prompt = build_system_prompt(
            role=(
                "a design analyst who inspects UI/visual reference images and "
                "extracts precise, structured style information"
            ),
            output_schema_hint=_ANALYSIS_SCHEMA_HINT,
        )
        task = (
            f"Analyze this reference image for '{request.analysisType}'. "
            f"Known design pattern vocabulary to choose from (only include ones "
            f"actually present, don't force matches): {', '.join(_KNOWN_PATTERNS)}. "
            f"A locally-extracted rough color sample from the image is: "
            f"{local_palette or 'unavailable'} — use it to ground/validate your "
            f"palette output, adjusting as needed for what you actually observe."
        )
        user_prompt = build_user_prompt(task)

        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.VISION,
            image_urls=[request.imageUrl],
            max_tokens=1500,
            temperature=0.3,
        )
        parsed = parse_json_response(result.text)

        response = AnalyzeReferenceResponse(
            imageUrl=request.imageUrl,
            colorPalette=self._build_palette(parsed, local_palette, request.analysisType),
            designPatterns=self._build_patterns(parsed, request.analysisType),
            typography=self._build_typography(parsed, request.analysisType),
            layout=self._build_layout(parsed, request.analysisType),
            compositionNotes=parsed.get("compositionNotes"),
        )
        return response, warnings

    def _build_palette(self, parsed: dict, local_palette: list[str], analysis_type: str) -> ColorPaletteResult | None:
        if analysis_type not in ("color_palette", "all"):
            return None
        raw = parsed.get("colorPalette", {}) or {}
        return ColorPaletteResult(
            dominant=raw.get("dominant") or local_palette[:3],
            accent=raw.get("accent", []),
            background=raw.get("background", []),
            harmony=raw.get("harmony"),
        )

    def _build_patterns(self, parsed: dict, analysis_type: str) -> DesignPatternResult | None:
        if analysis_type not in ("design_patterns", "all"):
            return None
        raw = parsed.get("designPatterns", {}) or {}
        return DesignPatternResult(
            detected=raw.get("detected", []),
            confidence=raw.get("confidence", {}),
        )

    def _build_typography(self, parsed: dict, analysis_type: str) -> TypographyResult | None:
        if analysis_type != "all":
            return None
        raw = parsed.get("typography", {}) or {}
        return TypographyResult(
            primaryTypeface=raw.get("primaryTypeface"),
            scale=raw.get("scale", []),
            weightRange=raw.get("weightRange", []),
        )

    def _build_layout(self, parsed: dict, analysis_type: str) -> LayoutResult | None:
        if analysis_type not in ("layout", "all"):
            return None
        raw = parsed.get("layout", {}) or {}
        return LayoutResult(
            grid=raw.get("grid"),
            balance=raw.get("balance"),
            whitespaceRatio=raw.get("whitespaceRatio"),
        )

    async def _extract_local_palette(self, image_url: str, top_n: int = 5) -> list[str]:
        """
        Cheap local pass using Pillow's color quantization so the vision
        model has a numeric anchor instead of purely hallucinating hex
        codes from memory of "similar-looking" images.
        """
        try:
            from PIL import Image

            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()

            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            img = img.resize((150, 150))
            quantized = img.quantize(colors=top_n, method=Image.MEDIANCUT)
            palette = quantized.getpalette()[: top_n * 3]
            hex_colors = []
            for i in range(0, len(palette), 3):
                r, g, b = palette[i : i + 3]
                hex_colors.append(f"#{r:02X}{g:02X}{b:02X}")
            return hex_colors
        except Exception as exc:  # noqa: BLE001
            logger.info("Local palette extraction skipped (%s)", exc)
            return []
