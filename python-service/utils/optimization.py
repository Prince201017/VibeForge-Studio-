"""
[V0.A7] Asset Optimization (§10)
================================
Post-processing helpers applied after an ExportResult is produced:
image recompression, format size/quality comparison, and bundle-size
reporting. Code minification lives next to the code generator itself
(services/code_export.py::_minify) since it needs the pre-render AST-ish
context; this module handles binary assets.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass
class SizeReport:
    original_bytes: int
    optimized_bytes: int

    @property
    def saved_pct(self) -> float:
        if self.original_bytes == 0:
            return 0.0
        return round((1 - self.optimized_bytes / self.original_bytes) * 100, 1)


def optimize_png(path: Path, compression_level: int = 9) -> SizeReport:
    original = path.stat().st_size
    img = Image.open(path)
    img.save(path, format="PNG", optimize=True, compress_level=compression_level)
    return SizeReport(original, path.stat().st_size)


def compare_formats(image_path: Path) -> dict[str, int]:
    """Asset Optimization §10 'format comparison (size vs quality)' — encodes
    the same source frame as PNG/WEBP/JPEG and reports resulting sizes so the
    export dialog can show a size/quality tradeoff before the user commits."""
    img = Image.open(image_path).convert("RGBA")
    tmp_dir = image_path.parent / "._format_compare"
    tmp_dir.mkdir(exist_ok=True)
    sizes: dict[str, int] = {}
    for fmt, kwargs in (
        ("png", {"format": "PNG", "optimize": True}),
        ("webp", {"format": "WEBP", "quality": 90}),
        ("jpeg", {"format": "JPEG", "quality": 90}),
    ):
        p = tmp_dir / f"sample.{fmt}"
        (img.convert("RGB") if fmt == "jpeg" else img).save(p, **kwargs)
        sizes[fmt] = p.stat().st_size
        p.unlink()
    tmp_dir.rmdir()
    return sizes


def dedupe_assets(paths: list[Path]) -> dict[str, list[Path]]:
    """Asset deduplication: group files by content hash so identical rendered
    frames (e.g. a static background layer across many frames) can be
    referenced once instead of duplicated in the export bundle."""
    import hashlib
    groups: dict[str, list[Path]] = {}
    for p in paths:
        h = hashlib.sha1(p.read_bytes()).hexdigest()
        groups.setdefault(h, []).append(p)
    return {h: ps for h, ps in groups.items() if len(ps) > 1}


def bundle_size_report(paths: list[Path]) -> dict[str, int | float]:
    total = sum(p.stat().st_size for p in paths if p.exists())
    return {
        "file_count": len(paths),
        "total_bytes": total,
        "total_mb": round(total / (1024 * 1024), 2),
    }
