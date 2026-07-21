# ForgeOS Export Pipeline — [V0.A7]

Implementation of `07_EXPORT_PIPELINE_NEEDS.md` (and the assignment context
in `INDEX.md`). Every numbered subsystem and every named sub-feature in the
spec is implemented with real, tested code — see "What's genuinely not
possible" below for the small number of items that are structurally
out of scope rather than unfinished.

**Verification:** 33/33 pytest tests pass. `smoke_test.py` exercises all
**29/29 registered export formats** end-to-end against a real sample
project (`python smoke_test.py`). Frontend type-checks clean (`tsc --noEmit`,
0 errors).

## Status against the spec

| § | Subsystem | Status |
|---|---|---|
| 1 | Export Engine Core | ✅ Complete |
| 2 | Frontend Export UI | ✅ Complete |
| 3 | Video Export Pipeline | ✅ Complete — incl. captions/subtitles (SRT/WebVTT), motion-compensated frame interpolation, real HDR10/P3/sRGB color-space tagging |
| 4 | Image Sequence Export | ✅ Complete — AVIF and EXR (incl. **multi-layer** EXR) verified working, not just gracefully degraded |
| 5 | CSS/HTML Code Gen | ✅ Complete — incl. real CSS tree-shaking (dead-rule + unused-keyframe removal) |
| 6 | Motion Library Code Export | ✅ Complete |
| 7 | SVG Animation Export | ✅ Complete — incl. path morphing, animated filter primitives, animated clip-paths, and a vector sprite-sheet mode (`<symbol>`/`<use>`) |
| 8 | Lottie Export | ✅ Complete |
| 9 | Rive Export | ✅ Complete, with one structural limitation (see below) |
| 10 | Asset Optimization | ✅ Complete — incl. real tree-shaking |
| 11 | Advanced Rendering Options | ✅ Complete — real motion blur (temporal supersampling), bloom, tone mapping, film grain; DOF is a documented approximation (see below) |
| 12 | Format Conversion | ✅ Complete |
| 13 | Metadata & Embedding | ✅ Complete |
| 14 | Storage & Distribution | ✅ Complete — incl. real S3 presigned shareable links with TTL, Drive time-boxed sharing (within Drive's actual API limits — see below), and batch-download-as-ZIP |
| 15 | Performance Monitoring | ✅ Complete |
| 16 | Error Handling & Logging | ✅ Complete |
| 17 | Testing & Documentation | ✅ Complete — 33 pytest tests, this README, inline docs |

### What's genuinely not possible (not unfinished — structural)

These aren't gaps in the implementation; they're real constraints of the
formats/APIs involved, documented in code rather than papered over:

1. **True `.riv` binary export doesn't exist anywhere.** No library — not
   this one, not any open-source project — writes Rive's binary format
   outside Rive's own editor/SDK. `rive_export.py` ships a Lottie file + a
   state-machine JSON blueprint with import instructions instead of faking
   a `.riv` file.
2. **Frame rendering uses a CPU (Pillow) rasterizer, not the real Viewport
   Renderer.** `07_EXPORT_PIPELINE_NEEDS.md` exports frames; rendering them
   is `05_CLAUDE_A5_VIEWPORT_RENDERER.md`'s job (WebGL), which wasn't part
   of this handoff. `services/frame_renderer.py` is a working, tested
   stand-in with one clean seam (`render_frame()`) to swap in the real
   renderer later — see "Integrating into ForgeOS" below.
3. **Depth of field is a uniform-blur approximation**, not true per-layer
   optical defocus — there's no depth buffer available from `ProjectData`
   alone without that same viewport-renderer hook.
4. **Google Drive can't produce a time-boxed "anyone with the link"
   share.** This is a real limit of the Drive API: `expirationTime` is only
   honored on `user`/`group`-type permissions, never on `anyone`-type ones.
   `generate_shareable_link()` grants a durable public link for `anyone`
   shares and raises a clear error (rather than silently ignoring the
   requested expiry) if you ask for both public *and* time-boxed at once.
5. **Vercel Blob has no presigned/expiring-URL primitive at all** — a
   `public: true` upload's URL is simply public until the file is deleted.
   "Expiration" for Blob uploads is handled by `ExportEngine`'s temp-file
   sweep, not a signed URL.
6. **`../contracts/API_CONTRACT.md` and `../contracts/STATE_CONTRACT.md`**
   were referenced by `INDEX.md` as the locked source of truth but weren't
   included in this handoff. The 6 endpoints (now 8, with `/convert` and
   `/download-batch` and `/share` added) match `07_EXPORT_PIPELINE_NEEDS.md`'s
   endpoint list; `models/schemas.py`'s `ProjectData`/`Layer`/`Keyframe`
   shapes are a reasonable reconstruction — reconcile against the real
   contract files if they differ.

None of the above block any of the 29 registered export formats from
working today — they're documented seams for when the surrounding ForgeOS
systems (Viewport Renderer, real cloud credentials) are wired in, not
missing functionality within this pipeline's own scope.

## Repository layout

```
export-pipeline/
├── backend/
│   ├── main.py                    FastAPI app entry point
│   ├── requirements.txt
│   ├── models/schemas.py          shared Pydantic schemas (ProjectData, ExportRequest, ExportJob, ...)
│   ├── routes/export.py           /api/export/* endpoints: start, progress, cancel, download,
│   │                               download-batch, convert, share, history, formats
│   ├── services/
│   │   ├── export_engine.py       job queue, concurrency, retries, cleanup, metadata/storage wiring
│   │   ├── frame_renderer.py      CPU rasterizer (stand-in for the viewport renderer)
│   │   ├── advanced_rendering.py  motion blur / bloom / tone mapping / film grain / DOF
│   │   ├── video_export.py        MP4/WebM/MOV/MKV/AVI via ffmpeg — captions, interpolation, color space
│   │   ├── image_export.py        PNG/APNG/WebP/AVIF/EXR(+multi-layer)/TIFF sequences
│   │   ├── code_export.py         CSS/HTML/TSX/Framer Motion/GSAP/Motion One/Anime.js/WAAPI/Three.js/Tailwind/styled-components
│   │   ├── svg_export.py          SMIL/CSS/JS SVG animation — path morphing, filters, clip-paths, sprite mode
│   │   ├── lottie_export.py       Lottie JSON
│   │   ├── rive_export.py         Lottie+state-machine bundle (see limitation #1)
│   │   ├── sprite_export.py       raster sprite sheet PNG + JSON atlas
│   │   ├── metadata_export.py     XMP/EXIF/ffmpeg-metadata/Lottie-meta embedding
│   │   ├── format_conversion.py   convert an already-exported file to another format
│   │   ├── optimization.py        compression, format comparison, dedup, real CSS tree-shaking
│   │   ├── performance_monitor.py wall-clock/memory/CPU benchmarking + SLA checks
│   │   ├── storage_export.py      Vercel Blob / S3 / Google Drive upload + shareable links
│   │   └── format_registry.py     metadata for all 29 registered formats
│   ├── templates/*.jinja2         code-gen templates
│   ├── tests/test_export_pipeline.py   33 tests
│   └── smoke_test.py              manual end-to-end run across all 29 formats
└── frontend/
    ├── components/export/
    │   ├── ExportDialog.tsx       main dialog — ties everything together
    │   ├── FormatSelector.tsx
    │   ├── QualitySettings.tsx
    │   ├── ProgressIndicator.tsx
    │   ├── ExportPreview.tsx
    │   ├── HistoryPanel.tsx
    │   ├── PresetExports.tsx
    │   └── ExportQueue.tsx        batch queue + "download all as ZIP"
    ├── lib/export/{types,formats,hooks,utils}.ts
    ├── package.json
    └── tsconfig.json
```

~5,200 LOC total (3,719 backend Python + 129 template lines + 1,352
frontend TS/TSX), against the spec's 5,000–6,000 LOC estimate.

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt   # ffmpeg must also be on PATH — see below
uvicorn main:app --reload --port 8001
```

**System dependencies:**
- `ffmpeg` — required for every video format and video metadata embedding. Not pip-installable: `apt-get install ffmpeg` / `brew install ffmpeg`.
- `libopenexr-dev` — required for the `OpenEXR` pip package (EXR export) to build/import: `apt-get install libopenexr-dev` before `pip install OpenEXR`.

Run the test suite:
```bash
pip install pytest pytest-asyncio
pytest -q                # 33 tests
python smoke_test.py     # exercises all 29 formats against a sample project
```

### Frontend

```bash
cd frontend
npm install --save-dev typescript @types/react @types/react-dom @types/node
npm run typecheck   # tsc --noEmit — clean
```

This package assumes it's dropped into an existing Next.js/React/Tailwind
app (per `INDEX.md`'s architecture) rather than being its own app — there's
no `next.config.js` or Tailwind config here on purpose.

### Environment variables (storage uploads only; everything else works with none set)

| Variable | Used for |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | S3 uploads + presigned shareable links |
| `GDRIVE_OAUTH_TOKEN` | Google Drive uploads + sharing permissions |

## Integrating into ForgeOS

1. **Mount the router.** In the main ForgeOS FastAPI app:
   ```python
   from export_pipeline.backend.main import app as export_app
   main_app.mount("/export-service", export_app)
   # or: main_app.include_router(export_router) directly, dropping the CORS/lifespan wrapper
   ```
2. **Swap the frame renderer.** Replace `services/frame_renderer.py`'s
   `render_frame()` with a call into the real Viewport Renderer (headless
   capture of the same WebGL canvas, or a shared rasterizer) so exported
   pixels match on-screen pixels exactly. Every exporter calls
   `render_frame_with_effects()` (in `advanced_rendering.py`), which itself
   calls `render_frame()` — one seam, not seventeen.
3. **Reconcile `ProjectData`** in `models/schemas.py` against the real
   `STATE_CONTRACT.md` Zustand shape once you have it; adjust the
   `*_from_project()` adapter at the top of each exporter if field names
   differ.
4. **Wire real auth.** `routes/export.py::get_current_user_id` is a narrow
   seam for Clerk (see `12_SECURITY_AUTH_NEEDS.md`) — currently reads an
   `x-user-id` header for local dev.
5. **Swap the in-memory job store** (`ExportEngine._jobs` / `_history`) for
   the real Postgres tables in `11_DATABASE_SCHEMA_NEEDS.md` if job history
   needs to survive a server restart. `ExportJob` already carries
   `storage_destination` / `storage_provider_ref` / `storage_public` so the
   `/share` endpoint keeps working once persisted.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ffmpeg binary not found on PATH` | Install ffmpeg; it's a system dependency, not a Python package |
| `EXR export requires the OpenEXR + Imath native libraries` | Run `apt-get install libopenexr-dev` *before* `pip install OpenEXR` — the Python package needs the system library present at install time |
| Storage upload raises `StorageNotConfigured` | Set the relevant environment variable from the table above, or leave `storage.destination: "local"` |
| `/api/export/share/{job_id}` returns 422 with a Drive/expirationTime message | You asked for a private (non-public) time-boxed Drive link — Drive's API doesn't support that combination; either make it public or share with a specific collaborator email outside this endpoint |
| Export sits at `queued` forever | More than 5 concurrent exports already running for that user — the 6th waits on the semaphore, per the spec's hard limit |
| `avi does not support soft subtitles` warning | Expected — AVI's subtitle support is too inconsistent across players to ship reliably; captions are dropped with a logged warning rather than producing a file that silently doesn't show them |
| Framer Motion / TSX output has mismatched braces | Should not happen — `tests/test_export_pipeline.py::TestCodeExport::test_framer_motion_has_balanced_jsx_braces` guards this specifically after a real bug of this exact shape was caught and fixed during development |
| Exported video looks different from the live editor preview | Expected until the frame renderer is swapped for the real Viewport Renderer — see "Integrating into ForgeOS" step 2 |
