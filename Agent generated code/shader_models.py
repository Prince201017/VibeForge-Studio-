"""
[Claude.A14] Schemas for Shader Generation (section 4).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GenerateShaderRequest(BaseModel):
    effectDescription: str = Field(..., min_length=3, max_length=1000)
    targetPlatform: Literal["webgl", "webgpu"] = "webgl"


class ShaderUniform(BaseModel):
    name: str
    type: str  # e.g. "float", "vec2", "sampler2D"
    defaultValue: float | list[float] | None = None


class GeneratedShader(BaseModel):
    vertexShader: str
    fragmentShader: str
    uniforms: list[ShaderUniform] = Field(default_factory=list)
    targetPlatform: str
    estimatedCostTier: Literal["low", "medium", "high"] = "medium"
    compiled: bool = False
    compileErrors: list[str] = Field(default_factory=list)


class GenerateShaderResponse(BaseModel):
    shader: GeneratedShader
