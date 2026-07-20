"""
[Claude.A14] Schemas for Reference Image Analysis (section 2) and
Style Transfer & Synthesis (section 6).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeReferenceRequest(BaseModel):
    imageUrl: str
    analysisType: Literal["color_palette", "design_patterns", "layout", "all"] = "all"


class ColorPaletteResult(BaseModel):
    dominant: list[str] = Field(default_factory=list)
    accent: list[str] = Field(default_factory=list)
    background: list[str] = Field(default_factory=list)
    harmony: str | None = None  # e.g. "complementary", "analogous"


class DesignPatternResult(BaseModel):
    detected: list[str] = Field(default_factory=list)  # e.g. ["glass", "neumorphism"]
    confidence: dict[str, float] = Field(default_factory=dict)


class TypographyResult(BaseModel):
    primaryTypeface: str | None = None
    scale: list[float] = Field(default_factory=list)
    weightRange: list[int] = Field(default_factory=list)


class LayoutResult(BaseModel):
    grid: str | None = None  # e.g. "12-col", "asymmetric"
    balance: str | None = None  # e.g. "symmetric", "left-heavy"
    whitespaceRatio: float | None = None


class AnalyzeReferenceResponse(BaseModel):
    imageUrl: str
    colorPalette: ColorPaletteResult | None = None
    designPatterns: DesignPatternResult | None = None
    typography: TypographyResult | None = None
    layout: LayoutResult | None = None
    compositionNotes: str | None = None


class TransferStyleRequest(BaseModel):
    sourceLayer: str
    referenceImages: list[str] = Field(default_factory=list)
    stylePreset: Literal[
        "glassmorphism", "minimalism", "brutal", "flat", "neumorphism", "skeuomorphism"
    ] | None = None


class StyleAttributes(BaseModel):
    colors: list[str] = Field(default_factory=list)
    cornerRadius: float | None = None
    shadow: dict | None = None
    blur: float | None = None
    opacity: float | None = None
    typographyScale: list[float] = Field(default_factory=list)
    spacingRhythm: list[float] = Field(default_factory=list)


class TransferStyleResponse(BaseModel):
    sourceLayer: str
    appliedStyle: StyleAttributes
    designSystem: dict | None = None
