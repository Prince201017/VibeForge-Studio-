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


def tree_shake_css(css: str, used_html: str) -> str:
    """§10 'Tree-shaking unused styles' — a real, dependency-free purge: any
    top-level CSS rule (regular selector or @keyframes block) whose class
    name doesn't appear anywhere in `used_html` is dropped. This is the
    lightweight, no-Node-toolchain equivalent of PurgeCSS for this
    pipeline's own generated output (where class names are simple, known
    identifiers — not a general CSS/selector-combinator purger).

    Returns the CSS with unused rules removed; always keeps `@keyframes`
    blocks whose name is referenced by an `animation` / `animation-name`
    declaration inside a *kept* rule, even if that keyframes name itself
    never appears as a class in the HTML (keyframes aren't classes)."""
    import re as _re

    # Split into top-level blocks (regular selector rules, and @keyframes
    # blocks which themselves contain nested { }). This is intentionally a
    # regex-based split rather than a full CSS parser — robust enough for
    # this pipeline's own generated (not hand-authored) CSS shape.
    blocks = _re.findall(r"(@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}|[^{}]+\{[^{}]*\})", css)

    kept_blocks: list[str] = []
    kept_animation_names: set[str] = set()

    # first pass: keep any non-keyframes rule whose selector class(es) are
    # referenced in the HTML; collect which animation-name values they use
    for block in blocks:
        if block.strip().startswith("@keyframes"):
            continue  # handled in second pass, once we know which names are kept
        selector = block.split("{", 1)[0]
        classes = _re.findall(r"\.([\w-]+)", selector)
        if not classes or any(f'"{c}"' in used_html or f"'{c}'" in used_html or f'class="{c}"' in used_html or c in used_html for c in classes):
            kept_blocks.append(block)
            for name in _re.findall(r"animation(?:-name)?\s*:\s*([\w-]+)", block):
                kept_animation_names.add(name)

    # second pass: keep @keyframes blocks referenced by a kept rule
    for block in blocks:
        if block.strip().startswith("@keyframes"):
            m = _re.match(r"@keyframes\s+([\w-]+)", block)
            if m and m.group(1) in kept_animation_names:
                kept_blocks.append(block)

    return "\n".join(kept_blocks)
