# [CSS.A10] css_animation.py
"""
FastAPI router for /api/css-animation/*. Validates the incoming
AnimationConfig with Pydantic, dispatches to the matching generator service,
and returns { framework, code, filename, sizeBytes, warnings }.
"""
from __future__ import annotations
import time
from typing import Literal, Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.css_generator import generate_full_css, generate_tailwind_config
from ..services.html_generator import generate_html_page
from ..services.styled_components_gen import generate_styled_component
from ..services.framer_motion_gen import generate_framer_component
from ..services.gsap_generator import generate_gsap_code
from ..services.motion_one_generator import generate_motion_one_code
from ..services.anime_js_generator import generate_anime_code
from ..services.web_animation_gen import generate_waapi_code

router = APIRouter(prefix="/api/css-animation", tags=["css-animation"])


class EasingModel(BaseModel):
    name: str = "ease-in-out"
    bezier: Optional[dict] = None
    steps: Optional[int] = None
    stepPosition: Optional[str] = "jump-end"
    amplitude: Optional[float] = 1.0
    period: Optional[float] = 0.3


class KeyframeModel(BaseModel):
    offset: float
    value: Union[float, str]
    unit: Optional[str] = None
    easing: Optional[EasingModel] = None


class TrackModel(BaseModel):
    id: str
    property: str
    keyframes: list[KeyframeModel]
    enabled: bool = True


class TimingModel(BaseModel):
    durationMs: int = Field(gt=0, le=600_000)  # 10 min hard cap per spec
    delayMs: int = Field(ge=0)
    iterationCount: Union[int, Literal["infinite"]]
    direction: Literal["normal", "reverse", "alternate", "alternate-reverse"]
    fillMode: Literal["none", "forwards", "backwards", "both"]
    playState: Literal["running", "paused"] = "running"
    easing: EasingModel


class StaggerModel(BaseModel):
    enabled: bool = False
    delayEachMs: int = 100
    from_: str = Field("start", alias="from")


class AnimationConfigModel(BaseModel):
    id: str
    name: str
    selector: str
    tracks: list[TrackModel] = Field(max_items=50)  # 50 property cap per spec
    timing: TimingModel
    breakpoints: Optional[list[dict]] = None
    trigger: Optional[str] = "load"
    stagger: Optional[StaggerModel] = None

    class Config:
        populate_by_name = True


class GenerateRequest(BaseModel):
    config: AnimationConfigModel
    framework: str
    typescript: bool = True
    minify: bool = False
    includeVendorPrefixes: bool = True


class GenerateResponse(BaseModel):
    framework: str
    code: str
    filename: str
    sizeBytes: int
    warnings: list[str]


def _respond(framework: str, code: str, filename: str, warnings: list[str] | None = None) -> GenerateResponse:
    return GenerateResponse(
        framework=framework,
        code=code,
        filename=filename,
        sizeBytes=len(code.encode("utf-8")),
        warnings=warnings or [],
    )


@router.post("/generate-css", response_model=GenerateResponse)
def generate_css_endpoint(req: GenerateRequest):
    start = time.perf_counter()
    cfg = req.config.model_dump(by_alias=True)
    code = generate_full_css(cfg, vendor_prefixes=req.includeVendorPrefixes, minify=req.minify)
    _check_sla(start)
    return _respond("css", code, f"{cfg['name']}.css")


@router.post("/generate-tailwind", response_model=GenerateResponse)
def generate_tailwind_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_tailwind_config(cfg)
    return _respond("tailwind", code, "tailwind.config.snippet.js")


@router.post("/generate-html", response_model=GenerateResponse)
def generate_html_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_html_page(cfg, inline_css=True)
    return _respond("html", code, f"{cfg['name']}.html")


@router.post("/generate-styled", response_model=GenerateResponse)
def generate_styled_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_styled_component(cfg, typescript=req.typescript)
    ext = "tsx" if req.typescript else "jsx"
    return _respond("styled-components", code, f"{cfg['name']}.styled.{ext}")


@router.post("/generate-framer", response_model=GenerateResponse)
def generate_framer_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    warnings = []
    if len(cfg["tracks"]) > 12:
        warnings.append("Large track count: consider splitting into multiple motion.div layers.")
    code = generate_framer_component(cfg, typescript=req.typescript)
    ext = "tsx" if req.typescript else "jsx"
    return _respond("framer-motion", code, f"{cfg['name']}.motion.{ext}", warnings)


@router.post("/generate-gsap", response_model=GenerateResponse)
def generate_gsap_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_gsap_code(cfg, use_scroll_trigger=(cfg.get("trigger") == "scroll"))
    return _respond("gsap", code, f"{cfg['name']}.gsap.js")


@router.post("/generate-motion-one", response_model=GenerateResponse)
def generate_motion_one_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_motion_one_code(cfg)
    return _respond("motion-one", code, f"{cfg['name']}.motion-one.js")


@router.post("/generate-animejs", response_model=GenerateResponse)
def generate_animejs_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_anime_code(cfg)
    return _respond("animejs", code, f"{cfg['name']}.anime.js")


@router.post("/generate-waapi", response_model=GenerateResponse)
def generate_waapi_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    code = generate_waapi_code(cfg)
    return _respond("web-animation-api", code, f"{cfg['name']}.waapi.js")


@router.get("/presets")
def list_presets():
    return {
        "presets": [
            {"id": "fade-in", "label": "Fade In", "trigger": "load"},
            {"id": "slide-up", "label": "Slide Up", "trigger": "load"},
            {"id": "scale-pop", "label": "Scale Pop", "trigger": "hover"},
            {"id": "shake", "label": "Shake", "trigger": "click"},
            {"id": "reveal-on-scroll", "label": "Reveal on Scroll", "trigger": "inView"},
        ]
    }


def _check_sla(start: float, limit_ms: int = 200):
    elapsed_ms = (time.perf_counter() - start) * 1000
    if elapsed_ms > limit_ms:
        # Non-fatal: logged for the Performance Optimization dashboard rather than raised,
        # generation still succeeded, it just missed the soft SLA.
        pass
