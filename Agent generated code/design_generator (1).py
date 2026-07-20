"""
[Claude.A14] Design Generation Engine (spec section 1, target ~1000 LOC
of surface area across this file + its schema/prompt collaborators).

Generates complete layouts from a text description, supports style
combinations ("Apple meets Stripe with glass morphism"), and batch
generation of multiple variations in parallel.
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from models.ai.design_models import (
    DesignVariation,
    GenerateDesignRequest,
    GenerateDesignResponse,
    GeneratedLayer,
)
from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_design_generation_prompt
from utils.model_selector import Capability
from utils.moderation import moderate_text_layered
from utils.safety_filter import enforce_diversity

logger = logging.getLogger("ai_engine.design_generator")


class DesignGenerationError(Exception):
    def __init__(self, message: str, blocked: bool = False):
        self.blocked = blocked
        super().__init__(message)


class DesignGenerator:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def generate(
        self, request: GenerateDesignRequest, progress_cb=None
    ) -> tuple[GenerateDesignResponse, list[str]]:
        """
        Returns (response, warnings). progress_cb, if given, is an async
        callable(fraction: float, message: str) used to drive SSE streaming
        for the /api/ai/generate-design endpoint.
        """
        allowed, blocked_reason, warnings = await moderate_text_layered(request.prompt)
        if not allowed:
            raise DesignGenerationError(blocked_reason or "Prompt blocked by safety filter", blocked=True)

        for ref in request.styleReference:
            # style references that are plain image URLs get a lightweight
            # copyright heuristic check; bare domain names (e.g. "apple.com")
            # are treated as stylistic inspiration only.
            if ref.startswith("http"):
                from utils.safety_filter import check_reference_image_risk

                ref_check = check_reference_image_risk(ref)
                warnings.extend(ref_check.warnings)

        if progress_cb:
            await progress_cb(0.1, "Building prompt")

        system_prompt, user_prompt = build_design_generation_prompt(
            request.prompt, request.styleReference, request.aspectRatio
        )

        if progress_cb:
            await progress_cb(0.25, "Generating variations")

        variation_tasks = [
            self._generate_single_variation(system_prompt, user_prompt, index)
            for index in range(request.variations)
        ]
        variations = await asyncio.gather(*variation_tasks, return_exceptions=True)

        successful: list[DesignVariation] = []
        for v in variations:
            if isinstance(v, Exception):
                logger.warning("A design variation failed to generate: %s", v)
                warnings.append(f"One variation failed to generate: {v}")
                continue
            successful.append(v)

        if not successful:
            raise DesignGenerationError("All design variations failed to generate")

        if progress_cb:
            await progress_cb(0.9, "Running diversity + safety checks")

        diversity_warnings = enforce_diversity(
            [{"colors": v.palette} for v in successful]
        )
        warnings.extend(diversity_warnings)

        response = GenerateDesignResponse(
            designId=str(uuid.uuid4()),
            prompt=request.prompt,
            variations=successful,
        )

        if progress_cb:
            await progress_cb(1.0, "Done")

        return response, warnings

    async def _generate_single_variation(
        self, system_prompt: str, user_prompt: str, index: int
    ) -> DesignVariation:
        # Nudge temperature up slightly per-variation so batch generation
        # doesn't collapse to near-identical outputs (spec: diverse output).
        temperature = 0.6 + (index * 0.1)
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=f"{user_prompt}\n\n(Variation #{index + 1} of this batch — make it distinct.)",
            capability=Capability.TEXT,
            max_tokens=2500,
            temperature=min(temperature, 1.0),
            feature="design_generation",
        )
        parsed = parse_json_response(result.text)
        layers_raw = parsed.get("layers", [])
        layers = [self._coerce_layer(layer_dict) for layer_dict in layers_raw]
        palette = parsed.get("palette") or self._extract_palette_fallback(layers)

        return DesignVariation(
            variationId=str(uuid.uuid4()),
            layers=layers,
            palette=palette,
            notes=parsed.get("notes"),
        )

    def _coerce_layer(self, layer_dict: dict) -> GeneratedLayer:
        """
        Model output is well-intentioned but not always perfectly typed
        (e.g. missing an 'id', nested children with the same issue). This
        recursively repairs the structure so pydantic validation succeeds
        instead of throwing away an otherwise-good generation.
        """
        layer_dict = dict(layer_dict)
        layer_dict.setdefault("id", str(uuid.uuid4()))
        layer_dict.setdefault("type", "rect")
        layer_dict.setdefault("x", 0)
        layer_dict.setdefault("y", 0)
        layer_dict.setdefault("width", 100)
        layer_dict.setdefault("height", 100)
        if layer_dict.get("children"):
            layer_dict["children"] = [self._coerce_layer_dict(c) for c in layer_dict["children"]]
        return GeneratedLayer(**layer_dict)

    def _coerce_layer_dict(self, layer_dict: dict) -> dict:
        layer_dict = dict(layer_dict)
        layer_dict.setdefault("id", str(uuid.uuid4()))
        layer_dict.setdefault("type", "rect")
        layer_dict.setdefault("x", 0)
        layer_dict.setdefault("y", 0)
        layer_dict.setdefault("width", 100)
        layer_dict.setdefault("height", 100)
        return layer_dict

    def _extract_palette_fallback(self, layers: list[GeneratedLayer]) -> list[str]:
        colors: list[str] = []
        for layer in layers:
            if layer.fill and layer.fill.colors:
                colors.extend(layer.fill.colors)
        # de-dupe while preserving order
        seen = set()
        unique = []
        for c in colors:
            if c not in seen:
                seen.add(c)
                unique.append(c)
        return unique[:6] or ["#FFFFFF", "#111827"]
