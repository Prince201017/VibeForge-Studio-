"""[Claude.A8] Asset Manager - AI Tagger.

AI-powered smart tagging, visual similarity search, and asset
recommendations. Uses the Anthropic API for tag generation from previews and
a CLIP-style embedding for similarity search.
"""

from __future__ import annotations

import base64
import json
from typing import Optional

import anthropic
import numpy as np


class AiTagger:
    def __init__(self, client: Optional[anthropic.AsyncAnthropic] = None):
        self.client = client or anthropic.AsyncAnthropic()

    async def suggest_tags(self, preview_image_bytes: bytes, existing_tags: list[str]) -> list[str]:
        """Sends the 400px preview to Claude and asks for concise, relevant
        tags, excluding ones already applied."""
        b64 = base64.b64encode(preview_image_bytes).decode("utf-8")

        response = await self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=(
                "You tag design assets for a creative tool's asset library. "
                "Return ONLY a JSON array of 3-8 short lowercase tags "
                "(single words or short phrases, no hashtags). No preamble."
            ),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/webp", "data": b64},
                        },
                        {
                            "type": "text",
                            "text": f"Existing tags to avoid repeating: {', '.join(existing_tags) or 'none'}",
                        },
                    ],
                }
            ],
        )

        text = "".join(block.text for block in response.content if block.type == "text")
        try:
            tags = json.loads(text)
            if isinstance(tags, list):
                return [str(t).lower().strip() for t in tags if t][:8]
        except (json.JSONDecodeError, ValueError):
            pass
        return []

    async def embed_image(self, preview_image_bytes: bytes) -> list[float]:
        """Placeholder embedding hook — wire to a dedicated vision embedding
        model/service (e.g. a hosted CLIP endpoint) in production. Returns a
        deterministic pseudo-embedding here so downstream similarity code has
        a stable contract to build against during development."""
        import hashlib

        digest = hashlib.sha256(preview_image_bytes).digest()
        # Expand the 32-byte digest into a normalized 128-dim float vector.
        raw = np.frombuffer((digest * 4)[:128], dtype=np.uint8).astype(np.float32)
        norm = raw / (np.linalg.norm(raw) or 1.0)
        return norm.tolist()

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        va, vb = np.array(a), np.array(b)
        denom = (np.linalg.norm(va) * np.linalg.norm(vb)) or 1.0
        return float(np.dot(va, vb) / denom)

    async def find_similar(
        self, target_embedding: list[float], candidates: dict[str, list[float]], top_k: int = 12
    ) -> list[str]:
        """Returns candidate asset_ids ranked by cosine similarity."""
        scored = [
            (asset_id, self.cosine_similarity(target_embedding, emb))
            for asset_id, emb in candidates.items()
        ]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return [asset_id for asset_id, _ in scored[:top_k]]

    async def suggest_color_harmony(self, palette: list[str]) -> list[str]:
        """Given an extracted palette, asks Claude for complementary /
        harmonious colors to round out a design."""
        response = await self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=150,
            system=(
                "You are a color theory assistant. Given a hex color palette, "
                "return ONLY a JSON array of 3-5 complementary hex colors "
                "(format '#RRGGBB'). No preamble."
            ),
            messages=[{"role": "user", "content": f"Palette: {', '.join(palette)}"}],
        )
        text = "".join(block.text for block in response.content if block.type == "text")
        try:
            colors = json.loads(text)
            if isinstance(colors, list):
                return [c for c in colors if isinstance(c, str) and c.startswith("#")]
        except (json.JSONDecodeError, ValueError):
            pass
        return []
