# [Claude.A8] Asset data model + Pydantic schemas.
from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class Asset(BaseModel):
    id: str
    project_id: str
    owner_id: str
    filename: str
    mime_type: str
    size_bytes: int
    storage_url: str            # Vercel Blob URL
    thumbnail_url: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    width: Optional[int] = None
    height: Optional[int] = None
    duration_seconds: Optional[float] = None  # for video/audio


class AssetSearchQuery(BaseModel):
    project_id: str
    query: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    mime_prefix: Optional[str] = None  # "image/", "video/", etc.
    limit: int = Field(default=50, le=200)
    offset: int = 0


class AssetUploadMeta(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    tags: list[str] = Field(default_factory=list)
