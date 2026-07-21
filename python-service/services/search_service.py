"""[Claude.A8] Asset Manager - Search Service.

Full-text + filtered search over the assets table. Uses PostgreSQL's
built-in trigram + tsvector search (per 11_DATABASE_SCHEMA_NEEDS.md) rather
than a separate search cluster, to hit the <100ms SLA at the 10K-asset scale
this system targets.
"""

from __future__ import annotations

from typing import Any, Optional

import asyncpg

from models.asset import Asset, AssetSearchParams


class SearchService:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def search(self, project_id: str, params: AssetSearchParams) -> tuple[list[Asset], int]:
        where_clauses = ["project_id = $1"]
        args: list[Any] = [project_id]

        if params.folder_id is not None:
            args.append(params.folder_id)
            where_clauses.append(f"folder_id = ${len(args)}")

        if params.types:
            args.append([t.value if hasattr(t, "value") else t for t in params.types])
            where_clauses.append(f"type = ANY(${len(args)})")

        if params.tags:
            args.append(params.tags)
            where_clauses.append(f"tags && ${len(args)}")  # array overlap

        if params.favorited_only:
            where_clauses.append("favorited = true")

        if params.date_from:
            args.append(params.date_from)
            where_clauses.append(f"created_at >= ${len(args)}")

        if params.date_to:
            args.append(params.date_to)
            where_clauses.append(f"created_at <= ${len(args)}")

        if params.query:
            args.append(params.query)
            where_clauses.append(
                f"(search_vector @@ plainto_tsquery('english', ${len(args)}) "
                f"OR name ILIKE '%' || ${len(args)} || '%')"
            )

        where_sql = " AND ".join(where_clauses)

        sort_column = {
            "date": "updated_at",
            "size": "size_bytes",
            "name": "name",
            "popularity": "usage_count",
        }[params.sort]
        direction_sql = "DESC" if params.direction == "desc" else "ASC"

        offset = (params.page - 1) * params.page_size

        count_query = f"SELECT COUNT(*) FROM assets WHERE {where_sql}"
        list_query = (
            f"SELECT * FROM assets WHERE {where_sql} "
            f"ORDER BY {sort_column} {direction_sql} "
            f"LIMIT ${len(args) + 1} OFFSET ${len(args) + 2}"
        )

        async with self.pool.acquire() as conn:
            total = await conn.fetchval(count_query, *args)
            rows = await conn.fetch(list_query, *args, params.page_size, offset)

        assets = [Asset.model_validate(dict(row)) for row in rows]
        return assets, total

    async def color_search(self, project_id: str, hex_color: str, tolerance: int = 60) -> list[Asset]:
        """Visual color search: computes Euclidean RGB distance against the
        stored dominant_color column using a generated column / index."""
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)

        query = """
            SELECT *,
                sqrt(
                    power(dominant_r - $2, 2) +
                    power(dominant_g - $3, 2) +
                    power(dominant_b - $4, 2)
                ) AS color_distance
            FROM assets
            WHERE project_id = $1
            HAVING sqrt(
                power(dominant_r - $2, 2) +
                power(dominant_g - $3, 2) +
                power(dominant_b - $4, 2)
            ) <= $5
            ORDER BY color_distance ASC
            LIMIT 100
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, project_id, r, g, b, tolerance)
        return [Asset.model_validate(dict(row)) for row in rows]

    async def reindex_asset(self, asset_id: str, name: str, tags: list[str], description: Optional[str]) -> None:
        """Refreshes the tsvector search column after metadata edits."""
        text = " ".join(filter(None, [name, " ".join(tags), description or ""]))
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE assets SET search_vector = to_tsvector('english', $2) WHERE id = $1",
                asset_id,
                text,
            )

    async def suggest_tags(self, project_id: str, prefix: str, limit: int = 10) -> list[str]:
        query = """
            SELECT DISTINCT tag FROM (
                SELECT unnest(tags) AS tag FROM assets WHERE project_id = $1
            ) t
            WHERE tag ILIKE $2 || '%'
            ORDER BY tag
            LIMIT $3
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, project_id, prefix, limit)
        return [row["tag"] for row in rows]
