# [Claude.A14] "Describe a component, get a scene graph" — thin wrapper reusing
# 04-ai-integration's generation contract but scoped to component-level requests
# (buttons, cards, form layouts) rather than full designs.
from __future__ import annotations
from pydantic import BaseModel, Field


class ComponentGenRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=1000)
    component_type: str  # "button" | "card" | "form" | "nav" | etc, free-form hint


COMPONENT_SYSTEM_PROMPT = """You generate a scene-graph JSON array of nodes for a single
UI component based on a description. Same node schema as the design generator:
{"type": "shape"|"text"|"group", "props": {...}}. JSON array only, no prose."""


async def generate_component(req: ComponentGenRequest, llm_client) -> list[dict]:
    prompt = f"{req.component_type}: {req.description}"
    response_text = await llm_client.complete(system=COMPONENT_SYSTEM_PROMPT, user=prompt)
    cleaned = response_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    import json
    try:
        nodes = json.loads(cleaned)
        return nodes if isinstance(nodes, list) else []
    except json.JSONDecodeError:
        return []
