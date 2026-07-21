"""
[Claude.A14] Performance Optimization AI (spec section 11).

Analyzes a project's layer/effect graph for performance issues, suggests
concrete fixes, and predicts render time using a lightweight deterministic
cost model (no need for an LLM call on the hot path - this needs to be
fast and reproducible, not creative).
"""
from __future__ import annotations

import logging

logger = logging.getLogger("ai_engine.optimization_ai")

# Rough per-unit cost weights, tuned to be directionally useful rather than
# physically exact - real numbers should be calibrated against
# Claude.A5's actual renderer telemetry once available.
_COST_WEIGHTS = {
    "layer_base": 0.05,
    "blur_effect": 1.2,
    "shadow_effect": 0.4,
    "gradient_fill": 0.15,
    "glass_effect": 1.5,
    "particle_per_1k": 0.8,
    "animation_track": 0.1,
}


class OptimizationAI:
    async def analyze_project(self, project_snapshot: dict, optimization_type: str) -> dict:
        layers = project_snapshot.get("layers", [])
        issues: list[dict] = []
        predicted_ms = 0.0

        for layer in layers:
            layer_cost = _COST_WEIGHTS["layer_base"]
            effects = layer.get("effects", [])

            blur_effects = [e for e in effects if e.get("type") == "blur"]
            if len(blur_effects) > 1:
                issues.append({
                    "layerId": layer.get("id"),
                    "issue": "Multiple stacked blur effects",
                    "suggestion": "Combine into a single blur pass or bake into a texture",
                    "severity": "medium",
                })
            layer_cost += len(blur_effects) * _COST_WEIGHTS["blur_effect"]

            shadow_effects = [e for e in effects if e.get("type") == "shadow"]
            layer_cost += len(shadow_effects) * _COST_WEIGHTS["shadow_effect"]

            if layer.get("fill", {}).get("type") == "glass":
                layer_cost += _COST_WEIGHTS["glass_effect"]
                if layer.get("width", 0) * layer.get("height", 0) > 500_000:
                    issues.append({
                        "layerId": layer.get("id"),
                        "issue": "Large glass-morphism surface",
                        "suggestion": "Reduce blur radius or downsample the backdrop before blurring",
                        "severity": "high",
                    })

            particle_count = layer.get("particleCount", 0)
            if particle_count:
                layer_cost += (particle_count / 1000) * _COST_WEIGHTS["particle_per_1k"]
                if particle_count > 200_000:
                    issues.append({
                        "layerId": layer.get("id"),
                        "issue": f"{particle_count:,} particles on one layer",
                        "suggestion": "Use GPU instancing or reduce count below 200k for this tier",
                        "severity": "high",
                    })

            layer_cost += len(layer.get("animations", [])) * _COST_WEIGHTS["animation_track"]
            predicted_ms += layer_cost

            if layer.get("hidden") and layer.get("effects"):
                issues.append({
                    "layerId": layer.get("id"),
                    "issue": "Hidden layer still carries active effects",
                    "suggestion": "Strip effects from hidden/unused layers before export",
                    "severity": "low",
                })

        recommendations = self._prioritize(issues, optimization_type)

        return {
            "predictedRenderTimeMs": round(predicted_ms, 2),
            "estimatedFps": round(min(60, 1000 / max(predicted_ms, 1)), 1),
            "issues": issues,
            "recommendations": recommendations,
            "unnecessaryLayerIds": [
                layer.get("id") for layer in layers
                if layer.get("hidden") and not layer.get("effects") and not layer.get("children")
            ],
        }

    def _prioritize(self, issues: list[dict], optimization_type: str) -> list[str]:
        severity_rank = {"high": 0, "medium": 1, "low": 2}
        sorted_issues = sorted(issues, key=lambda i: severity_rank.get(i["severity"], 3))
        recs = [f"[{i['severity'].upper()}] {i['suggestion']}" for i in sorted_issues[:8]]
        if optimization_type == "file_size" and not any("format" in r.lower() for r in recs):
            recs.append("Consider converting raster assets to WebP/AVIF to reduce export size.")
        return recs
