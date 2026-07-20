"""
[Claude.A14] Iterative Refinement (spec section 8).

Accepts natural-language feedback on an existing design and produces an
updated design, while tracking the refinement history per designId so
multi-turn conversations ("make it more vibrant" -> "now make the
corners sharper") stay coherent and undo/redo has a clear trail.

Session state is persisted through db/repositories.py's
RefinementRepository, which writes to Postgres when DATABASE_URL is
configured and falls back to in-memory storage otherwise. This class no
longer talks to a raw dict directly - swapping storage backends is
entirely the repository's concern.
"""
from __future__ import annotations

import logging

from db.repositories import get_refinement_repository
from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_refinement_prompt
from utils.model_selector import Capability
from utils.moderation import moderate_text_layered

logger = logging.getLogger("ai_engine.refinement_engine")


class RefinementError(Exception):
    def __init__(self, message: str, blocked: bool = False):
        self.blocked = blocked
        super().__init__(message)


class RefinementEngine:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()
        self.repository = get_refinement_repository()

    async def register_design(self, design_id: str, design_json: dict) -> None:
        """Called right after design_generator produces a design, so refine()
        has something to work from even on the very first feedback turn."""
        await self.repository.register(design_id, design_json)

    async def refine(self, design_id: str, feedback: str, refinement_count: int = 1) -> tuple[dict, list[str]]:
        allowed, blocked_reason, warnings = await moderate_text_layered(feedback)
        if not allowed:
            raise RefinementError(blocked_reason or "Feedback blocked by safety filter", blocked=True)

        session = await self.repository.get(design_id)
        if session is None:
            raise RefinementError(f"No design found for designId={design_id}. Generate a design first.")

        updated_design = session.current_design
        history = list(session.history)

        for _ in range(max(1, refinement_count)):
            updated_design = await self._apply_single_refinement(updated_design, feedback, history)
            history.append({"feedback": feedback, "applied_changes": updated_design})
            await self.repository.append_turn(design_id, feedback, updated_design)

        return updated_design, warnings

    async def get_history(self, design_id: str) -> list[dict]:
        session = await self.repository.get(design_id)
        return session.history if session else []

    async def undo(self, design_id: str) -> dict | None:
        """Pops the last refinement turn and reverts to the design state
        before it, supporting the spec's 'Track design decisions for
        undo/redo' requirement."""
        return await self.repository.undo(design_id)

    async def _apply_single_refinement(self, current_design: dict, feedback: str, history: list[dict]) -> dict:
        system_prompt, user_prompt = build_refinement_prompt(
            current_design, feedback, history
        )
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.TEXT,
            max_tokens=3000,
            temperature=0.5,
            feature="refinement",
        )
        parsed = parse_json_response(result.text)
        if not parsed.get("layers"):
            # Model returned something malformed - keep the prior design
            # rather than silently corrupting it.
            logger.warning("Refinement response missing 'layers'; keeping prior design")
            return current_design
        return parsed
