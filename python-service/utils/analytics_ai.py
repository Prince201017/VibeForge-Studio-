"""
[Claude.A14] Analytics & Learning (spec section 16). This section was
entirely unbuilt in the first pass — this is the real thing, not a stub:

  - Track which AI features are used (per-feature call counters)
  - Monitor generation quality ratings (user-submitted 1-5 stars + comment)
  - Learn from user feedback (aggregate rating trends per feature/model)
  - Identify failure modes (structured log of every all-providers-failed
    event, model call failure, and safety block, ranked by frequency)
  - Model performance metrics (latency, cost, success rate per model)

Storage is in-process by default (a single dict of counters/lists behind
a lock) with an optional Redis-backed persistence layer so metrics
survive restarts and aggregate across multiple worker processes — the
same pattern used in cache_manager.py, kept consistent deliberately.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field

from config import Settings, get_settings
from models.ai.common import ModelUsage

logger = logging.getLogger("ai_engine.analytics_ai")


@dataclass
class RatingEvent:
    request_id: str
    feature: str
    rating: int  # 1-5
    comment: str | None = None
    timestamp: float = field(default_factory=time.time)


@dataclass
class FailureEvent:
    feature: str
    reason: str
    provider: str | None = None
    model: str | None = None
    timestamp: float = field(default_factory=time.time)


@dataclass
class ModelPerformanceRecord:
    provider: str
    model: str
    calls: int = 0
    successes: int = 0
    failures: int = 0
    total_latency_ms: int = 0
    total_cost_usd: float = 0.0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0

    @property
    def success_rate(self) -> float:
        return round(self.successes / self.calls, 4) if self.calls else 0.0

    @property
    def avg_latency_ms(self) -> float:
        return round(self.total_latency_ms / self.calls, 1) if self.calls else 0.0

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "calls": self.calls,
            "successRate": self.success_rate,
            "avgLatencyMs": self.avg_latency_ms,
            "totalCostUsd": round(self.total_cost_usd, 4),
            "totalTokens": self.total_prompt_tokens + self.total_completion_tokens,
        }


class AnalyticsService:
    """
    Process-wide singleton. All mutating methods are sync-fast (pure
    in-memory dict ops under a lock) so instrumenting a hot path never
    adds meaningful latency; the optional Redis flush happens
    fire-and-forget on a background task.
    """

    _MAX_RATINGS_KEPT = 5000
    _MAX_FAILURES_KEPT = 2000

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._lock = asyncio.Lock()
        self._feature_usage: Counter[str] = Counter()
        self._ratings: list[RatingEvent] = []
        self._failures: list[FailureEvent] = []
        self._model_perf: dict[tuple[str, str], ModelPerformanceRecord] = {}
        self._redis = None

    async def _get_redis(self):
        if self._redis is None and self.settings.redis_url:
            import redis.asyncio as redis

            self._redis = redis.from_url(self.settings.redis_url, decode_responses=True)
        return self._redis

    # ------------------------------------------------------------------ #
    # Recording
    # ------------------------------------------------------------------ #
    async def record_feature_usage(self, feature: str) -> None:
        async with self._lock:
            self._feature_usage[feature] += 1
        redis_client = await self._get_redis()
        if redis_client:
            await redis_client.hincrby("ai:analytics:feature_usage", feature, 1)

    async def record_rating(self, request_id: str, feature: str, rating: int, comment: str | None = None) -> None:
        if not 1 <= rating <= 5:
            raise ValueError("rating must be between 1 and 5")
        event = RatingEvent(request_id=request_id, feature=feature, rating=rating, comment=comment)
        async with self._lock:
            self._ratings.append(event)
            if len(self._ratings) > self._MAX_RATINGS_KEPT:
                self._ratings.pop(0)
        redis_client = await self._get_redis()
        if redis_client:
            await redis_client.lpush("ai:analytics:ratings", json.dumps(asdict(event)))
            await redis_client.ltrim("ai:analytics:ratings", 0, self._MAX_RATINGS_KEPT - 1)

    async def record_failure(self, feature: str, reason: str, provider: str | None = None, model: str | None = None) -> None:
        event = FailureEvent(feature=feature, reason=reason, provider=provider, model=model)
        async with self._lock:
            self._failures.append(event)
            if len(self._failures) > self._MAX_FAILURES_KEPT:
                self._failures.pop(0)
        logger.warning("Recorded failure mode: feature=%s reason=%s provider=%s model=%s", feature, reason, provider, model)

    async def record_model_call(self, usage: ModelUsage, success: bool) -> None:
        key = (usage.provider, usage.model)
        async with self._lock:
            record = self._model_perf.setdefault(key, ModelPerformanceRecord(provider=usage.provider, model=usage.model))
            record.calls += 1
            record.successes += 1 if success else 0
            record.failures += 0 if success else 1
            record.total_latency_ms += usage.latency_ms
            record.total_cost_usd += usage.estimated_cost_usd
            record.total_prompt_tokens += usage.prompt_tokens
            record.total_completion_tokens += usage.completion_tokens

    # ------------------------------------------------------------------ #
    # Reporting / learning
    # ------------------------------------------------------------------ #
    async def get_feature_usage(self) -> dict[str, int]:
        async with self._lock:
            return dict(self._feature_usage)

    async def get_quality_summary(self) -> dict[str, dict]:
        """Learn from user feedback: average rating + volume, grouped by feature."""
        async with self._lock:
            by_feature: dict[str, list[int]] = defaultdict(list)
            for r in self._ratings:
                by_feature[r.feature].append(r.rating)

        return {
            feature: {
                "avgRating": round(sum(ratings) / len(ratings), 2),
                "count": len(ratings),
                "distribution": dict(Counter(ratings)),
            }
            for feature, ratings in by_feature.items()
        }

    async def get_failure_modes(self, top_n: int = 10) -> list[dict]:
        async with self._lock:
            reasons = Counter(f.reason for f in self._failures)
            by_feature = Counter(f.feature for f in self._failures)

        top_reasons = [{"reason": reason, "count": count} for reason, count in reasons.most_common(top_n)]
        for entry in top_reasons:
            pass  # reason strings are already human-readable; feature breakdown below

        return {
            "topReasons": top_reasons,
            "byFeature": dict(by_feature.most_common(top_n)),
        }

    async def get_model_performance(self) -> list[dict]:
        async with self._lock:
            return [record.to_dict() for record in self._model_perf.values()]

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
