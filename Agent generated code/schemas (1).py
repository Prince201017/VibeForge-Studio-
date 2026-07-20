# [V0.A4] Request/response schemas for the AI integration service.
from pydantic import BaseModel, Field
from typing import Optional, Literal


class DesignGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    project_id: str
    style: Optional[str] = None
    reference_asset_id: Optional[str] = None
    max_nodes: int = Field(default=50, ge=1, le=500)


class GeneratedNode(BaseModel):
    type: Literal["shape", "text", "group", "image"]
    props: dict


class DesignGenerateResponse(BaseModel):
    nodes: list[GeneratedNode]
    model_used: str
    tokens_used: int
    generation_id: str


class DesignRefineRequest(BaseModel):
    project_id: str
    node_ids: list[str]
    instruction: str = Field(..., min_length=1, max_length=2000)
