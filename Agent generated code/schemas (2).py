"""
[V0.A7] Export Pipeline — Shared Schemas
=========================================
Every exporter (video, image sequence, CSS/JS code-gen, SVG, Lottie, sprite
sheet) consumes the SAME animation representation so that the 25+ output
formats stay in lockstep with whatever the Geometry Engine (Claude.A2) and
Animation System (Claude.A3) hand off through the Zustand store.

This file defines that shared contract plus every request/response model
used by the /api/export/* routes described in 07_EXPORT_PIPELINE_NEEDS.md.

NOTE ON INTEGRATION: `../contracts/API_CONTRACT.md` and `../contracts/
STATE_CONTRACT.md` are referenced by 01_ARCHITECTURE_REQUIREMENTS.md /
INDEX.md as the locked source of truth for the Zustand mutation shapes and
endpoint contracts, but neither file was provided alongside the two specs
I was given. The `ProjectData` / `Layer` / `Keyframe` shapes below are a
reasonable, self-consistent reconstruction based on what 07's format list
and the "Timeline, keyframes, graph editor, easing" description in
03_CLAUDE_A3_ANIMATION_SYSTEM.md imply. If the real STATE_CONTRACT.md
shapes differ, only `models/schemas.py` and the `*_from_project()` adapter
functions at the top of each service need to change — every exporter below
is written against this schema, not against the raw store shape.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared animation representation
# ---------------------------------------------------------------------------

class EasingType(str, Enum):
    LINEAR = "linear"
    EASE_IN = "easeIn"
    EASE_OUT = "easeOut"
    EASE_IN_OUT = "easeInOut"
    CUBIC_BEZIER = "cubicBezier"
    SPRING = "spring"
    STEPS = "steps"


class Easing(BaseModel):
    type: EasingType = EasingType.EASE_IN_OUT
    # used when type == cubicBezier: [x1, y1, x2, y2]
    bezier: Optional[tuple[float, float, float, float]] = None
    # used when type == spring
    stiffness: float = 100
    damping: float = 10
    mass: float = 1
    # used when type == steps
    steps: int = 1


class Keyframe(BaseModel):
    time_ms: float = Field(ge=0)
    properties: dict[str, float | str] = Field(default_factory=dict)
    easing: Easing = Field(default_factory=Easing)


class ShapeType(str, Enum):
    RECT = "rect"
    ELLIPSE = "ellipse"
    PATH = "path"
    TEXT = "text"
    GROUP = "group"
    IMAGE = "image"


class Layer(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex[:8])
    name: str
    shape: ShapeType
    # static SVG path data / rect attrs / etc, keyed loosely so the
    # geometry engine's native shape dict can be dropped in unmodified
    geometry: dict[str, Any] = Field(default_factory=dict)
    fill: Optional[str] = None
    stroke: Optional[str] = None
    stroke_width: float = 0
    opacity: float = 1
    keyframes: list[Keyframe] = Field(default_factory=list)
    children: list["Layer"] = Field(default_factory=list)
    parent_id: Optional[str] = None


Layer.model_rebuild()


class ProjectData(BaseModel):
    project_id: str
    name: str = "Untitled"
    width: int = 1920
    height: int = 1080
    duration_ms: float = 3000
    fps: int = 60
    background: Optional[str] = None
    layers: list[Layer] = Field(default_factory=list)

    @field_validator("fps")
    @classmethod
    def _fps_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("fps must be > 0")
        return v


# ---------------------------------------------------------------------------
# Export format registry
# ---------------------------------------------------------------------------

class ExportFormat(str, Enum):
    # video
    MP4 = "mp4"
    WEBM = "webm"
    MOV = "mov"
    MKV = "mkv"
    AVI = "avi"
    # image sequence
    PNG_SEQUENCE = "png_sequence"
    APNG = "apng"
    WEBP_SEQUENCE = "webp_sequence"
    AVIF_SEQUENCE = "avif_sequence"
    EXR_SEQUENCE = "exr_sequence"
    TIFF_SEQUENCE = "tiff_sequence"
    # code
    CSS = "css"
    HTML = "html"
    TSX = "tsx"
    FRAMER_MOTION = "framer_motion"
    GSAP = "gsap"
    MOTION_ONE = "motion_one"
    ANIME_JS = "anime_js"
    WEB_ANIMATION_API = "web_animation_api"
    THREE_JS = "three_js"
    TAILWIND = "tailwind"
    STYLED_COMPONENTS = "styled_components"
    # specialized
    SVG_SMIL = "svg_smil"
    SVG_CSS = "svg_css"
    SVG_JS = "svg_js"
    LOTTIE = "lottie"
    RIVE = "rive"
    SPRITE_SHEET_PNG = "sprite_sheet_png"
    SPRITE_SHEET_JSON = "sprite_sheet_json"


VIDEO_FORMATS = {ExportFormat.MP4, ExportFormat.WEBM, ExportFormat.MOV, ExportFormat.MKV, ExportFormat.AVI}
IMAGE_SEQ_FORMATS = {
    ExportFormat.PNG_SEQUENCE, ExportFormat.APNG, ExportFormat.WEBP_SEQUENCE,
    ExportFormat.AVIF_SEQUENCE, ExportFormat.EXR_SEQUENCE, ExportFormat.TIFF_SEQUENCE,
}
CODE_FORMATS = {
    ExportFormat.CSS, ExportFormat.HTML, ExportFormat.TSX, ExportFormat.FRAMER_MOTION,
    ExportFormat.GSAP, ExportFormat.MOTION_ONE, ExportFormat.ANIME_JS,
    ExportFormat.WEB_ANIMATION_API, ExportFormat.THREE_JS, ExportFormat.TAILWIND,
    ExportFormat.STYLED_COMPONENTS,
}
SPECIALIZED_FORMATS = {
    ExportFormat.SVG_SMIL, ExportFormat.SVG_CSS, ExportFormat.SVG_JS, ExportFormat.LOTTIE,
    ExportFormat.RIVE, ExportFormat.SPRITE_SHEET_PNG, ExportFormat.SPRITE_SHEET_JSON,
}


class FrameRange(BaseModel):
    mode: Literal["full", "range", "current_frame"] = "full"
    start_ms: Optional[float] = None
    end_ms: Optional[float] = None
    current_frame_ms: Optional[float] = None


class Caption(BaseModel):
    text: str
    start_ms: float
    end_ms: float


class VideoOptions(BaseModel):
    codec: Optional[str] = None  # auto-picked per format if omitted
    bitrate_kbps: Optional[int] = None
    hardware_accel: Optional[Literal["nvenc", "qsv", "none"]] = "none"
    color_space: Literal["srgb", "p3", "hdr10"] = "srgb"
    include_audio: bool = False
    audio_path: Optional[str] = None
    captions: list[Caption] = Field(default_factory=list)
    interpolate_to_fps: Optional[int] = None  # motion-compensated frame interpolation target


class ImageSeqOptions(BaseModel):
    bit_depth: Literal[8, 16, 32] = 8
    compression_level: int = Field(default=6, ge=0, le=9)
    name_padding: int = 4  # e.g. 0001
    multi_layer: bool = False  # EXR only: emit one OpenEXR part per layer (alpha matte) + a composite part


class CodeOptions(BaseModel):
    minify: bool = False
    typescript: bool = True
    css_scope: Literal["inline", "external", "modules", "styled_components", "emotion"] = "external"
    include_responsive: bool = True
    component_name: str = "AnimatedComponent"


class RenderOptions(BaseModel):
    """Advanced Rendering Options (§11 of the spec)."""
    antialiasing: Literal["off", "2x", "4x", "8x"] = "4x"
    motion_blur: bool = False
    depth_of_field: bool = False
    bloom: bool = False
    tone_mapping: Literal["none", "aces", "reinhard"] = "none"
    film_grain: float = 0.0


class SvgOptions(BaseModel):
    # When set, SVG_CSS/SVG_JS build a frame-based <symbol>/<use> sprite
    # animation (discrete states, CSS step()) instead of a continuous
    # keyframe tween — the vector equivalent of a PNG sprite sheet, useful
    # for frame-by-frame/hand-drawn-style animation. None = normal tween.
    sprite_frame_count: Optional[int] = None


class ExportMetadata(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    copyright: Optional[str] = None
    custom: dict[str, str] = Field(default_factory=dict)


class StorageTarget(BaseModel):
    destination: Literal["local", "vercel_blob", "s3", "gdrive"] = "local"
    public: bool = False
    folder: Optional[str] = None


class ExportRequest(BaseModel):
    project: ProjectData
    format: ExportFormat
    resolution: Optional[tuple[int, int]] = None  # defaults to project.width/height
    fps: Optional[int] = None  # defaults to project.fps
    frame_range: FrameRange = Field(default_factory=FrameRange)
    video: VideoOptions = Field(default_factory=VideoOptions)
    image_seq: ImageSeqOptions = Field(default_factory=ImageSeqOptions)
    code: CodeOptions = Field(default_factory=CodeOptions)
    render: RenderOptions = Field(default_factory=RenderOptions)
    svg: SvgOptions = Field(default_factory=SvgOptions)
    metadata: ExportMetadata = Field(default_factory=ExportMetadata)
    storage: StorageTarget = Field(default_factory=StorageTarget)


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExportJob(BaseModel):
    job_id: str = Field(default_factory=lambda: uuid4().hex)
    status: JobStatus = JobStatus.QUEUED
    format: ExportFormat
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    percent_complete: float = 0.0
    current_frame: int = 0
    total_frames: int = 0
    time_remaining_sec: Optional[float] = None
    output_path: Optional[str] = None
    output_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    error: Optional[str] = None
    retries: int = 0
    benchmark: Optional[dict[str, float]] = None
    storage_destination: Optional[str] = None
    storage_provider_ref: Optional[dict] = None
    storage_public: bool = False


class StartExportResponse(BaseModel):
    job_id: str
    estimated_time_sec: float


class ProgressResponse(BaseModel):
    job_id: str
    status: JobStatus
    percent_complete: float
    current_frame: int
    total_frames: int
    time_remaining_sec: Optional[float]
    error: Optional[str] = None


class CancelResponse(BaseModel):
    job_id: str
    status: JobStatus


class FormatInfo(BaseModel):
    format: ExportFormat
    category: Literal["video", "image_sequence", "code", "specialized"]
    label: str
    extension: str
    supports_alpha: bool = False
    supports_audio: bool = False
    notes: Optional[str] = None
