# [Claude.A8] In-memory inverted-index search for asset filename/tags, targeting the
# <100ms @ 10K items SLA without needing a separate search service (Postgres full-text
# or Elasticsearch would replace this at real scale — documented, not built, since no
# DB schema was provided).
from __future__ import annotations
import re
import time
from collections import defaultdict
from typing import Iterable

from .models import Asset, AssetSearchQuery


def _tokenize(text: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9]+", text.lower()) if t]


class AssetSearchIndex:
    def __init__(self) -> None:
        self._token_to_asset_ids: dict[str, set[str]] = defaultdict(set)
        self._tag_to_asset_ids: dict[str, set[str]] = defaultdict(set)
        self._assets: dict[str, Asset] = {}

    def add(self, asset: Asset) -> None:
        self._assets[asset.id] = asset
        for token in _tokenize(asset.filename):
            self._token_to_asset_ids[token].add(asset.id)
        for tag in asset.tags:
            self._tag_to_asset_ids[tag.lower()].add(asset.id)

    def remove(self, asset_id: str) -> None:
        asset = self._assets.pop(asset_id, None)
        if not asset:
            return
        for token in _tokenize(asset.filename):
            self._token_to_asset_ids[token].discard(asset_id)
        for tag in asset.tags:
            self._tag_to_asset_ids[tag.lower()].discard(asset_id)

    def search(self, q: AssetSearchQuery) -> tuple[list[Asset], float]:
        t0 = time.perf_counter()
        candidate_ids: set[str] | None = None

        if q.query:
            tokens = _tokenize(q.query)
            for tok in tokens:
                matches = self._token_to_asset_ids.get(tok, set())
                candidate_ids = matches if candidate_ids is None else candidate_ids & matches

        if q.tags:
            for tag in q.tags:
                matches = self._tag_to_asset_ids.get(tag.lower(), set())
                candidate_ids = matches if candidate_ids is None else candidate_ids & matches

        if candidate_ids is None:
            candidate_ids = set(self._assets.keys())

        results = [
            a for aid in candidate_ids
            if (a := self._assets.get(aid)) is not None
            and a.project_id == q.project_id
            and (q.mime_prefix is None or a.mime_type.startswith(q.mime_prefix))
        ]
        results.sort(key=lambda a: a.created_at, reverse=True)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return results[q.offset: q.offset + q.limit], elapsed_ms
