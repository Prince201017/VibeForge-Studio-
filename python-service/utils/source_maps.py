# [CSS.A10] source_maps.py
"""
Minimal Source Map v3 generator. Maps each line of generated CSS back to the
corresponding line in a synthetic "source" (the pretty-printed AnimationConfig
JSON), so devtools can show which track/keyframe produced which CSS line.
Implements VLQ/base64 encoding from scratch (no external sourcemap lib).
"""
from __future__ import annotations
import json

_B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"


def _to_vlq(value: int) -> str:
    value = (value << 1) if value >= 0 else ((-value) << 1) | 1
    out = ""
    while True:
        digit = value & 0b11111
        value >>= 5
        if value > 0:
            digit |= 0b100000
        out += _B64_CHARS[digit]
        if value == 0:
            break
    return out


def generate_source_map(css: str, name: str, config: dict) -> dict:
    """
    Returns a Source Map v3 dict (already JSON-serializable). Each generated
    CSS line maps 1:1 to the same line number of the pretty-printed config
    (clamped to the config's line count), with column 0.
    """
    source_content = json.dumps(config, indent=2)
    source_lines = source_content.count("\n") + 1
    css_lines = css.count("\n") + 1

    segments_per_line = []
    prev_source_line = 0
    for gen_line in range(css_lines):
        src_line = min(gen_line, source_lines - 1)
        delta_source_line = src_line - prev_source_line
        # fields: [genCol, sourceIndex, sourceLine, sourceCol]
        segment = _to_vlq(0) + _to_vlq(0) + _to_vlq(delta_source_line) + _to_vlq(0)
        segments_per_line.append(segment)
        prev_source_line = src_line

    return {
        "version": 3,
        "file": f"{name}.css",
        "sources": [f"{name}.config.json"],
        "sourcesContent": [source_content],
        "names": [],
        "mappings": ";".join(segments_per_line),
    }


def append_source_map_comment(css: str, map_filename: str) -> str:
    return f"{css}\n/*# sourceMappingURL={map_filename} */\n"
