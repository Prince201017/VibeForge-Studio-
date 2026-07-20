"""
[Claude.A14] Shared request/response envelope types used by every AI
endpoint in routes/ai.py. Keeping these common ensures the frontend
lib/ai/types.ts can share one predictable response shape.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ModelUsage(BaseModel):
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    latency_ms: int = 0
    fallback_depth: int = 0  # 0 = primary model succeeded, 1 = first fallback, etc.


class AIResponseMeta(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    usage: ModelUsage | None = None
    warnings: list[str] = Field(default_factory=list)
    cached: bool = False


class AIResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None
    meta: AIResponseMeta = Field(default_factory=AIResponseMeta)


class AIErrorCode:
    SAFETY_BLOCKED = "safety_blocked"
    RATE_LIMITED = "rate_limited"
    TIMEOUT = "timeout"
    ALL_PROVIDERS_FAILED = "all_providers_failed"
    INVALID_INPUT = "invalid_input"
    NOT_FOUND = "not_found"


class RefinementTurn(BaseModel):
    feedback: str
    applied_changes: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
