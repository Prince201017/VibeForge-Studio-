"""
[Claude.A14] Voice & Natural Language Commands (spec section 10).

Parses free-text (or voice-transcribed) design commands into a sequence
of discrete, executable actions the frontend Zustand store can dispatch.
Handles compound commands ("rotate it 45 degrees and add a shadow") by
asking the model to decompose them, then validates the result against a
known action vocabulary so the frontend never receives an action type it
doesn't understand.
"""
from __future__ import annotations

import logging
import re

from services.model_integration import ModelIntegrationService, parse_json_response
from services.prompt_engineering import build_nlp_command_prompt
from utils.model_selector import Capability
from utils.safety_filter import moderate_text

logger = logging.getLogger("ai_engine.nlp_commands")

# Known action vocabulary the frontend state contract (STATE_CONTRACT.md)
# is expected to support. Anything outside this set gets flagged rather
# than silently dispatched.
_KNOWN_ACTION_TYPES = {
    "move", "resize", "rotate", "recolor", "setOpacity", "setCornerRadius",
    "addShadow", "removeShadow", "align", "center", "duplicate", "delete",
    "group", "ungroup", "setText", "setFontSize", "reorder", "addAnimation",
    "setBlur",
}

# Deterministic fast-path patterns for extremely common single commands,
# avoiding a model round-trip to satisfy the <500ms parsing SLA.
_FAST_PATTERNS: list[tuple[re.Pattern, callable]] = [
    (re.compile(r"^rotate.*?(-?\d+)\s*deg", re.IGNORECASE),
     lambda m: {"type": "rotate", "params": {"degrees": float(m.group(1))}}),
    (re.compile(r"^center\b", re.IGNORECASE),
     lambda m: {"type": "center", "params": {}}),
    (re.compile(r"^delete\b", re.IGNORECASE),
     lambda m: {"type": "delete", "params": {}}),
    (re.compile(r"^duplicate\b", re.IGNORECASE),
     lambda m: {"type": "duplicate", "params": {}}),
]


class NLPCommandParser:
    def __init__(self, model_service: ModelIntegrationService | None = None):
        self.model_service = model_service or ModelIntegrationService()

    async def parse(self, command: str, context: str = "") -> dict:
        safety = moderate_text(command)
        if not safety.allowed:
            return {"actions": [], "ambiguous": True, "clarificationNeeded": "Command was blocked by the safety filter."}

        is_compound = bool(re.search(r"\band\b|,", command, re.IGNORECASE))
        if not is_compound:
            fast_result = self._try_fast_path(command)
            if fast_result:
                return {"actions": [fast_result], "ambiguous": False, "clarificationNeeded": None}

        return await self._parse_via_model(command, context)

    def _try_fast_path(self, command: str) -> dict | None:
        stripped = command.strip()
        for pattern, builder in _FAST_PATTERNS:
            match = pattern.match(stripped)
            if match:
                action = builder(match)
                action["target"] = "selected"
                return action
        return None

    async def _parse_via_model(self, command: str, context: str) -> dict:
        system_prompt, user_prompt = build_nlp_command_prompt(command, context)
        result = await self.model_service.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            capability=Capability.TEXT,
            max_tokens=600,
            temperature=0.2,
        )
        parsed = parse_json_response(result.text)

        valid_actions = []
        unknown_types = []
        for action in parsed.get("actions", []):
            action_type = action.get("type")
            if action_type in _KNOWN_ACTION_TYPES:
                valid_actions.append(action)
            else:
                unknown_types.append(action_type)

        clarification = parsed.get("clarificationNeeded")
        if unknown_types and not clarification:
            clarification = f"Unrecognized action(s): {', '.join(str(t) for t in unknown_types)}"

        return {
            "actions": valid_actions,
            "ambiguous": bool(parsed.get("ambiguous", False)) or bool(unknown_types),
            "clarificationNeeded": clarification,
        }
