# [CSS.A10] performance_analyzer.py
"""
Implements the "Performance Optimization" spec section: bundle-size
calculation, duplicate-animation detection across a project's configs, and
actionable optimization suggestions.
"""
from __future__ import annotations
import hashlib
import json

from .css_generator import PROPERTY_MAP

GPU_PROPERTIES = {"transform", "opacity"}


def calculate_css_size(css: str) -> dict:
    size_bytes = len(css.encode("utf-8"))
    return {
        "sizeBytes": size_bytes,
        "sizeKB": round(size_bytes / 1024, 2),
        "withinLimit": size_bytes <= 5 * 1024 * 1024,  # 5MB hard cap per spec
    }


def analyze_gpu_usage(tracks: list[dict]) -> dict:
    non_gpu = []
    for track in tracks:
        if not track.get("enabled", True):
            continue
        host = PROPERTY_MAP.get(track["property"], (track["property"],))[0]
        if host not in GPU_PROPERTIES:
            non_gpu.append(track["property"])
    return {
        "gpuOnly": len(non_gpu) == 0,
        "nonGpuProperties": non_gpu,
        "recommendation": (
            "All properties are GPU-accelerated (transform/opacity)."
            if not non_gpu
            else f"Properties {non_gpu} trigger layout/paint. Prefer transform/opacity equivalents where possible "
                 f"(e.g. width -> scaleX, top/left -> translate)."
        ),
    }


def recommend_will_change(tracks: list[dict]) -> str:
    props = set()
    for track in tracks:
        if not track.get("enabled", True):
            continue
        host = PROPERTY_MAP.get(track["property"], (track["property"],))[0]
        props.add(host)
    return ", ".join(sorted(props))


def _config_fingerprint(config: dict) -> str:
    """Hashes the semantic content of a config (tracks + timing), ignoring id/name,
    so two differently-named-but-identical animations are flagged as duplicates."""
    payload = {
        "tracks": [
            {
                "property": t["property"],
                "keyframes": [{"offset": k["offset"], "value": k["value"], "unit": k.get("unit")} for k in t["keyframes"]],
            }
            for t in config["tracks"] if t.get("enabled", True)
        ],
        "timing": {k: v for k, v in config["timing"].items() if k != "playState"},
    }
    blob = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def detect_duplicate_animations(configs: list[dict]) -> list[dict]:
    """Given a list of AnimationConfig dicts from a project, groups ones that are
    functionally identical (same tracks/timing) so the user can consolidate them."""
    groups: dict[str, list[str]] = {}
    for cfg in configs:
        fp = _config_fingerprint(cfg)
        groups.setdefault(fp, []).append(cfg["name"])

    duplicates = [{"names": names, "count": len(names)} for names in groups.values() if len(names) > 1]
    return duplicates


def analyze_animation(config: dict, css: str) -> dict:
    """Single entry point combining all performance checks for one animation."""
    size = calculate_css_size(css)
    gpu = analyze_gpu_usage(config["tracks"])
    warnings = []
    if not size["withinLimit"]:
        warnings.append("Generated CSS exceeds the 5MB size limit.")
    if not gpu["gpuOnly"]:
        warnings.append(gpu["recommendation"])
    if config["timing"]["durationMs"] > 600_000:
        warnings.append("Duration exceeds the 10-minute maximum.")
    if len(config["tracks"]) > 50:
        warnings.append("Track count exceeds the 50-property maximum.")

    return {
        "size": size,
        "gpu": gpu,
        "willChange": recommend_will_change(config["tracks"]),
        "warnings": warnings,
    }
