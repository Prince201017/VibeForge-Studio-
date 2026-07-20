"""
[Claude.A14] Repositories: the actual persistence implementation behind
RefinementEngine's session store and AnalyticsService's counters/logs.

Every method here does real SQL work when DATABASE_URL is configured
(get_pool() returns a live asyncpg pool) and falls back to a private
in-memory structure otherwise, so nothing upstream has to branch on
whether Postgres is configured - services just call the repository.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from db.connection import get_pool


# --------------------------------------------------------------------------- #
# Refinement sessions
# --------------------------------------------------------------------------- #
@dataclass
class RefinementSessionRow:
    design_id: str
    current_design: dict
    history: list[dict] = field(default_factory=list)


class RefinementRepository:
    def __init__(self):
        self._memory: dict[str, RefinementSessionRow] = {}

    async def get(self, design_id: str) -> RefinementSessionRow | None:
        pool = await get_pool()
        if pool is None:
            return self._memory.get(design_id)

        async with pool.acquire() as conn:
            session_row = await conn.fetchrow(
                "SELECT design_id, current_design FROM ai_refinement_sessions WHERE design_id = $1",
                design_id,
            )
            if session_row is None:
                return None
            history_rows = await conn.fetch(
                "SELECT feedback, applied_changes, created_at FROM ai_refinement_history "
                "WHERE design_id = $1 ORDER BY created_at ASC",
                design_id,
            )
        return RefinementSessionRow(
            design_id=session_row["design_id"],
            current_design=json.loads(session_row["current_design"]),
            history=[
                {"feedback": r["feedback"], "applied_changes": json.loads(r["applied_changes"])}
                for r in history_rows
            ],
        )

    async def register(self, design_id: str, design_json: dict) -> None:
        """No-op if the session already exists (matches in-memory register_design semantics)."""
        pool = await get_pool()
        if pool is None:
            if design_id not in self._memory:
                self._memory[design_id] = RefinementSessionRow(design_id=design_id, current_design=design_json)
            return

        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO ai_refinement_sessions (design_id, current_design) VALUES ($1, $2) "
                "ON CONFLICT (design_id) DO NOTHING",
                design_id, json.dumps(design_json),
            )

    async def append_turn(self, design_id: str, feedback: str, updated_design: dict) -> None:
        pool = await get_pool()
        if pool is None:
            session = self._memory.setdefault(design_id, RefinementSessionRow(design_id=design_id, current_design=updated_design))
            session.current_design = updated_design
            session.history.append({"feedback": feedback, "applied_changes": updated_design})
            return

        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "UPDATE ai_refinement_sessions SET current_design = $2, updated_at = now() "
                    "WHERE design_id = $1",
                    design_id, json.dumps(updated_design),
                )
                await conn.execute(
                    "INSERT INTO ai_refinement_history (design_id, feedback, applied_changes) "
                    "VALUES ($1, $2, $3)",
                    design_id, feedback, json.dumps(updated_design),
                )

    async def undo(self, design_id: str) -> dict | None:
        pool = await get_pool()
        if pool is None:
            session = self._memory.get(design_id)
            if not session or not session.history:
                return None
            session.history.pop()
            session.current_design = session.history[-1]["applied_changes"] if session.history else session.current_design
            return session.current_design

        async with pool.acquire() as conn:
            async with conn.transaction():
                last_row = await conn.fetchrow(
                    "SELECT id FROM ai_refinement_history WHERE design_id = $1 "
                    "ORDER BY created_at DESC LIMIT 1",
                    design_id,
                )
                if last_row is None:
                    return None
                await conn.execute("DELETE FROM ai_refinement_history WHERE id = $1", last_row["id"])

                prior_row = await conn.fetchrow(
                    "SELECT applied_changes FROM ai_refinement_history WHERE design_id = $1 "
                    "ORDER BY created_at DESC LIMIT 1",
                    design_id,
                )
                reverted = (
                    json.loads(prior_row["applied_changes"]) if prior_row
                    else json.loads((await conn.fetchrow(
                        "SELECT current_design FROM ai_refinement_sessions WHERE design_id = $1", design_id
                    ))["current_design"])
                )
                await conn.execute(
                    "UPDATE ai_refinement_sessions SET current_design = $2, updated_at = now() WHERE design_id = $1",
                    design_id, json.dumps(reverted),
                )
        return reverted


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
class AnalyticsRepository:
    def __init__(self):
        self._memory_ratings: list[dict] = []
        self._memory_failures: list[dict] = []
        self._memory_usage: dict[str, int] = {}
        self._memory_perf: dict[tuple[str, str], dict] = {}

    async def increment_feature_usage(self, feature: str) -> None:
        pool = await get_pool()
        if pool is None:
            self._memory_usage[feature] = self._memory_usage.get(feature, 0) + 1
            return
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO ai_feature_usage (feature, call_count) VALUES ($1, 1) "
                "ON CONFLICT (feature) DO UPDATE SET call_count = ai_feature_usage.call_count + 1, updated_at = now()",
                feature,
            )

    async def insert_rating(self, request_id: str, feature: str, rating: int, comment: str | None) -> None:
        pool = await get_pool()
        if pool is None:
            self._memory_ratings.append({
                "request_id": request_id, "feature": feature, "rating": rating,
                "comment": comment, "created_at": time.time(),
            })
            return
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO ai_ratings (request_id, feature, rating, comment) VALUES ($1, $2, $3, $4)",
                request_id, feature, rating, comment,
            )

    async def insert_failure(self, feature: str, reason: str, provider: str | None, model: str | None) -> None:
        pool = await get_pool()
        if pool is None:
            self._memory_failures.append({
                "feature": feature, "reason": reason, "provider": provider,
                "model": model, "created_at": time.time(),
            })
            return
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO ai_failures (feature, reason, provider, model) VALUES ($1, $2, $3, $4)",
                feature, reason, provider, model,
            )

    async def upsert_model_performance(
        self, provider: str, model: str, success: bool, latency_ms: int,
        cost_usd: float, prompt_tokens: int, completion_tokens: int,
    ) -> None:
        pool = await get_pool()
        if pool is None:
            key = (provider, model)
            rec = self._memory_perf.setdefault(key, {
                "provider": provider, "model": model, "calls": 0, "successes": 0, "failures": 0,
                "total_latency_ms": 0, "total_cost_usd": 0.0, "total_prompt_tokens": 0, "total_completion_tokens": 0,
            })
            rec["calls"] += 1
            rec["successes"] += 1 if success else 0
            rec["failures"] += 0 if success else 1
            rec["total_latency_ms"] += latency_ms
            rec["total_cost_usd"] += cost_usd
            rec["total_prompt_tokens"] += prompt_tokens
            rec["total_completion_tokens"] += completion_tokens
            return

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ai_model_performance
                    (provider, model, calls, successes, failures, total_latency_ms,
                     total_cost_usd, total_prompt_tokens, total_completion_tokens)
                VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (provider, model) DO UPDATE SET
                    calls = ai_model_performance.calls + 1,
                    successes = ai_model_performance.successes + $3,
                    failures = ai_model_performance.failures + $4,
                    total_latency_ms = ai_model_performance.total_latency_ms + $5,
                    total_cost_usd = ai_model_performance.total_cost_usd + $6,
                    total_prompt_tokens = ai_model_performance.total_prompt_tokens + $7,
                    total_completion_tokens = ai_model_performance.total_completion_tokens + $8,
                    updated_at = now()
                """,
                provider, model, 1 if success else 0, 0 if success else 1,
                latency_ms, cost_usd, prompt_tokens, completion_tokens,
            )

    async def fetch_feature_usage(self) -> dict[str, int]:
        pool = await get_pool()
        if pool is None:
            return dict(self._memory_usage)
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT feature, call_count FROM ai_feature_usage")
        return {r["feature"]: r["call_count"] for r in rows}

    async def fetch_ratings(self, limit: int = 5000) -> list[dict]:
        pool = await get_pool()
        if pool is None:
            return list(self._memory_ratings[-limit:])
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT request_id, feature, rating, comment FROM ai_ratings "
                "ORDER BY created_at DESC LIMIT $1", limit
            )
        return [dict(r) for r in rows]

    async def fetch_failures(self, limit: int = 2000) -> list[dict]:
        pool = await get_pool()
        if pool is None:
            return list(self._memory_failures[-limit:])
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT feature, reason, provider, model FROM ai_failures "
                "ORDER BY created_at DESC LIMIT $1", limit
            )
        return [dict(r) for r in rows]

    async def fetch_model_performance(self) -> list[dict]:
        pool = await get_pool()
        if pool is None:
            return list(self._memory_perf.values())
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM ai_model_performance")
        return [dict(r) for r in rows]


_refinement_repo: RefinementRepository | None = None
_analytics_repo: AnalyticsRepository | None = None


def get_refinement_repository() -> RefinementRepository:
    global _refinement_repo
    if _refinement_repo is None:
        _refinement_repo = RefinementRepository()
    return _refinement_repo


def get_analytics_repository() -> AnalyticsRepository:
    global _analytics_repo
    if _analytics_repo is None:
        _analytics_repo = AnalyticsRepository()
    return _analytics_repo
