"""
[Claude.A14] Real content moderation (spec section 15 — "Content
moderation for generated designs"). The heuristic regex filter in
safety_filter.py stays as a zero-latency, zero-dependency first pass and
as a fallback when no moderation API is configured, but it was never a
substitute for an actual moderation model — this module is that model.

Uses OpenAI's /v1/moderations endpoint (omni-moderation-latest), which
scores text (and, per-category, images) across hate, harassment,
self-harm, sexual, and violence categories. Any provider key works for
authentication since moderation is billed separately/free by OpenAI;
this does not require the same key used for completions if you want to
isolate billing.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from config import Settings, get_settings

logger = logging.getLogger("ai_engine.moderation")


class ModerationUnavailableError(Exception):
    """Raised when no moderation provider is configured; caller should fall back to heuristics."""


@dataclass
class ModerationVerdict:
    flagged: bool
    categories: dict[str, bool] = field(default_factory=dict)
    category_scores: dict[str, float] = field(default_factory=dict)
    provider: str = "openai-moderation"


class ContentModerationService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.settings.openai_api_key:
                raise ModerationUnavailableError("OPENAI_API_KEY not configured; moderation API unavailable")
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        return self._client

    async def moderate_text(self, text: str) -> ModerationVerdict:
        if not text.strip():
            return ModerationVerdict(flagged=False)

        client = self._get_client()
        try:
            resp = await client.moderations.create(model="omni-moderation-latest", input=text)
        except Exception as exc:  # noqa: BLE001
            raise ModerationUnavailableError(f"Moderation API call failed: {exc}") from exc

        result = resp.results[0]
        return ModerationVerdict(
            flagged=result.flagged,
            categories={k: v for k, v in result.categories.model_dump().items()},
            category_scores={k: v for k, v in result.category_scores.model_dump().items()},
        )

    async def moderate_image(self, image_url: str) -> ModerationVerdict:
        """
        omni-moderation-latest also accepts image inputs, covering the
        spec's inappropriate-content-filtering requirement for reference
        images and generated design previews, not just text prompts.
        """
        client = self._get_client()
        try:
            resp = await client.moderations.create(
                model="omni-moderation-latest",
                input=[{"type": "image_url", "image_url": {"url": image_url}}],
            )
        except Exception as exc:  # noqa: BLE001
            raise ModerationUnavailableError(f"Moderation API call failed: {exc}") from exc

        result = resp.results[0]
        return ModerationVerdict(
            flagged=result.flagged,
            categories={k: v for k, v in result.categories.model_dump().items()},
            category_scores={k: v for k, v in result.category_scores.model_dump().items()},
        )


_moderation_service_singleton: ContentModerationService | None = None


def get_moderation_service() -> ContentModerationService:
    global _moderation_service_singleton
    if _moderation_service_singleton is None:
        _moderation_service_singleton = ContentModerationService()
    return _moderation_service_singleton


async def moderate_text_layered(text: str) -> tuple[bool, str | None, list[str]]:
    """
    Combined check used by every domain service: real moderation API
    first, heuristic filter second (both, not either/or — the API call
    can be slow/unavailable, and the heuristic catches a few patterns
    the general-purpose moderation model isn't tuned for, like brand-mark
    references relevant specifically to a design tool).

    Returns (allowed, blocked_reason, warnings).
    """
    from utils.safety_filter import moderate_text as heuristic_moderate

    heuristic_result = heuristic_moderate(text)
    if not heuristic_result.allowed:
        return False, heuristic_result.blocked_reason, []

    warnings = list(heuristic_result.warnings)

    try:
        service = get_moderation_service()
        verdict = await service.moderate_text(text)
        if verdict.flagged:
            flagged_categories = [k for k, v in verdict.categories.items() if v]
            return False, f"Content flagged by moderation API: {', '.join(flagged_categories)}", warnings
    except ModerationUnavailableError as exc:
        logger.info("Moderation API unavailable, relying on heuristic filter only: %s", exc)
        warnings.append("Real-time moderation API unavailable; only heuristic filtering was applied.")

    return True, None, warnings
