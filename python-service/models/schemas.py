"""
[V0.A1] Pydantic schemas for API request/response validation.
Shared across all route modules.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ProjectBase(BaseModel):
    """[V0.A1] Base project schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    thumbnail: Optional[str] = Field(default=None)


class ProjectCreate(ProjectBase):
    """[V0.A1] Schema for creating a new project."""
    pass


class ProjectResponse(ProjectBase):
    """[V0.A1] Schema for project API responses."""
    id: str
    created_at: datetime
    updated_at: datetime
    owner_id: str

    class Config:
        from_attributes = True


class LayerBase(BaseModel):
    """[V0.A1] Base layer schema."""
    name: str
    type: str  # "shape", "text", "group", "image", etc.
    visible: bool = True
    opacity: float = Field(default=1.0, ge=0, le=1)
    locked: bool = False


class LayerResponse(LayerBase):
    """[V0.A1] Layer response with additional metadata."""
    id: str
    project_id: str
    parent_id: Optional[str]
    z_index: int
    properties: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KeyframeBase(BaseModel):
    """[V0.A1] Base keyframe schema."""
    layer_id: str
    property_name: str  # "position", "rotation", "opacity", etc.
    time: float  # in milliseconds
    value: Any
    easing: str = "linear"


class KeyframeResponse(KeyframeBase):
    """[V0.A1] Keyframe response."""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnimationExportRequest(BaseModel):
    """[V0.A1] Schema for animation export requests."""
    project_id: str
    format: str = Field(..., regex="^(gif|webm|mp4|apng|lottie|css|gsap)$")
    fps: int = Field(default=30, ge=1, le=60)
    duration: float = Field(..., gt=0)
    quality: str = Field(default="high", regex="^(low|medium|high)$")


class GeometryOperationRequest(BaseModel):
    """[V0.A1] Schema for procedural geometry operations."""
    operation_type: str  # "voronoi", "stripe", "polygon_slice", etc.
    parameters: Dict[str, Any]
    svg_input: Optional[str] = None
    image_input: Optional[str] = None  # base64 or URL


class AIPromptRequest(BaseModel):
    """[V0.A1] Schema for AI design generation requests."""
    prompt: str
    style_references: Optional[List[str]] = None  # URLs or base64
    design_type: str = Field(..., regex="^(logo|poster|ui|animation|3d|layout)$")
    parameters: Dict[str, Any] = {}


class AIPromptResponse(BaseModel):
    """[V0.A1] AI generation response."""
    design_id: str
    status: str  # "processing", "complete", "error"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
