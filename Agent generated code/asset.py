"""[Claude.A8] Asset Manager - Pydantic models.

Mirrors lib/asset-manager/types.ts on the frontend. Keep field names and
shapes in sync with the TS types since the JSON contract is shared.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


class AssetType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    SVG = "svg"
    MODEL3D = "model3d"
    PDF = "pdf"
    AUDIO = "audio"
    PALETTE = "palette"
    GRADIENT = "gradient"
    PATTERN = "pattern"
    FONT = "font"
    BRUSH = "brush"
    PARTICLE_PRESET = "particle_preset"
    ANIMATION_CLIP = "animation_clip"
    PLUGIN = "plugin"


ASSET_TYPE_EXTENSIONS: dict[AssetType, list[str]] = {
    AssetType.IMAGE: ["png", "jpg", "jpeg", "avif", "webp", "gif"],
    AssetType.VIDEO: ["mp4", "webm", "mov", "mkv"],
    AssetType.SVG: ["svg"],
    AssetType.MODEL3D: ["gltf", "glb", "obj", "fbx", "usd", "usdz"],
    AssetType.PDF: ["pdf"],
    AssetType.AUDIO: ["mp3", "wav", "ogg"],
    AssetType.PALETTE: ["json", "json5"],
    AssetType.GRADIENT: ["json"],
    AssetType.PATTERN: ["svg"],
    AssetType.FONT: ["woff2", "ttf", "otf"],
    AssetType.BRUSH: ["json"],
    AssetType.PARTICLE_PRESET: ["json"],
    AssetType.ANIMATION_CLIP: ["json", "lottie", "rive"],
    AssetType.PLUGIN: ["zip"],
}

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024  # 2GB
MAX_ASSETS_PER_PROJECT = 100_000
PREVIEW_GENERATION_TIMEOUT_SECONDS = 10


def infer_asset_type(filename: str) -> Optional[AssetType]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else None
    if not ext:
        return None
    for asset_type, extensions in ASSET_TYPE_EXTENSIONS.items():
        if ext in extensions:
            return asset_type
    return None


class AssetDimensions(BaseModel):
    width: int
    height: int


class AssetColorInfo(BaseModel):
    dominant_color: str = Field(alias="dominantColor")
    palette: list[str]

    class Config:
        populate_by_name = True


class AssetLicense(BaseModel):
    type: str
    attribution: Optional[str] = None
    usage_rights: Optional[str] = Field(default=None, alias="usageRights")

    class Config:
        populate_by_name = True


class AssetVersion(BaseModel):
    version_id: str = Field(alias="versionId")
    created_at: datetime = Field(alias="createdAt")
    created_by: str = Field(alias="createdBy")
    note: Optional[str] = None
    file_url: str = Field(alias="fileUrl")

    class Config:
        populate_by_name = True


class PreviewSize(BaseModel):
    size: Literal[200, 400, 1200]
    url: str


class Asset(BaseModel):
    id: str
    project_id: str = Field(alias="projectId")
    folder_id: Optional[str] = Field(default=None, alias="folderId")
    name: str
    description: Optional[str] = None
    type: AssetType
    file_url: str = Field(alias="fileUrl")
    preview_url: str = Field(alias="previewUrl")
    preview_sizes: list[PreviewSize] = Field(default_factory=list, alias="previewSizes")
    size_bytes: int = Field(alias="sizeBytes")
    mime_type: str = Field(alias="mimeType")
    tags: list[str] = Field(default_factory=list)
    auto_tags: list[str] = Field(default_factory=list, alias="autoTags")
    collections: list[str] = Field(default_factory=list)
    color_info: Optional[AssetColorInfo] = Field(default=None, alias="colorInfo")
    type_metadata: dict[str, Any] = Field(default_factory=dict, alias="typeMetadata")
    license: Optional[AssetLicense] = None
    creator: Optional[str] = None
    usage_count: int = Field(default=0, alias="usageCount")
    favorited: bool = False
    locked: bool = False
    versions: list[AssetVersion] = Field(default_factory=list)
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    last_used_at: Optional[datetime] = Field(default=None, alias="lastUsedAt")

    class Config:
        populate_by_name = True
        use_enum_values = True

    @field_validator("size_bytes")
    @classmethod
    def validate_size(cls, v: int) -> int:
        if v > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Asset exceeds max size of {MAX_FILE_SIZE_BYTES} bytes")
        return v


class AssetFolder(BaseModel):
    id: str
    project_id: str = Field(alias="projectId")
    parent_id: Optional[str] = Field(default=None, alias="parentId")
    name: str
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class AssetUploadMetadata(BaseModel):
    tags: list[str] = Field(default_factory=list)
    description: Optional[str] = None
    folder_id: Optional[str] = Field(default=None, alias="folderId")

    class Config:
        populate_by_name = True


class AssetUpdatePatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    folder_id: Optional[str] = Field(default=None, alias="folderId")
    collections: Optional[list[str]] = None
    locked: Optional[bool] = None

    class Config:
        populate_by_name = True


class AssetSearchParams(BaseModel):
    types: Optional[list[AssetType]] = None
    tags: Optional[list[str]] = None
    folder_id: Optional[str] = Field(default=None, alias="folderId")
    color: Optional[str] = None
    min_width: Optional[int] = Field(default=None, alias="minWidth")
    max_width: Optional[int] = Field(default=None, alias="maxWidth")
    date_from: Optional[datetime] = Field(default=None, alias="dateFrom")
    date_to: Optional[datetime] = Field(default=None, alias="dateTo")
    favorited_only: bool = Field(default=False, alias="favoritedOnly")
    query: Optional[str] = None
    sort: Literal["date", "size", "name", "popularity"] = "date"
    direction: Literal["asc", "desc"] = "desc"
    page: int = 1
    page_size: int = Field(default=60, alias="pageSize", le=200)

    class Config:
        populate_by_name = True


class PaginatedAssets(BaseModel):
    assets: list[Asset]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
    has_more: bool = Field(alias="hasMore")

    class Config:
        populate_by_name = True


def new_asset_id() -> str:
    return f"asset_{uuid.uuid4().hex[:16]}"
