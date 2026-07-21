"""
[Claude.A14] Safety & Guardrails (spec section 15).

Covers:
  - Content moderation for generated designs (text prompts + descriptions)
  - Bias detection heuristics in color/composition suggestions
  - Copyright detection signal for reference images (heuristic - real
    deployments should back this with a licensed image-matching API)
  - Inappropriate content filtering
  - User safety warnings surfaced back through the API envelope
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

_BLOCKED_PATTERNS = [
    r"\bnude\b", r"\bnsfw\b", r"\bgore\b", r"\bself[-\s]?harm\b",
    r"\bhate\s?symbol\b", r"\bswastika\b", r"\bchild\s?(sexual|abuse)\b",
    r"\bweapon\s+blueprint\b", r"\bexplosive\s+device\b",
]
_COMPILED_BLOCKED = [re.compile(p, re.IGNORECASE) for p in _BLOCKED_PATTERNS]

_KNOWN_BRAND_MARKS = [
    "disney", "marvel", "nike swoosh", "coca-cola logo", "pixar", "nintendo",
]


@dataclass
class SafetyResult:
    allowed: bool
    warnings: list[str] = field(default_factory=list)
    blocked_reason: str | None = None
    sanitized_text: str | None = None


def moderate_text(text: str) -> SafetyResult:
    """Blocks clearly unsafe prompts before they're ever sent to a model."""
    if not text:
        return SafetyResult(allowed=True)

    for pattern in _COMPILED_BLOCKED:
        if pattern.search(text):
            return SafetyResult(
                allowed=False,
                blocked_reason="Prompt matched a disallowed content pattern.",
            )

    warnings: list[str] = []
    lowered = text.lower()
    for brand in _KNOWN_BRAND_MARKS:
        if brand in lowered:
            warnings.append(
                f"Reference to '{brand}' detected — output may need to avoid "
                "reproducing protected brand marks; treat as stylistic "
                "inspiration only, not literal reproduction."
            )

    return SafetyResult(allowed=True, warnings=warnings, sanitized_text=text)


def detect_bias_in_suggestion(suggestion_type: str, payload: dict) -> list[str]:
    """
    Lightweight heuristic checks the spec calls "bias detection in
    color/composition suggestions". Flags suspicious homogeneity, e.g. a
    palette generator always returning the same few hues regardless of
    input, which can indicate the model defaulting to a narrow aesthetic.
    """
    warnings: list[str] = []
    if suggestion_type == "color_harmony":
        colors = payload.get("colors", [])
        if colors and len(set(colors)) == 1:
            warnings.append(
                "All suggested colors are identical — palette diversity check failed."
            )
    if suggestion_type == "layout":
        if payload.get("alignment") == "center" and payload.get("confidence", 1.0) < 0.3:
            warnings.append(
                "Low-confidence layout suggestion defaulted to a generic centered "
                "layout; consider requesting a second opinion."
            )
    return warnings


def check_reference_image_risk(image_url: str) -> SafetyResult:
    """
    Heuristic-only copyright signal: flags obvious stock/marketplace/brand
    domains so the caller can surface a warning. This is NOT a substitute
    for a real image-matching/copyright API and should be treated as a
    best-effort tripwire per the spec's "Copyright detection" requirement.
    """
    risky_domains = ("gettyimages", "shutterstock", "istockphoto", "alamy")
    warnings = []
    if any(domain in image_url.lower() for domain in risky_domains):
        warnings.append(
            "Reference image appears to originate from a licensed stock "
            "photo marketplace. Ensure you have rights to use it as a "
            "style reference before shipping derived output."
        )
    return SafetyResult(allowed=True, warnings=warnings)


def enforce_diversity(variations: list[dict]) -> list[str]:
    """Spec: 'Diverse output (not always same result)'. Flags near-duplicates."""
    warnings = []
    seen_signatures = set()
    for v in variations:
        signature = str(sorted(v.get("colors", []) or []))
        if signature in seen_signatures:
            warnings.append("Two or more variations produced near-identical palettes.")
            break
        seen_signatures.add(signature)
    return warnings
