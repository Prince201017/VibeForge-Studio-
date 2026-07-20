"""
[Claude.A14] Automatic Animation Generator (spec section 3).

Generates keyframe animations from object type + animation type using a
combination of deterministic motion-design heuristics (fast path, no model
call needed for common cases) and model-generated tracks for anything not
covered by the built-in presets.
"""
from __future__ import annotations

import logging

from models.ai.animation_models import (
    AnimationTrack,
    GeneratedAnimation,
    GenerateAnimationRequest,
    Keyframe,
)
from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_animation_prompt
from utils.model_selector import Capability

logger = logging.getLogger("ai_engine.animation_generator")

# Deterministic presets keyed by (objectType-ish heuristics, animationType).
# The spec explicitly calls out "motion suggests animations (e.g., 'button'
# -> hover animation)" — codifying the obvious cases avoids an unnecessary
# model round-trip and guarantees the <2s SLA for the common path.
_PRESETS: dict[str, dict] = {
    "button:hover": {"durationMs": 180, "trigger": "hover", "tracks": [
        ("scale", [(0.0, {"scale": 1.0}, "easeOutQuad"), (1.0, {"scale": 1.03}, "easeOutQuad")]),
        ("brightness", [(0.0, {"brightness": 1.0}, "easeOutQuad"), (1.0, {"brightness": 1.08}, "easeOutQuad")]),
    ]},
    "button:entrance": {"durationMs": 320, "trigger": "load", "tracks": [
        ("opacity", [(0.0, {"opacity": 0.0}, "easeOutCubic"), (1.0, {"opacity": 1.0}, "easeOutCubic")]),
        ("translateY", [(0.0, {"translateY": 12}, "easeOutCubic"), (1.0, {"translateY": 0}, "easeOutCubic")]),
    ]},
    "card:entrance": {"durationMs": 450, "trigger": "load", "tracks": [
        ("opacity", [(0.0, {"opacity": 0.0}, "easeOutCubic"), (1.0, {"opacity": 1.0}, "easeOutCubic")]),
        ("scale", [(0.0, {"scale": 0.96}, "easeOutBack"), (1.0, {"scale": 1.0}, "easeOutBack")]),
    ]},
    "card:hover": {"durationMs": 220, "trigger": "hover", "tracks": [
        ("translateY", [(0.0, {"translateY": 0}, "easeOutQuad"), (1.0, {"translateY": -4}, "easeOutQuad")]),
        ("shadowSpread", [(0.0, {"shadowSpread": 8}, "easeOutQuad"), (1.0, {"shadowSpread": 20}, "easeOutQuad")]),
    ]},
    "icon:loop": {"durationMs": 1200, "trigger": "loop", "tracks": [
        ("rotate", [(0.0, {"rotate": 0}, "linear"), (1.0, {"rotate": 360}, "linear")]),
    ]},
    "modal:entrance": {"durationMs": 260, "trigger": "load", "tracks": [
        ("opacity", [(0.0, {"opacity": 0.0}, "easeOutQuad"), (1.0, {"opacity": 1.0}, "easeOutQuad")]),
        ("scale", [(0.0, {"scale": 0.92}, "easeOutBack"), (1.0, {"scale": 1.0}, "easeOutBack")]),
    ]},
    "toast:entrance": {"durationMs": 240, "trigger": "load", "tracks": [
        ("translateY", [(0.0, {"translateY": 24}, "easeOutCubic"), (1.0, {"translateY": 0}, "easeOutCubic")]),
        ("opacity", [(0.0, {"opacity": 0.0}, "easeOutCubic"), (1.0, {"opacity": 1.0}, "easeOutCubic")]),
    ]},
    "toast:exit": {"durationMs": 200, "trigger": "click", "tracks": [
        ("opacity", [(0.0, {"opacity": 1.0}, "easeInCubic"), (1.0, {"opacity": 0.0}, "easeInCubic")]),
        ("translateY", [(0.0, {"translateY": 0}, "easeInCubic"), (1.0, {"translateY": -16}, "easeInCubic")]),
    ]},
}


class AnimationGenerator:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def generate(self, request: GenerateAnimationRequest) -> GeneratedAnimation:
        preset_key = f"{self._normalize_object_type(request.objectType)}:{request.animationType}"
        preset = _PRESETS.get(preset_key)

        if preset:
            return self._build_from_preset(request.layerId, request.animationType, preset)

        return await self._generate_from_model(request)

    def _normalize_object_type(self, object_type: str) -> str:
        lowered = object_type.lower().strip()
        aliases = {
            "btn": "button", "cta": "button", "link": "button",
            "panel": "card", "tile": "card",
            "popup": "modal", "dialog": "modal",
            "notification": "toast", "snackbar": "toast",
            "spinner": "icon", "glyph": "icon",
        }
        return aliases.get(lowered, lowered)

    def _build_from_preset(self, layer_id: str, animation_type: str, preset: dict) -> GeneratedAnimation:
        tracks = [
            AnimationTrack(
                property=prop,
                keyframes=[Keyframe(time=t, properties=props, easing=easing) for t, props, easing in kfs],
            )
            for prop, kfs in preset["tracks"]
        ]
        return GeneratedAnimation(
            layerId=layer_id,
            animationType=animation_type,
            durationMs=preset["durationMs"],
            tracks=tracks,
            trigger=preset["trigger"],
        )

    async def _generate_from_model(self, request: GenerateAnimationRequest) -> GeneratedAnimation:
        system_prompt, user_prompt = build_animation_prompt(request.objectType, request.animationType)
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.TEXT,
            max_tokens=800,
            temperature=0.5,
        )
        parsed = parse_json_response(result.text)

        tracks = []
        for track in parsed.get("tracks", []):
            keyframes = [
                Keyframe(
                    time=kf.get("time", 0.0),
                    properties=kf.get("properties", {}),
                    easing=kf.get("easing", "easeOutCubic"),
                )
                for kf in track.get("keyframes", [])
            ]
            tracks.append(AnimationTrack(property=track.get("property", "opacity"), keyframes=keyframes))

        return GeneratedAnimation(
            layerId=request.layerId,
            animationType=request.animationType,
            durationMs=int(parsed.get("durationMs", 300)),
            tracks=tracks or [AnimationTrack(
                property="opacity",
                keyframes=[Keyframe(time=0.0, properties={"opacity": 0.0}),
                           Keyframe(time=1.0, properties={"opacity": 1.0})],
            )],
            trigger=parsed.get("trigger", "load"),
        )
