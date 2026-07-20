# Asset Manager — Claude.A8 Implementation

Implementation of `08_ASSET_MANAGER_NEEDS.md` per the assignment in
`INDEX.md` (System: Asset Manager, target 2500-3000 LOC, unassigned →
now built out as Claude.A8).

## What's here

### Frontend (`lib/asset-manager/`, `components/asset-manager/`)
- `types.ts` — full `Asset`, `AssetFolder`, filter/search/upload types, matching the 14 asset types in the spec.
- `store.ts` — Zustand store: assets, folders, selection, filters, sort, upload queue, and an undo/redo history stack for mutating actions (favorite, tag, move).
- `api.ts` — client for every endpoint in the spec's API Endpoints section (list, get, upload, batch-upload, update, delete, search, preview, import-from-url, plus folder CRUD).
- `hooks.ts` — `useAssets` (paginated fetch/refetch), `useAssetSearch` (debounced), `useUpload` (progress-tracked upload queue), `useActiveAsset`.
- `utils.ts` — formatting, fuzzy search, sorting, color-distance for "search by color."
- Components: `AssetManager`, `AssetGrid` (virtualized above 200 items), `AssetList`, `AssetCard`, `SearchBar`, `FilterSidebar`, `CollectionView` (folder tree), `DetailPanel`, `UploadArea`, `AssetPreview` (+ `Model3DViewer` for GLTF/GLB), `AssetContextMenu`.

### Backend (`python-service/`)
- `models/asset.py` — Pydantic models mirroring the TS types 1:1 for a shared JSON contract.
- `services/storage_service.py` — Vercel Blob upload/delete/dedup.
- `services/metadata_extractor.py` — per-type metadata extraction (image/svg/video/audio/palette/gradient/font).
- `services/preview_generator.py` — 200/400/1200px preview generation per type, 10s timeout enforced.
- `services/search_service.py` — Postgres tsvector + trigram search, tag array overlap, visual color search.
- `services/ai_tagger.py` — Claude-powered smart tagging + similarity/color-harmony helpers.
- `services/asset_manager.py` — orchestrates upload → extract → preview → tag → persist, plus CRUD/versioning/folders/audit log.
- `routes/assets.py` — FastAPI routes for every endpoint in the spec.

## Not included (needs coordination with other subsystems)
- `python-service/models/db_migrations` — schema lives in `11_DATABASE_SCHEMA_NEEDS.md`, owned by that system; `assets`, `asset_folders`, and `asset_audit_log` tables (plus `search_vector`, `dominant_r/g/b` generated columns) need to be added there.
- Auth/permission dependencies (`dependencies.py`: `get_current_user`, RBAC checks) come from `12_SECURITY_AUTH_NEEDS.md`.
- Drag-and-drop-to-canvas wiring (`onAssetDragToCanvas`) is a prop hook — the Viewport Renderer (Claude.A5) owns the drop target.
- Collaboration features (shared libraries, comments, permissions UI) from the spec's section 9 are intentionally out of scope here — that's `09_COLLABORATION_NEEDS.md`'s territory; this system exposes the audit log and folder ownership hooks it'll need.

## Integration checklist (per INDEX.md)
- [x] Zustand store for current library state
- [x] Drag-and-drop to canvas (event contract defined; consumer TBD)
- [x] Asset usage tracking (`usage_count`, `last_used_at`, audit log)
- [x] Undo/redo for asset operations (favorite, tag, folder move)
- [x] Search indexed via AI (auto-tags on upload)
- [x] Metadata extracted automatically
