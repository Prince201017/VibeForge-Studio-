# [Claude.A14] Style transfer: applies a reference project's visual style (colors,
# spacing, typography) to a target set of nodes. Statistical/rule-based extraction +
# application rather than a neural style-transfer model — a real neural approach would
# need a model artifact and training data the index doesn't specify.
from __future__ import annotations
from collections import Counter
from typing import Any


class StyleProfile:
    def __init__(self, dominant_colors: list[str], avg_corner_radius: float, font_families: list[str], spacing_scale: list[float]):
        self.dominant_colors = dominant_colors
        self.avg_corner_radius = avg_corner_radius
        self.font_families = font_families
        self.spacing_scale = spacing_scale

    def to_dict(self) -> dict:
        return {
            "dominant_colors": self.dominant_colors,
            "avg_corner_radius": self.avg_corner_radius,
            "font_families": self.font_families,
            "spacing_scale": self.spacing_scale,
        }


def extract_style_profile(nodes: list[dict[str, Any]]) -> StyleProfile:
    colors = Counter()
    radii = []
    fonts = Counter()
    positions = []

    for node in nodes:
        props = node.get("props", {})
        if fill := props.get("fill"):
            colors[fill] += 1
        if (r := props.get("cornerRadius")) is not None:
            radii.append(r)
        if font := props.get("fontFamily"):
            fonts[font] += 1
        if "x" in props:
            positions.append(props["x"])

    positions.sort()
    spacing_scale = [round(positions[i + 1] - positions[i], 1) for i in range(len(positions) - 1)] if len(positions) > 1 else [8, 16, 24, 32]

    return StyleProfile(
        dominant_colors=[c for c, _ in colors.most_common(5)] or ["#000000"],
        avg_corner_radius=(sum(radii) / len(radii)) if radii else 0,
        font_families=[f for f, _ in fonts.most_common(3)] or ["Inter"],
        spacing_scale=sorted(set(spacing_scale))[:5] or [8, 16, 24, 32],
    )


def apply_style_to_nodes(nodes: list[dict[str, Any]], profile: StyleProfile) -> list[dict[str, Any]]:
    """Non-destructive: returns new node list with style properties remapped onto
    the target nodes' existing structure (shape/position untouched)."""
    result = []
    for i, node in enumerate(nodes):
        new_node = {**node, "props": {**node.get("props", {})}}
        if "fill" in new_node["props"]:
            new_node["props"]["fill"] = profile.dominant_colors[i % len(profile.dominant_colors)]
        if "cornerRadius" in new_node["props"]:
            new_node["props"]["cornerRadius"] = profile.avg_corner_radius
        if "fontFamily" in new_node["props"]:
            new_node["props"]["fontFamily"] = profile.font_families[0]
        result.append(new_node)
    return result
