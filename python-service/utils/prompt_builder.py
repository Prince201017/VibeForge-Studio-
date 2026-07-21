"""
[Claude.A14] Constructs optimized, structured prompts for design tasks.

Centralizing prompt construction here means every service (design_generator,
style_transfer, shader_generator, etc.) gets consistent system framing,
consistent JSON-only output instructions, and consistent few-shot patterns
instead of ad-hoc string formatting scattered across the codebase.
"""
from __future__ import annotations

from typing import Any


JSON_ONLY_INSTRUCTION = (
    "Respond with ONLY a single valid JSON object. Do not include markdown "
    "code fences, prose, explanations, or any text outside the JSON object. "
    "If you cannot fulfill part of the request, use null for that field "
    "rather than omitting it or apologizing in plain text."
)


def build_system_prompt(role: str, output_schema_hint: str | None = None) -> str:
    """
    role: short description of the specialist persona, e.g.
          "an expert UI/UX designer who converts natural language into
           structured layout JSON"
    """
    parts = [
        f"You are {role}.",
        "You work inside ForgeOS, a professional design tool. Your output "
        "is consumed programmatically, not read by a human directly.",
        JSON_ONLY_INSTRUCTION,
    ]
    if output_schema_hint:
        parts.append(f"The JSON object MUST conform to this shape:\n{output_schema_hint}")
    return "\n\n".join(parts)


def build_few_shot_block(examples: list[dict[str, Any]]) -> str:
    """
    examples: [{"input": "...", "output": {...}}, ...]
    Rendered as alternating Example Input / Example Output blocks so the
    model can pattern-match structure before seeing the real request.
    """
    if not examples:
        return ""
    blocks = []
    for i, ex in enumerate(examples, start=1):
        blocks.append(
            f"Example {i} input: {ex['input']}\nExample {i} output: {ex['output']}"
        )
    return "\n\n".join(blocks)


def build_chain_of_thought_wrapper(task_instruction: str) -> str:
    """
    Encourages internal reasoning without leaking it into the final answer -
    we ask the model to reason silently, then only emit the JSON result,
    which keeps output parsing simple and token-cheap.
    """
    return (
        f"{task_instruction}\n\n"
        "Think through the design decisions step by step internally, but do "
        "NOT output your reasoning. Output only the final JSON result."
    )


def build_style_combination_prompt(style_description: str) -> str:
    """
    Handles the spec's "style combinations" requirement, e.g.
    'Apple meets Stripe with glass morphism'. We explicitly ask the model
    to decompose named influences into concrete visual attributes so
    downstream layer/shape generation has something deterministic to key off.
    """
    return (
        f"Decompose this style description into concrete, generatable "
        f"visual attributes (color palette, typography scale, corner "
        f"radius, shadow depth, opacity/blur for glass effects, spacing "
        f"rhythm): \"{style_description}\". "
        "If named brands or sites are referenced, translate their known "
        "visual language into attributes rather than referencing the brand "
        "name in the output."
    )


def build_user_prompt(task_instruction: str, context: dict[str, Any] | None = None) -> str:
    context = context or {}
    context_lines = "\n".join(f"- {k}: {v}" for k, v in context.items() if v is not None)
    if context_lines:
        return f"{task_instruction}\n\nContext:\n{context_lines}"
    return task_instruction
