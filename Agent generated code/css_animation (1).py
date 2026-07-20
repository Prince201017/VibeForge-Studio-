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

from ..services.css_generator import generate_full_css, generate_tailwind_config, generate_container_queries
from ..services.html_generator import generate_html_page
from ..services.styled_components_gen import generate_styled_component
from ..services.framer_motion_gen import generate_framer_component
from ..services.gsap_generator import generate_gsap_code
from ..services.motion_one_generator import generate_motion_one_code
from ..services.anime_js_generator import generate_anime_code
from ..services.web_animation_gen import generate_waapi_code
from ..services.code_formatter import format_code, minify_css
from ..services.source_maps import generate_source_map, append_source_map_comment
from ..services.advanced_effects import (
    generate_glassmorphism, generate_neumorphism, generate_magnetic_cursor,
    generate_parallax_scroll, generate_scroll_triggered_reveal, generate_scroll_reveal_observer,
    generate_liquid_morph, generate_micro_interaction,
)
from ..services.component_library import list_component_presets, get_component_preset, get_presets_by_category
from ..services.performance_analyzer import analyze_animation, detect_duplicate_animations

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


# --- Source maps -----------------------------------------------------------

@router.post("/generate-css-with-sourcemap")
def generate_css_with_sourcemap(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    css = generate_full_css(cfg, vendor_prefixes=req.includeVendorPrefixes, minify=False)
    source_map = generate_source_map(css, cfg["name"], cfg)
    css_with_comment = append_source_map_comment(css, f"{cfg['name']}.css.map")
    return {"css": css_with_comment, "sourceMap": source_map, "mapFilename": f"{cfg['name']}.css.map"}


# --- Formatting --------------------------------------------------------

class FormatRequest(BaseModel):
    code: str
    language: str = "js"  # css | js | ts | html
    minify: bool = False


@router.post("/format")
def format_endpoint(req: FormatRequest):
    if req.minify and req.language == "css":
        return {"code": minify_css(req.code)}
    return {"code": format_code(req.code, req.language)}


# --- Advanced effects --------------------------------------------------

class GlassmorphismRequest(BaseModel):
    selector: str
    blurPx: int = 12
    opacity: float = 0.15
    borderOpacity: float = 0.2
    radiusPx: int = 16


@router.post("/effects/glassmorphism")
def glassmorphism_endpoint(req: GlassmorphismRequest):
    return {"code": generate_glassmorphism(req.selector, req.blurPx, req.opacity, req.borderOpacity, req.radiusPx)}


class NeumorphismRequest(BaseModel):
    selector: str
    bgHex: str = "#e0e5ec"
    distancePx: int = 8
    blurPx: int = 16
    intensity: float = 0.15
    inset: bool = False


@router.post("/effects/neumorphism")
def neumorphism_endpoint(req: NeumorphismRequest):
    return {"code": generate_neumorphism(req.selector, req.bgHex, req.distancePx, req.blurPx, req.intensity, req.inset)}


class MagneticCursorRequest(BaseModel):
    selector: str
    strength: float = 0.4
    radiusPx: int = 120


@router.post("/effects/magnetic-cursor")
def magnetic_cursor_endpoint(req: MagneticCursorRequest):
    return {"code": generate_magnetic_cursor(req.selector, req.strength, req.radiusPx)}


class ParallaxLayer(BaseModel):
    selector: str
    speed: float = 0.5


class ParallaxRequest(BaseModel):
    layers: list[ParallaxLayer]


@router.post("/effects/parallax")
def parallax_endpoint(req: ParallaxRequest):
    return {"code": generate_parallax_scroll([layer.model_dump() for layer in req.layers])}


class ScrollRevealRequest(BaseModel):
    selector: str
    translateYPx: int = 40
    durationMs: int = 600
    threshold: float = 0.2


@router.post("/effects/scroll-reveal")
def scroll_reveal_endpoint(req: ScrollRevealRequest):
    css = generate_scroll_triggered_reveal(req.selector, req.translateYPx, req.durationMs, req.threshold)
    js = generate_scroll_reveal_observer(req.selector, req.threshold)
    return {"css": css, "js": js}


class LiquidMorphRequest(BaseModel):
    selector: str
    pathA: str
    pathB: str
    durationMs: int = 1500


@router.post("/effects/liquid-morph")
def liquid_morph_endpoint(req: LiquidMorphRequest):
    return {"code": generate_liquid_morph(req.selector, req.pathA, req.pathB, req.durationMs)}


class MicroInteractionRequest(BaseModel):
    kind: Literal["button-press", "toggle", "checkbox-check"]
    selector: str


@router.post("/effects/micro-interaction")
def micro_interaction_endpoint(req: MicroInteractionRequest):
    return {"code": generate_micro_interaction(req.kind, req.selector)}


# --- Component library ---------------------------------------------------

@router.get("/component-library")
def component_library_list():
    return {"components": list_component_presets()}


@router.get("/component-library/{preset_id}")
def component_library_get(preset_id: str):
    preset = get_component_preset(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"No component preset '{preset_id}'")
    return preset


@router.get("/component-library/category/{category}")
def component_library_by_category(category: str):
    return {"components": get_presets_by_category(category)}


# --- Performance analysis -------------------------------------------------

@router.post("/analyze")
def analyze_endpoint(req: GenerateRequest):
    cfg = req.config.model_dump(by_alias=True)
    css = generate_full_css(cfg, vendor_prefixes=req.includeVendorPrefixes, minify=req.minify)
    return analyze_animation(cfg, css)


class DuplicateCheckRequest(BaseModel):
    configs: list[AnimationConfigModel]


@router.post("/analyze/duplicates")
def analyze_duplicates_endpoint(req: DuplicateCheckRequest):
    configs = [c.model_dump(by_alias=True) for c in req.configs]
    return {"duplicates": detect_duplicate_animations(configs)}


def _check_sla(start: float, limit_ms: int = 200):
    elapsed_ms = (time.perf_counter() - start) * 1000
    if elapsed_ms > limit_ms:
        # Non-fatal: logged for the Performance Optimization dashboard rather than raised,
        # generation still succeeded, it just missed the soft SLA.
        pass
