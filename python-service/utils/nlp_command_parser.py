# [Claude.A14] Natural-language editor command parsing — "make the circle bigger and
# move it right" -> structured operations the frontend Zustand store can apply.
# Uses the same LLM-call pattern as 04-ai-integration but for command parsing rather
# than full design generation, so kept as its own module with a tighter output schema.
from __future__ import annotations
import json
import logging
from typing import Literal
from pydantic import BaseModel

logger = logging.getLogger("forgeos.advanced_ai")


class ParsedCommand(BaseModel):
    action: Literal["move", "resize", "recolor", "rotate", "delete", "duplicate", "group", "unknown"]
    target_hint: str          # natural-language description of the target, resolved client-side against selection
    params: dict


COMMAND_SYSTEM_PROMPT = """Parse a design-editor voice/text command into JSON:
{"action": "move|resize|recolor|rotate|delete|duplicate|group|unknown", "target_hint": "...", "params": {...}}
Only output the JSON object, nothing else."""


async def parse_command(text: str, llm_client) -> ParsedCommand:
    """llm_client is injected (same Anthropic Messages API client as 04-ai-integration)
    so this module has no hard framework dependency and is independently testable
    with a fake client."""
    response_text = await llm_client.complete(system=COMMAND_SYSTEM_PROMPT, user=text)
    cleaned = response_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        data = json.loads(cleaned)
        return ParsedCommand(**data)
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Failed to parse NLP command %r: %s", text, exc)
        return ParsedCommand(action="unknown", target_hint=text, params={})
