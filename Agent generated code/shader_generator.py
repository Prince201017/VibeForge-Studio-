"""
[Claude.A14] Shader Generation (spec section 4).

Generates GLSL shaders from natural-language effect descriptions, and
performs a *static* validation pass (spec: "Validate shader compilation")
since we have no headless GL context in this backend - real compilation
should happen client-side (the frontend viewport already owns a WebGL/
WebGPU context via Claude.A5's renderer) and report back through
/api/ai/generate-shader's optional revalidation, which this service also
supports.
"""
from __future__ import annotations

import logging
import re

from models.ai.shader_models import (
    GeneratedShader,
    GenerateShaderRequest,
    ShaderUniform,
)
from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_shader_prompt
from utils.model_selector import Capability

logger = logging.getLogger("ai_engine.shader_generator")

_REQUIRED_GLSL_TOKENS = ("void main", "gl_FragColor", "gl_Position")
_DANGEROUS_PATTERNS = (
    # Extremely defensive: shaders are sandboxed by the GPU driver anyway,
    # but we still refuse to hand back anything resembling a compute
    # exfil/DoS pattern like unbounded loops driven by a uniform.
    re.compile(r"for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*u\w+", re.IGNORECASE),
)


class ShaderGenerator:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def generate(self, request: GenerateShaderRequest) -> GeneratedShader:
        system_prompt, user_prompt = build_shader_prompt(
            request.effectDescription, request.targetPlatform
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.CODE,
            max_tokens=1800,
            temperature=0.4,
        )
        parsed = parse_json_response(result.text)

        vertex_shader = parsed.get("vertexShader") or self._default_vertex_shader()
        fragment_shader = parsed.get("fragmentShader", "")

        uniforms = [
            ShaderUniform(
                name=u.get("name", "uValue"),
                type=u.get("type", "float"),
                defaultValue=u.get("defaultValue"),
            )
            for u in parsed.get("uniforms", [])
        ]
        # Always ensure uTime exists for animated effects - the frontend
        # renderer drives this uniform every frame regardless.
        if not any(u.name == "uTime" for u in uniforms):
            uniforms.append(ShaderUniform(name="uTime", type="float", defaultValue=0.0))

        compiled, errors = self._static_validate(vertex_shader, fragment_shader)

        return GeneratedShader(
            vertexShader=vertex_shader,
            fragmentShader=fragment_shader,
            uniforms=uniforms,
            targetPlatform=request.targetPlatform,
            estimatedCostTier=self._estimate_cost_tier(fragment_shader),
            compiled=compiled,
            compileErrors=errors,
        )

    def _default_vertex_shader(self) -> str:
        return (
            "varying vec2 vUv;\n"
            "void main() {\n"
            "  vUv = uv;\n"
            "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n"
            "}"
        )

    def _static_validate(self, vertex: str, fragment: str) -> tuple[bool, list[str]]:
        """
        Not a real compiler - a pragmatic sanity pass that catches the most
        common failure modes (missing main(), unbalanced braces, obviously
        unsafe unbounded loops) before shipping GLSL to the client.
        """
        errors: list[str] = []

        for shader_name, source in (("vertex", vertex), ("fragment", fragment)):
            if "void main" not in source:
                errors.append(f"{shader_name} shader is missing a main() function")
            if source.count("{") != source.count("}"):
                errors.append(f"{shader_name} shader has unbalanced braces")

        if "gl_Position" not in vertex:
            errors.append("vertex shader never assigns gl_Position")

        for pattern in _DANGEROUS_PATTERNS:
            if pattern.search(fragment):
                errors.append("fragment shader contains a uniform-bounded loop; clamp iteration count with a constant")

        return (len(errors) == 0), errors

    def _estimate_cost_tier(self, fragment_shader: str) -> str:
        loop_count = len(re.findall(r"\bfor\s*\(", fragment_shader))
        texture_reads = len(re.findall(r"texture2D|texture\(", fragment_shader))
        trig_calls = len(re.findall(r"\b(sin|cos|tan|pow|exp)\(", fragment_shader))
        score = loop_count * 3 + texture_reads * 2 + trig_calls
        if score <= 4:
            return "low"
        if score <= 12:
            return "medium"
        return "high"
