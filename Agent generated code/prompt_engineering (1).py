"""
[Claude.A14] Prompt Engineering service (spec section 13).

Sits one level above utils/prompt_builder.py: where prompt_builder.py
provides low-level string assembly primitives, this module owns the
*strategy* - which few-shot examples to use for which task, how much
budget to give context vs instructions, and structured-output schema
hints per domain. Domain services (design_generator, shader_generator,
etc.) call into here rather than building prompts by hand.
"""
from __future__ import annotations

from utils.prompt_builder import (
    build_chain_of_thought_wrapper,
    build_few_shot_block,
    build_style_combination_prompt,
    build_system_prompt,
    build_user_prompt,
)
from utils.token_counter import truncate_to_token_budget

# --------------------------------------------------------------------------- #
# Few-shot libraries, kept small and cheap on purpose - the spec calls for
# "token optimization", so we default to 1-2 examples, not a giant library.
# --------------------------------------------------------------------------- #
_DESIGN_FEW_SHOT = [
    {
        "input": "minimal pricing card with a subtle shadow",
        "output": {
            "layers": [
                {"type": "rect", "fill": {"type": "solid", "colors": ["#FFFFFF"]},
                 "cornerRadius": 16}
            ],
            "palette": ["#FFFFFF", "#111827", "#6B7280"],
        },
    }
]

_SHADER_FEW_SHOT = [
    {
        "input": "simple pulsing glow",
        "output": {
            "uniforms": [{"name": "uTime", "type": "float"}],
            "fragmentShaderSummary": "sin(uTime) modulates emissive intensity",
        },
    }
]

_DESIGN_SCHEMA_HINT = (
    '{"layers": [{"id": str, "type": "rect|ellipse|text|group|vector|image", '
    '"x": number, "y": number, "width": number, "height": number, '
    '"rotation": number, "fill": {"type": "solid|gradient|glass", '
    '"colors": [str], "angle": number|null, "blur": number|null, '
    '"opacity": number}, "cornerRadius": number|null}], "palette": [str], '
    '"notes": str|null}'
)

_ANIMATION_SCHEMA_HINT = (
    '{"durationMs": number, "trigger": "hover|click|scroll|load|loop", '
    '"tracks": [{"property": str, "keyframes": [{"time": number (0-1), '
    '"properties": object, "easing": str}]}]}'
)

_SHADER_SCHEMA_HINT = (
    '{"vertexShader": str (GLSL), "fragmentShader": str (GLSL), '
    '"uniforms": [{"name": str, "type": str, "defaultValue": number|[number]|null}], '
    '"estimatedCostTier": "low|medium|high"}'
)


def build_design_generation_prompt(
    prompt: str, style_reference: list[str], aspect_ratio: str
) -> tuple[str, str]:
    system = build_system_prompt(
        role=(
            "an expert UI/UX and visual designer who converts natural-language "
            "briefs into structured layout JSON for a canvas-based design tool"
        ),
        output_schema_hint=_DESIGN_SCHEMA_HINT,
    )
    style_decomposition = build_style_combination_prompt(prompt) if _looks_like_style_combo(prompt) else ""
    context = {
        "aspectRatio": aspect_ratio,
        "styleReferences": ", ".join(style_reference) if style_reference else None,
    }
    task = f"Design brief: \"{prompt}\"\n{style_decomposition}".strip()
    user = build_user_prompt(build_chain_of_thought_wrapper(task), context)
    user += "\n\n" + build_few_shot_block(_DESIGN_FEW_SHOT)
    return system, truncate_to_token_budget(user, max_tokens=3000)


def build_animation_prompt(object_type: str, animation_type: str) -> tuple[str, str]:
    system = build_system_prompt(
        role="a motion designer who generates keyframe animation data for UI elements",
        output_schema_hint=_ANIMATION_SCHEMA_HINT,
    )
    task = (
        f"Generate a {animation_type} animation appropriate for a '{object_type}' "
        f"UI element. Pick sensible easing curves and duration for the animation "
        f"type (hover animations should be snappy ~150-250ms, entrance/exit "
        f"200-500ms, loops can be longer)."
    )
    user = build_user_prompt(task)
    return system, user


def build_shader_prompt(effect_description: str, target_platform: str) -> tuple[str, str]:
    system = build_system_prompt(
        role=(
            "a graphics engineer who writes production-quality GLSL shaders "
            "for real-time WebGL/WebGPU rendering"
        ),
        output_schema_hint=_SHADER_SCHEMA_HINT,
    )
    task = build_chain_of_thought_wrapper(
        f"Write a {target_platform} shader implementing this effect: "
        f"\"{effect_description}\". Keep it performant (avoid unbounded loops, "
        f"expensive trig in hot paths where a cheaper approximation exists). "
        f"Escape newlines properly inside the JSON string values."
    )
    user = build_user_prompt(task) + "\n\n" + build_few_shot_block(_SHADER_FEW_SHOT)
    return system, user


def build_code_generation_prompt(framework: str, layer_summary: dict, include_types: bool) -> tuple[str, str]:
    system = build_system_prompt(
        role=f"a senior frontend engineer generating production-ready {framework} code from a design spec",
        output_schema_hint='{"code": str, "fileName": str, "types": str|null}',
    )
    task = (
        f"Generate {framework} code implementing this layer/design description. "
        f"{'Include TypeScript interfaces for all props/data shapes.' if include_types else ''} "
        f"Design description: {layer_summary}"
    )
    return system, build_user_prompt(task)


def build_refinement_prompt(current_design: dict, feedback: str, history: list[dict]) -> tuple[str, str]:
    system = build_system_prompt(
        role="a design assistant that applies natural-language feedback to an existing design",
        output_schema_hint=_DESIGN_SCHEMA_HINT,
    )
    history_summary = "; ".join(h.get("feedback", "") for h in history[-5:])
    task = (
        f"Current design (JSON): {current_design}\n\n"
        f"User feedback to apply: \"{feedback}\"\n\n"
        f"Prior refinements already applied in this session: {history_summary or 'none'}\n\n"
        f"Return the FULL updated design JSON with the feedback incorporated, "
        f"not just a diff."
    )
    user = build_user_prompt(task)
    return system, truncate_to_token_budget(user, max_tokens=4000)


def build_nlp_command_prompt(command: str, context: str) -> tuple[str, str]:
    system = build_system_prompt(
        role="a natural-language command parser for a design tool",
        output_schema_hint=(
            '{"actions": [{"type": str, "target": str, "params": object}], '
            '"ambiguous": bool, "clarificationNeeded": str|null}'
        ),
    )
    task = (
        f"Parse this design command into a sequence of discrete, executable "
        f"actions: \"{command}\". If the command contains multiple instructions "
        f"joined by 'and'/commas, split them into separate action objects "
        f"in execution order."
    )
    user = build_user_prompt(task, {"context": context})
    return system, user


def _looks_like_style_combo(prompt: str) -> bool:
    lowered = prompt.lower()
    return " meets " in lowered or " x " in lowered or "inspired by" in lowered
