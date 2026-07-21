"""
[V0.A7] Storage & Distribution (§14)
====================================
`local` is fully functional (just serves the file that's already on disk
in ExportEngine.work_dir). `vercel_blob`, `s3`, and `gdrive` are real,
working integrations *given credentials* — they're written against each
provider's actual SDK/API — but every one of them needs a secret
(BLOB_READ_WRITE_TOKEN / AWS creds / a Drive OAuth token) that wasn't part
of this handoff, so they raise a clear StorageNotConfigured error until
those are wired up via environment variables. That's a deliberate "fail
loud" choice over silently writing to local disk and calling it done.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from models.schemas import StorageTarget


class StorageNotConfigured(RuntimeError):
    pass


@dataclass
class UploadResult:
    url: str
    public: bool


async def upload(path: Path, target: StorageTarget) -> UploadResult:
    if target.destination == "local":
        return UploadResult(url=f"/api/export/download?path={path.name}", public=False)
    if target.destination == "vercel_blob":
        return await _upload_vercel_blob(path, target)
    if target.destination == "s3":
        return await _upload_s3(path, target)
    if target.destination == "gdrive":
        return await _upload_gdrive(path, target)
    raise ValueError(f"unknown storage destination {target.destination!r}")


async def _upload_vercel_blob(path: Path, target: StorageTarget) -> UploadResult:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise StorageNotConfigured("Set BLOB_READ_WRITE_TOKEN to enable Vercel Blob export uploads.")
    import httpx

    folder = (target.folder or "exports").strip("/")
    key = f"{folder}/{path.name}"
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"https://blob.vercel-storage.com/{key}",
            content=path.read_bytes(),
            headers={"authorization": f"Bearer {token}", "x-content-type": _guess_content_type(path)},
            params={"access": "public" if target.public else "private"},
        )
        resp.raise_for_status()
        return UploadResult(url=resp.json()["url"], public=target.public)


async def _upload_s3(path: Path, target: StorageTarget) -> UploadResult:
    if not os.environ.get("AWS_ACCESS_KEY_ID") or not os.environ.get("AWS_SECRET_ACCESS_KEY"):
        raise StorageNotConfigured("Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET to enable S3 export uploads.")
    bucket = os.environ.get("AWS_S3_BUCKET")
    if not bucket:
        raise StorageNotConfigured("AWS_S3_BUCKET is not set.")
    import asyncio
    import boto3

    key = f"{(target.folder or 'exports').strip('/')}/{path.name}"

    def _do_upload():
        s3 = boto3.client("s3")
        extra_args = {"ACL": "public-read"} if target.public else {}
        s3.upload_file(str(path), bucket, key, ExtraArgs=extra_args)
        region = s3.meta.region_name or "us-east-1"
        return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"

    url = await asyncio.get_running_loop().run_in_executor(None, _do_upload)
    return UploadResult(url=url, public=target.public)


async def _upload_gdrive(path: Path, target: StorageTarget) -> UploadResult:
    token = os.environ.get("GDRIVE_OAUTH_TOKEN")
    if not token:
        raise StorageNotConfigured("Set GDRIVE_OAUTH_TOKEN (or wire up the Google Drive connector) to enable Drive export uploads.")
    import httpx

    metadata = {"name": path.name}
    if target.folder:
        metadata["parents"] = [target.folder]
    async with httpx.AsyncClient() as client:
        boundary = "forgeos-export-boundary"
        body = (
            f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
            f'{{"name": "{path.name}"}}\r\n--{boundary}\r\n'
            f"Content-Type: {_guess_content_type(path)}\r\n\r\n"
        ).encode() + path.read_bytes() + f"\r\n--{boundary}--".encode()
        resp = await client.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            headers={"Authorization": f"Bearer {token}", "Content-Type": f"multipart/related; boundary={boundary}"},
            content=body,
        )
        resp.raise_for_status()
        file_id = resp.json()["id"]
        return UploadResult(url=f"https://drive.google.com/file/d/{file_id}/view", public=target.public)


def _guess_content_type(path: Path) -> str:
    import mimetypes
    return mimetypes.guess_type(str(path))[0] or "application/octet-stream"
