# Asset Manager [Claude.A8]

Built from INDEX.md bullet only ("100K+ assets, preview, search, tagging, 2500-3000 LOC") —
real `08_ASSET_MANAGER_NEEDS.md` not provided.

## Included
- `models.py` — Asset/search/upload schemas
- `search_index.py` — in-memory inverted index (filename tokens + tags), targets the
  <100ms/10K-item SLA — logic-verified by hand since pydantic isn't installed in this
  sandbox (no network access to pip install)
- `thumbnail_service.py` — image thumbnails via Pillow, video-frame-extract ffmpeg command
- `router.py` — upload-init/confirm/search/delete endpoints

## Honest limitations
- Search index is in-process/in-memory; real 100K+ asset scale needs Postgres full-text
  search or a dedicated search service, not shown since no DB schema was provided.
- Upload flow assumes Vercel Blob signed URLs per the index's storage section but the
  actual Blob SDK call is stubbed (needs real project credentials to test).
