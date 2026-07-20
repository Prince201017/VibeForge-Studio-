"""[Claude.A8] Asset Manager - Core lifecycle service.

Orchestrates upload -> metadata extraction -> preview generation -> AI
tagging -> persistence, plus CRUD, versioning, folder ops, and audit logging.
This is the service the FastAPI routes call into; it owns no HTTP concerns.
"""

from __future__ import annotations

import mimetypes
from datetime import datetime, timezone
from typing import Optional

import asyncpg

from models.asset import (
    MAX_ASSETS_PER_PROJECT,
    Asset,
    AssetFolder,
    AssetType,
    AssetUpdatePatch,
    AssetUploadMetadata,
    infer_asset_type,
    new_asset_id,
)
from services.ai_tagger import AiTagger
from services.metadata_extractor import MetadataExtractor
from services.preview_generator import PreviewGenerator
from services.search_service import SearchService
from services.storage_service import StorageService


class AssetLimitExceededError(Exception):
    pass


class UnsupportedFileTypeError(Exception):
    pass


class AssetLockedError(Exception):
    pass


class AssetManagerService:
    def __init__(
        self,
        pool: asyncpg.Pool,
        storage: StorageService,
        metadata_extractor: MetadataExtractor,
        preview_generator: PreviewGenerator,
        search_service: SearchService,
        ai_tagger: AiTagger,
    ):
        self.pool = pool
        self.storage = storage
        self.metadata_extractor = metadata_extractor
        self.preview_generator = preview_generator
        self.search_service = search_service
        self.ai_tagger = ai_tagger

    async def upload_asset(
        self,
        project_id: str,
        user_id: str,
        filename: str,
        data: bytes,
        metadata: AssetUploadMetadata,
    ) -> Asset:
        asset_type = infer_asset_type(filename)
        if asset_type is None:
            raise UnsupportedFileTypeError(f"Unsupported file extension for '{filename}'")

        await self._enforce_project_limit(project_id)

        asset_id = new_asset_id()
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

        upload_result = await self.storage.upload_file(
            project_id, asset_id, filename, data, content_type
        )

        type_metadata = await self.metadata_extractor.extract(asset_type, data, filename)

        color_info = None
        if asset_type in (AssetType.IMAGE, AssetType.VIDEO, AssetType.SVG):
            color_info = await self.metadata_extractor.extract_color_palette(data)

        previews = await self.preview_generator.generate(asset_type, data, filename)
        preview_urls = await self.preview_generator.upload_all(project_id, asset_id, previews)
        preview_url = next((p["url"] for p in preview_urls if p["size"] == 400), preview_urls[0]["url"])

        auto_tags: list[str] = []
        if preview_urls:
            primary_preview_bytes = next((p.data for p in previews if p.size == 400), previews[0].data)
            auto_tags = await self.ai_tagger.suggest_tags(primary_preview_bytes, metadata.tags)

        now = datetime.now(timezone.utc)
        asset = Asset(
            id=asset_id,
            projectId=project_id,
            folderId=metadata.folder_id,
            name=filename,
            description=metadata.description,
            type=asset_type,
            fileUrl=upload_result.url,
            previewUrl=preview_url,
            previewSizes=preview_urls,
            sizeBytes=upload_result.size_bytes,
            mimeType=content_type,
            tags=metadata.tags,
            autoTags=auto_tags,
            collections=[],
            colorInfo=color_info,
            typeMetadata=type_metadata,
            usageCount=0,
            favorited=False,
            locked=False,
            versions=[],
            createdAt=now,
            updatedAt=now,
        )

        await self._insert_asset(asset, upload_result.content_hash)
        await self._log_audit(asset_id, user_id, "upload")
        return asset

    async def _enforce_project_limit(self, project_id: str) -> None:
        async with self.pool.acquire() as conn:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM assets WHERE project_id = $1", project_id
            )
        if count >= MAX_ASSETS_PER_PROJECT:
            raise AssetLimitExceededError(
                f"Project has reached the {MAX_ASSETS_PER_PROJECT}-asset limit"
            )

    async def _insert_asset(self, asset: Asset, content_hash: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO assets (
                    id, project_id, folder_id, name, description, type,
                    file_url, preview_url, preview_sizes, size_bytes, mime_type,
                    tags, auto_tags, collections, color_info, type_metadata,
                    usage_count, favorited, locked, versions, content_hash,
                    created_at, updated_at, search_vector
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                    $22, $23, to_tsvector('english', $4 || ' ' || array_to_string($12, ' '))
                )
                """,
                asset.id,
                asset.project_id,
                asset.folder_id,
                asset.name,
                asset.description,
                asset.type,
                asset.file_url,
                asset.preview_url,
                [p.model_dump() for p in asset.preview_sizes],
                asset.size_bytes,
                asset.mime_type,
                asset.tags,
                asset.auto_tags,
                asset.collections,
                asset.color_info.model_dump() if asset.color_info else None,
                asset.type_metadata,
                asset.usage_count,
                asset.favorited,
                asset.locked,
                [],
                content_hash,
                asset.created_at,
                asset.updated_at,
            )

    async def get_asset(self, asset_id: str) -> Optional[Asset]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM assets WHERE id = $1", asset_id)
        return Asset.model_validate(dict(row)) if row else None

    async def update_asset(self, asset_id: str, patch: AssetUpdatePatch, user_id: str) -> Asset:
        existing = await self.get_asset(asset_id)
        if existing is None:
            raise ValueError(f"Asset {asset_id} not found")
        if existing.locked and patch.locked is not True:
            raise AssetLockedError(f"Asset {asset_id} is locked")

        updates = patch.model_dump(exclude_unset=True, by_alias=False)
        if not updates:
            return existing

        set_clauses = []
        args: list = []
        for i, (key, value) in enumerate(updates.items(), start=2):
            set_clauses.append(f"{key} = ${i}")
            args.append(value)
        args.append(datetime.now(timezone.utc))
        set_clauses.append(f"updated_at = ${len(args) + 1}")

        async with self.pool.acquire() as conn:
            await conn.execute(
                f"UPDATE assets SET {', '.join(set_clauses)} WHERE id = $1",
                asset_id,
                *args,
            )

        if "name" in updates or "tags" in updates or "description" in updates:
            await self.search_service.reindex_asset(
                asset_id,
                updates.get("name", existing.name),
                updates.get("tags", existing.tags),
                updates.get("description", existing.description),
            )

        await self._log_audit(asset_id, user_id, "edit")
        return await self.get_asset(asset_id)

    async def delete_asset(self, asset_id: str, user_id: str) -> bool:
        existing = await self.get_asset(asset_id)
        if existing is None:
            return False
        if existing.locked:
            raise AssetLockedError(f"Asset {asset_id} is locked")

        await self.storage.delete(existing.file_url)
        for preview in existing.preview_sizes:
            await self.storage.delete(preview.url)

        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM assets WHERE id = $1", asset_id)

        await self._log_audit(asset_id, user_id, "delete")
        return True

    async def record_usage(self, asset_id: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE assets SET usage_count = usage_count + 1, last_used_at = $2 WHERE id = $1",
                asset_id,
                datetime.now(timezone.utc),
            )

    async def create_folder(self, project_id: str, name: str, parent_id: Optional[str]) -> AssetFolder:
        folder_id = f"folder_{new_asset_id().split('_', 1)[1]}"
        now = datetime.now(timezone.utc)
        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO asset_folders (id, project_id, parent_id, name, created_at) "
                "VALUES ($1, $2, $3, $4, $5)",
                folder_id,
                project_id,
                parent_id,
                name,
                now,
            )
        return AssetFolder(id=folder_id, projectId=project_id, parentId=parent_id, name=name, createdAt=now)

    async def move_assets(self, asset_ids: list[str], folder_id: Optional[str], user_id: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE assets SET folder_id = $1, updated_at = $2 WHERE id = ANY($3)",
                folder_id,
                datetime.now(timezone.utc),
                asset_ids,
            )
        for asset_id in asset_ids:
            await self._log_audit(asset_id, user_id, "edit")

    async def _log_audit(self, asset_id: str, user_id: str, action: str) -> None:
        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO asset_audit_log (asset_id, user_id, action, timestamp) "
                "VALUES ($1, $2, $3, $4)",
                asset_id,
                user_id,
                action,
                datetime.now(timezone.utc),
            )
