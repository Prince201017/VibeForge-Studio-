"""
[Claude.A14] Format Conversion AI (spec section 7).

Handles asset-format decisions and delegates raster<->vector / image
optimization work to well-understood deterministic pipelines (Pillow)
wherever a model call would be unnecessary, expensive, or non-deterministic.
The model is used only for the genuinely ambiguous parts: recommending a
target format/tradeoff and describing what an SVG-from-raster trace would
need to capture.
"""
from __future__ import annotations

import io
import logging

import httpx

from services.model_integration import ModelIntegrationService, parse_json_response
from utils.model_selector import Capability
from utils.prompt_builder import build_system_prompt, build_user_prompt

logger = logging.getLogger("ai_engine.format_converter")

_FORMAT_TRADEOFFS = {
    "png": "Lossless, large file size, universal support, supports transparency.",
    "webp": "~30% smaller than PNG/JPEG at similar quality, wide modern browser support.",
    "avif": "Best compression available, growing support, slower encode time.",
    "svg": "Infinitely scalable, tiny for simple geometry, poor for photographic content.",
    "gltf": "Standard for 3D scene interchange, supports PBR materials and animation.",
}


class FormatConverter:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def suggest_format(self, asset_description: str, current_format: str, optimization: str) -> dict:
        system_prompt = build_system_prompt(
            role="an asset optimization specialist for a design/export pipeline",
            output_schema_hint='{"recommendedFormat": str, "reasoning": str, "estimatedSizeReductionPct": number}',
        )
        task = (
            f"Asset: {asset_description}. Currently: {current_format}. "
            f"Optimize for: {optimization}. Known format tradeoffs: {_FORMAT_TRADEOFFS}."
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=build_user_prompt(task),
            capability=Capability.TEXT,
            max_tokens=400,
            temperature=0.2,
        )
        return parse_json_response(result.text)

    async def convert_raster_to_webp(self, image_url: str, quality: int = 82) -> bytes:
        """Deterministic conversion - no model needed, kept here since the
        spec groups format conversion (both AI-recommended and mechanical)
        under this service."""
        from PIL import Image

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()

        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=6)
        return buffer.getvalue()

    async def convert_raster_to_avif(self, image_url: str, quality: int = 60) -> bytes:
        from PIL import Image

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()

        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        buffer = io.BytesIO()
        try:
            img.save(buffer, format="AVIF", quality=quality)
        except Exception as exc:  # noqa: BLE001
            # Pillow needs pillow-avif-plugin for AVIF; degrade gracefully.
            raise RuntimeError(
                "AVIF encoding requires the 'pillow-avif-plugin' package to be installed"
            ) from exc
        return buffer.getvalue()

    async def describe_vectorization_plan(self, image_url: str) -> dict:
        """
        Spec: 'Extract vectors from raster images'. True raster->vector
        tracing (potrace-style) is a deterministic CV algorithm, not a job
        for an LLM - this method uses the vision model only to describe
        which regions are good tracing candidates (flat color regions,
        icon-like shapes vs photographic areas), which a tracing pipeline
        can use to decide per-region strategy.
        """
        system_prompt = build_system_prompt(
            role="an asset pipeline engineer assessing an image for vectorization",
            output_schema_hint='{"vectorizable": bool, "reasoning": str, "suggestedColorCount": number}',
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=build_user_prompt(
                "Assess whether this image is a good candidate for automatic "
                "raster-to-vector tracing (flat colors/icon-like = good, "
                "photographic/gradient-heavy = poor)."
            ),
            capability=Capability.VISION,
            image_urls=[image_url],
            max_tokens=300,
            temperature=0.2,
        )
        return parse_json_response(result.text)
