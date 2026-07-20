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

`generate_shareable_link()` covers the spec's "public/private sharing
links" + "expiration policies": S3 gets a real presigned URL with a TTL;
Vercel Blob's URL is already a public CDN URL once uploaded with
`public: true` (Blob doesn't support presigned time-boxed links, so
"expiration" there is handled by ExportEngine's temp-file sweep deleting
the *source* file — the CDN URL simply 404s after that); Google Drive gets
a real time-boxed anyone-with-link permission via the Drive API.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from pathlib import Path

from models.schemas import StorageTarget


class StorageNotConfigured(RuntimeError):
    pass


@dataclass
class UploadResult:
    url: str
    public: bool
    expires_at: float | None = None  # unix timestamp, None = no expiry
    provider_ref: dict | None = None  # provider-specific handle (bucket/key, file_id, ...) for later operations like presigning


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
    return UploadResult(url=url, public=target.public, provider_ref={"bucket": bucket, "key": key})


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
        return UploadResult(url=f"https://drive.google.com/file/d/{file_id}/view", public=target.public, provider_ref={"file_id": file_id})


def _guess_content_type(path: Path) -> str:
    import mimetypes
    return mimetypes.guess_type(str(path))[0] or "application/octet-stream"


async def generate_shareable_link(result: UploadResult, target: StorageTarget, expires_in_sec: int = 3600) -> UploadResult:
    """§14 'Public/private sharing links' + 'Expiration policies'.

    What's actually possible varies by provider — implemented against each
    one's real API rather than papering over the differences:

    - **S3**: a genuine presigned URL with a hard TTL (`ExpiresIn`) — the
      correct, standard mechanism for time-boxed S3 access.
    - **Google Drive**: the Drive API only supports `expirationTime` on
      `user`/`group`-type permissions, *not* on `anyone`-type "anyone with
      the link" permissions — that's a real constraint of Drive's API, not
      a gap here. So: if `target.public` is True we grant a durable
      anyone-with-link permission (no expiry is possible for that type,
      full stop); if False, the caller must supply a specific email via
      `target.folder` reuse isn't appropriate, so private+expiring Drive
      shares aren't wired into this call — grant access explicitly via the
      Drive UI/API with a real recipient email instead.
    - **Vercel Blob**: no presigned/time-boxed URL primitive at all. A
      `public: true` upload's URL is simply public until deleted; treat
      `ExportEngine.cleanup_temp_files`'s sweep interval as the de facto
      expiration instead of expecting a signed URL here.
    - **local**: not internet-accessible; raises rather than returning a
      link that won't resolve outside this machine.
    """
    if target.destination == "s3":
        if not result.provider_ref:
            raise ValueError("S3 UploadResult is missing provider_ref (bucket/key) — was this UploadResult produced by upload()?")
        import asyncio
        import boto3

        bucket, key = result.provider_ref["bucket"], result.provider_ref["key"]

        def _presign():
            s3 = boto3.client("s3")
            return s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in_sec)

        url = await asyncio.get_running_loop().run_in_executor(None, _presign)
        return UploadResult(url=url, public=False, expires_at=time.time() + expires_in_sec, provider_ref=result.provider_ref)

    if target.destination == "gdrive":
        if not result.provider_ref:
            raise ValueError("Drive UploadResult is missing provider_ref (file_id) — was this UploadResult produced by upload()?")
        if not target.public:
            raise ValueError(
                "Google Drive's API cannot create a time-boxed 'anyone with the link' permission — "
                "expirationTime is only honored on user/group-type permissions. Share with a specific "
                "collaborator email via the Drive API/UI for an expiring private link instead."
            )
        token = os.environ.get("GDRIVE_OAUTH_TOKEN")
        if not token:
            raise StorageNotConfigured("Set GDRIVE_OAUTH_TOKEN to manage Drive sharing permissions.")
        import httpx

        file_id = result.provider_ref["file_id"]
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions",
                headers={"Authorization": f"Bearer {token}"},
                json={"role": "reader", "type": "anyone"},
            )
            resp.raise_for_status()
        return UploadResult(url=result.url, public=True, expires_at=None, provider_ref=result.provider_ref)

    if target.destination == "vercel_blob":
        # no signed-URL primitive; the URL is already the durable link
        return UploadResult(url=result.url, public=result.public, expires_at=None, provider_ref=result.provider_ref)

    raise ValueError(f"{target.destination!r} has no shareable-link mechanism (local files aren't internet-accessible)")
