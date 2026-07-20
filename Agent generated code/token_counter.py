"""
[Claude.A14] Token counting utilities used for cost estimation and for
choosing between models under the "cost optimization" requirement.

Falls back to a heuristic (chars / 4) whenever tiktoken doesn't know the
target model, which happens for non-OpenAI models like Claude or Gemini.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("ai_engine.token_counter")

try:
    import tiktoken

    _TIKTOKEN_AVAILABLE = True
except ImportError:  # pragma: no cover - tiktoken is an optional dependency
    _TIKTOKEN_AVAILABLE = False


_HEURISTIC_CHARS_PER_TOKEN = 4


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """Best-effort token count for arbitrary text against a given model."""
    if not text:
        return 0

    if _TIKTOKEN_AVAILABLE:
        try:
            encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            encoding = tiktoken.get_encoding("cl100k_base")
        try:
            return len(encoding.encode(text))
        except Exception as exc:  # noqa: BLE001
            logger.warning("tiktoken failed (%s), falling back to heuristic", exc)

    return max(1, len(text) // _HEURISTIC_CHARS_PER_TOKEN)


def estimate_cost_usd(prompt_tokens: int, completion_tokens: int, price_table: dict) -> float:
    """
    price_table example:
        {"input_per_1k": 0.005, "output_per_1k": 0.015}
    """
    input_cost = (prompt_tokens / 1000) * price_table.get("input_per_1k", 0.0)
    output_cost = (completion_tokens / 1000) * price_table.get("output_per_1k", 0.0)
    return round(input_cost + output_cost, 6)


def truncate_to_token_budget(text: str, max_tokens: int, model: str = "gpt-4o") -> str:
    """Trim text so it fits under max_tokens, cutting on paragraph boundaries first."""
    if count_tokens(text, model) <= max_tokens:
        return text

    paragraphs = text.split("\n\n")
    kept: list[str] = []
    for para in paragraphs:
        candidate = "\n\n".join(kept + [para])
        if count_tokens(candidate, model) > max_tokens:
            break
        kept.append(para)

    if kept:
        return "\n\n".join(kept)

    approx_chars = max_tokens * _HEURISTIC_CHARS_PER_TOKEN
    return text[:approx_chars]
