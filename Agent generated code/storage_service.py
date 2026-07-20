"""[Claude.A8] Asset Manager - Storage Service.

Wraps Vercel Blob storage for original files, previews, and version
snapshots. Also handles content-hash based deduplication.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from typing import BinaryIO, Optional

import httpx

BLOB_API_BASE = "https://blob.vercel-storage.com"
BLOB_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN", "")


@dataclass
class BlobUploadResult:
    url: str
    pathname: str
    content_type: str
    size_bytes: int
    content_hash: str


class StorageService:
    """Thin async client around Vercel Blob's PUT-based upload API."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or BLOB_TOKEN
        if not self.token:
            raise RuntimeError("BLOB_READ_WRITE_TOKEN is not configured")
        self._client = httpx.AsyncClient(timeout=60.0)

    async def close(self) -> None:
        await self._client.aclose()

    @staticmethod
    def _hash_bytes(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    async def upload_file(
        self,
        project_id: str,
        asset_id: str,
        filename: str,
        data: bytes,
        content_type: str,
        access: str = "public",
    ) -> BlobUploadResult:
        """Uploads raw file bytes to Blob storage under a project/asset path."""
        pathname = f"projects/{project_id}/assets/{asset_id}/{filename}"
        content_hash = self._hash_bytes(data)

        response = await self._client.put(
            f"{BLOB_API_BASE}/{pathname}",
            content=data,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": content_type,
                "x-content-type": content_type,
                "x-add-random-suffix": "0",
            },
            params={"access": access},
        )
        response.raise_for_status()
        payload = response.json()

        return BlobUploadResult(
            url=payload["url"],
            pathname=pathname,
            content_type=content_type,
            size_bytes=len(data),
            content_hash=content_hash,
        )

    async def upload_preview(
        self, project_id: str, asset_id: str, size: int, data: bytes, content_type: str = "image/webp"
    ) -> str:
        pathname = f"projects/{project_id}/assets/{asset_id}/previews/{size}.webp"
        response = await self._client.put(
            f"{BLOB_API_BASE}/{pathname}",
            content=data,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": content_type,
                "x-add-random-suffix": "0",
            },
            params={"access": "public"},
        )
        response.raise_for_status()
        return response.json()["url"]

    async def delete(self, url: str) -> None:
        response = await self._client.delete(
            BLOB_API_BASE,
            headers={"Authorization": f"Bearer {self.token}"},
            params={"url": url},
        )
        response.raise_for_status()

    async def find_duplicate(self, content_hash: str, existing_hashes: dict[str, str]) -> Optional[str]:
        """Given a map of asset_id -> content_hash, returns a matching asset_id if any."""
        for asset_id, existing_hash in existing_hashes.items():
            if existing_hash == content_hash:
                return asset_id
        return None

    async def stream_download(self, url: str) -> BinaryIO:
        """Streams a remote file for import-from-url flows."""
        response = await self._client.get(url, follow_redirects=True)
        response.raise_for_status()
        import io

        return io.BytesIO(response.content)
