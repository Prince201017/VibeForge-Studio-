"""
[Claude.A14] Schemas for the Automatic Animation Generator (section 3).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GenerateAnimationRequest(BaseModel):
    objectType: str  # e.g. "button", "card", "icon"
    layerId: str
    animationType: Literal["hover", "entrance", "exit", "loop"]


class Keyframe(BaseModel):
    time: float  # 0..1 normalized
    properties: dict = Field(default_factory=dict)
    easing: str = "easeOutCubic"


class AnimationTrack(BaseModel):
    property: str  # e.g. "opacity", "translateY", "scale"
    keyframes: list[Keyframe]


class GeneratedAnimation(BaseModel):
    layerId: str
    animationType: str
    durationMs: int
    tracks: list[AnimationTrack]
    trigger: Literal["hover", "click", "scroll", "load", "loop"] = "load"


class GenerateAnimationResponse(BaseModel):
    animation: GeneratedAnimation
