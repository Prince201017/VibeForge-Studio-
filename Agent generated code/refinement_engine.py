"""
[Claude.A14] Iterative Refinement (spec section 8).

Accepts natural-language feedback on an existing design and produces an
updated design, while tracking the refinement history per designId so
multi-turn conversations ("make it more vibrant" -> "now make the
corners sharper") stay coherent and undo/redo has a clear trail.

Session state here is in-process; a production deployment would persist
`RefinementSession` rows to Postgres (see 11_DATABASE_SCHEMA_NEEDS.md)
keyed by designId. The interface is written so swapping the in-memory
store for a DB-backed repository is a one-file change.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from models.ai.common import RefinementTurn
from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_refinement_prompt
from utils.model_selector import Capability
from utils.safety_filter import moderate_text

logger = logging.getLogger("ai_engine.refinement_engine")


class RefinementError(Exception):
    def __init__(self, message: str, blocked: bool = False):
        self.blocked = blocked
        super().__init__(message)


@dataclass
class RefinementSession:
    design_id: str
    current_design: dict
    history: list[RefinementTurn] = field(default_factory=list)


class _InMemorySessionStore:
    def __init__(self):
        self._sessions: dict[str, RefinementSession] = {}

    def get(self, design_id: str) -> RefinementSession | None:
        return self._sessions.get(design_id)

    def upsert(self, session: RefinementSession) -> None:
        self._sessions[session.design_id] = session


_store = _InMemorySessionStore()


class RefinementEngine:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    def register_design(self, design_id: str, design_json: dict) -> None:
        """Called right after design_generator produces a design, so refine()
        has something to work from even on the very first feedback turn."""
        if _store.get(design_id) is None:
            _store.upsert(RefinementSession(design_id=design_id, current_design=design_json))

    async def refine(self, design_id: str, feedback: str, refinement_count: int = 1) -> tuple[dict, list[str]]:
        safety = moderate_text(feedback)
        if not safety.allowed:
            raise RefinementError(safety.blocked_reason or "Feedback blocked by safety filter", blocked=True)

        session = _store.get(design_id)
        if session is None:
            raise RefinementError(f"No design found for designId={design_id}. Generate a design first.")

        warnings = list(safety.warnings)
        updated_design = session.current_design

        for _ in range(max(1, refinement_count)):
            updated_design = await self._apply_single_refinement(updated_design, feedback, session.history)
            session.history.append(RefinementTurn(feedback=feedback, applied_changes=updated_design))

        session.current_design = updated_design
        _store.upsert(session)
        return updated_design, warnings

    def get_history(self, design_id: str) -> list[RefinementTurn]:
        session = _store.get(design_id)
        return session.history if session else []

    def undo(self, design_id: str) -> dict | None:
        """Pops the last refinement turn and reverts to the design state
        before it, supporting the spec's 'Track design decisions for
        undo/redo' requirement."""
        session = _store.get(design_id)
        if not session or not session.history:
            return None
        session.history.pop()
        if session.history:
            session.current_design = session.history[-1].applied_changes
        _store.upsert(session)
        return session.current_design

    async def _apply_single_refinement(self, current_design: dict, feedback: str, history: list[RefinementTurn]) -> dict:
        system_prompt, user_prompt = build_refinement_prompt(
            current_design, feedback, [h.__dict__ for h in history]
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.TEXT,
            max_tokens=3000,
            temperature=0.5,
        )
        parsed = parse_json_response(result.text)
        if not parsed.get("layers"):
            # Model returned something malformed - keep the prior design
            # rather than silently corrupting it.
            logger.warning("Refinement response missing 'layers'; keeping prior design")
            return current_design
        return parsed
