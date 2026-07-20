"""
[Claude.A14] Analytics & Learning (spec section 16).

  - Track which AI features are used (per-feature call counters)
  - Monitor generation quality ratings (user-submitted 1-5 stars + comment)
  - Learn from user feedback (aggregate rating trends per feature/model)
  - Identify failure modes (structured log of every all-providers-failed
    event, model call failure, and safety block, ranked by frequency)
  - Model performance metrics (latency, cost, success rate per model)

This class is intentionally thin: all persistence lives in
db/repositories.py's AnalyticsRepository (Postgres when DATABASE_URL is
configured, in-memory otherwise), so AnalyticsService only owns
aggregation/business logic (rating averages, underperforming-feature
detection), not storage mechanics.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections import Counter, defaultdict

from db.repositories import get_analytics_repository
from models.ai.common import ModelUsage

logger = logging.getLogger("ai_engine.analytics_ai")


class AnalyticsService:
    def __init__(self):
        self.repository = get_analytics_repository()

    # ------------------------------------------------------------------ #
    # Recording
    # ------------------------------------------------------------------ #
    async def record_feature_usage(self, feature: str) -> None:
        await self.repository.increment_feature_usage(feature)

    async def record_rating(self, request_id: str, feature: str, rating: int, comment: str | None = None) -> None:
        if not 1 <= rating <= 5:
            raise ValueError("rating must be between 1 and 5")
        await self.repository.insert_rating(request_id, feature, rating, comment)

    async def record_failure(self, feature: str, reason: str, provider: str | None = None, model: str | None = None) -> None:
        await self.repository.insert_failure(feature, reason, provider, model)
        logger.warning("Recorded failure mode: feature=%s reason=%s provider=%s model=%s", feature, reason, provider, model)

    async def record_model_call(self, usage: ModelUsage, success: bool) -> None:
        await self.repository.upsert_model_performance(
            provider=usage.provider,
            model=usage.model,
            success=success,
            latency_ms=usage.latency_ms,
            cost_usd=usage.estimated_cost_usd,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
        )

    # ------------------------------------------------------------------ #
    # Reporting / learning
    # ------------------------------------------------------------------ #
    async def get_feature_usage(self) -> dict[str, int]:
        return await self.repository.fetch_feature_usage()

    async def get_quality_summary(self) -> dict[str, dict]:
        """Learn from user feedback: average rating + volume, grouped by feature."""
        ratings = await self.repository.fetch_ratings()
        by_feature: dict[str, list[int]] = defaultdict(list)
        for r in ratings:
            by_feature[r["feature"]].append(r["rating"])

        return {
            feature: {
                "avgRating": round(sum(values) / len(values), 2),
                "count": len(values),
                "distribution": dict(Counter(values)),
            }
            for feature, values in by_feature.items()
        }

    async def get_failure_modes(self, top_n: int = 10) -> dict:
        failures = await self.repository.fetch_failures()
        reasons = Counter(f["reason"] for f in failures)
        by_feature = Counter(f["feature"] for f in failures)

        return {
            "topReasons": [{"reason": reason, "count": count} for reason, count in reasons.most_common(top_n)],
            "byFeature": dict(by_feature.most_common(top_n)),
        }

    async def get_model_performance(self) -> list[dict]:
        records = await self.repository.fetch_model_performance()
        results = []
        for r in records:
            calls = r.get("calls", 0)
            results.append({
                "provider": r["provider"],
                "model": r["model"],
                "calls": calls,
                "successRate": round(r.get("successes", 0) / calls, 4) if calls else 0.0,
                "avgLatencyMs": round(r.get("total_latency_ms", 0) / calls, 1) if calls else 0.0,
                "totalCostUsd": round(float(r.get("total_cost_usd", 0.0)), 4),
                "totalTokens": r.get("total_prompt_tokens", 0) + r.get("total_completion_tokens", 0),
            })
        return results

    async def identify_underperforming_features(self, min_rating_threshold: float = 3.0, min_samples: int = 5) -> list[dict]:
        """
        Concretely 'learns' from feedback: flags any feature whose average
        rating has fallen below threshold with enough samples to be
        meaningful, so a human can go investigate the prompt/model choice
        for that feature.
        """
        quality = await self.get_quality_summary()
        return [
            {"feature": feature, "avgRating": stats["avgRating"], "sampleCount": stats["count"]}
            for feature, stats in quality.items()
            if stats["count"] >= min_samples and stats["avgRating"] < min_rating_threshold
        ]

    async def get_full_report(self) -> dict:
        usage, quality, failures, model_perf, underperforming = await asyncio.gather(
            self.get_feature_usage(),
            self.get_quality_summary(),
            self.get_failure_modes(),
            self.get_model_performance(),
            self.identify_underperforming_features(),
        )
        return {
            "featureUsage": usage,
            "qualityByFeature": quality,
            "failureModes": failures,
            "modelPerformance": model_perf,
            "underperformingFeatures": underperforming,
            "generatedAt": time.time(),
        }


_analytics_singleton: AnalyticsService | None = None


def get_analytics_service() -> AnalyticsService:
    global _analytics_singleton
    if _analytics_singleton is None:
        _analytics_singleton = AnalyticsService()
    return _analytics_singleton
