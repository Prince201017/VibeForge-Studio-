# [V0.A4] Core design-generation service. Wraps an LLM call and parses the response
# into scene-graph nodes the frontend Zustand store can apply directly.
from __future__ import annotations
import json
import logging
import uuid
from typing import Optional

import httpx

from .schemas import DesignGenerateRequest, DesignGenerateResponse, GeneratedNode

logger = logging.getLogger("forgeos.ai")

SYSTEM_PROMPT = """You are a design generation engine for a vector/motion design tool.
Given a natural-language prompt, output ONLY a JSON array of scene nodes.
Each node: {"type": "shape"|"text"|"group"|"image", "props": {...}}.
No prose, no markdown fences — raw JSON array only."""


class GenerationError(Exception):
    pass


async def generate_design(req: DesignGenerateRequest, api_key: str, model: str = "claude-sonnet-4-6") -> DesignGenerateResponse:
    if not api_key:
        raise GenerationError("AI_GATEWAY_API_KEY not configured")

    user_prompt = req.prompt
    if req.style:
        user_prompt += f"\n\nStyle guidance: {req.style}"

    payload = {
        "model": model,
        "max_tokens": 4000,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("AI gateway request failed: %s", exc)
            raise GenerationError("Design generation service unavailable") from exc

        data = resp.json()

    text_blocks = [b["text"] for b in data.get("content", []) if b.get("type") == "text"]
    raw = "".join(text_blocks).strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Model returned non-JSON output")
        raise GenerationError("Model returned an unparsable design") from exc

    nodes: list[GeneratedNode] = []
    for item in parsed[: req.max_nodes]:
        try:
            nodes.append(GeneratedNode(**item))
        except Exception:
            continue  # skip malformed nodes rather than fail the whole generation

    usage = data.get("usage", {})
    tokens_used = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)

    return DesignGenerateResponse(
        nodes=nodes,
        model_used=model,
        tokens_used=tokens_used,
        generation_id=str(uuid.uuid4()),
    )
