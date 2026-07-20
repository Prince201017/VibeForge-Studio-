"""
[Claude.A14] Chooses which AI provider/model should handle a given task.

Implements the spec's "Model Integration Layer" requirements:
  - Support multiple providers with a fallback chain
  - Cost optimization (cheap models for simple tasks)
  - Capability-aware routing (vision vs text-only vs image-gen)
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field

from utils.token_counter import count_tokens


class Provider(str, enum.Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    STABILITY = "stability"
    LOCAL = "local"


class Capability(str, enum.Enum):
    TEXT = "text"
    VISION = "vision"
    IMAGE_GENERATION = "image_generation"
    CODE = "code"
    REASONING = "reasoning"


@dataclass(frozen=True)
class ModelSpec:
    provider: Provider
    model_name: str
    capabilities: tuple[Capability, ...]
    tier: str  # "cheap" | "standard" | "premium"
    price: dict = field(default_factory=dict)  # {"input_per_1k":.., "output_per_1k":..}


# Static registry. Kept intentionally simple/declarative so ops can retune
# fallback order without touching business logic.
MODEL_REGISTRY: list[ModelSpec] = [
    ModelSpec(Provider.ANTHROPIC, "claude-sonnet-4-6",
              (Capability.TEXT, Capability.VISION, Capability.CODE, Capability.REASONING),
              tier="premium", price={"input_per_1k": 0.003, "output_per_1k": 0.015}),
    ModelSpec(Provider.OPENAI, "gpt-4o",
              (Capability.TEXT, Capability.VISION, Capability.CODE),
              tier="premium", price={"input_per_1k": 0.005, "output_per_1k": 0.015}),
    ModelSpec(Provider.GOOGLE, "gemini-1.5-pro",
              (Capability.TEXT, Capability.VISION),
              tier="standard", price={"input_per_1k": 0.00125, "output_per_1k": 0.005}),
    ModelSpec(Provider.OPENAI, "gpt-4o-mini",
              (Capability.TEXT, Capability.CODE),
              tier="cheap", price={"input_per_1k": 0.00015, "output_per_1k": 0.0006}),
    ModelSpec(Provider.STABILITY, "stable-diffusion-xl-1024-v1-0",
              (Capability.IMAGE_GENERATION,),
              tier="standard", price={"input_per_1k": 0.0, "output_per_1k": 0.0}),
]


def select_fallback_chain(
    required_capability: Capability,
    prompt_tokens_estimate: int,
    cheap_task_max_tokens: int = 500,
    prefer_provider: Provider | None = None,
) -> list[ModelSpec]:
    """
    Returns an ordered list of candidate models to try. The caller should
    attempt them in order (see services/model_integration.py) and fall
    through on failure/timeout/rate-limit, satisfying the spec's
    "Primary -> Secondary -> Tertiary -> Local" fallback chain.
    """
    candidates = [m for m in MODEL_REGISTRY if required_capability in m.capabilities]
    if not candidates:
        raise ValueError(f"No registered model supports capability {required_capability}")

    is_simple_task = prompt_tokens_estimate <= cheap_task_max_tokens

    def sort_key(spec: ModelSpec):
        provider_bonus = 0 if prefer_provider and spec.provider == prefer_provider else 1
        if is_simple_task:
            tier_rank = {"cheap": 0, "standard": 1, "premium": 2}[spec.tier]
        else:
            tier_rank = {"premium": 0, "standard": 1, "cheap": 2}[spec.tier]
        return (provider_bonus, tier_rank)

    return sorted(candidates, key=sort_key)


def estimate_prompt_tokens(prompt: str) -> int:
    return count_tokens(prompt)
