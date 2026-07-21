"""
[Claude.A14] Pydantic schemas for the Design Generation Engine
(spec section 1) and Content-Aware Operations / suggestions (section 9).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class GenerateDesignRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    styleReference: list[str] = Field(default_factory=list)
    variations: int = Field(default=1, ge=1, le=5)
    aspectRatio: str = Field(default="1:1")

    @field_validator("aspectRatio")
    @classmethod
    def _validate_ratio(cls, v: str) -> str:
        if v not in {"1:1", "16:9", "9:16", "4:3", "3:4", "21:9"}:
            raise ValueError(f"Unsupported aspectRatio: {v}")
        return v


class LayerFill(BaseModel):
    type: Literal["solid", "gradient", "glass"] = "solid"
    colors: list[str] = Field(default_factory=list)
    angle: float | None = None
    blur: float | None = None
    opacity: float = 1.0


class GeneratedLayer(BaseModel):
    id: str
    type: Literal["rect", "ellipse", "text", "group", "vector", "image"]
    x: float
    y: float
    width: float
    height: float
    rotation: float = 0.0
    fill: LayerFill | None = None
    text: str | None = None
    fontFamily: str | None = None
    fontSize: float | None = None
    cornerRadius: float | None = None
    children: list["GeneratedLayer"] = Field(default_factory=list)


class DesignVariation(BaseModel):
    variationId: str
    layers: list[GeneratedLayer]
    palette: list[str]
    notes: str | None = None


class GenerateDesignResponse(BaseModel):
    designId: str
    prompt: str
    variations: list[DesignVariation]


class SuggestRequest(BaseModel):
    layerId: str
    suggestionType: Literal["color_harmony", "layout", "typography", "responsive"]


class Suggestion(BaseModel):
    type: str
    description: str
    payload: dict
    confidence: float = Field(ge=0.0, le=1.0, default=0.7)


class SuggestResponse(BaseModel):
    layerId: str
    suggestions: list[Suggestion]
