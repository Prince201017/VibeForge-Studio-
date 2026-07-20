# ForgeOS Export Pipeline — [V0.A7]

Implementation of `07_EXPORT_PIPELINE_NEEDS.md` (and the assignment context
in `INDEX.md`). This README is the honest completion record — read it
before assuming any given format or feature is production-ready as-is.

## Status against the spec

Every numbered subsystem in `07_EXPORT_PIPELINE_NEEDS.md` is implemented and
tested end-to-end (`backend/smoke_test.py` exercises all 22 renderable
formats against a real project; `backend/tests/test_export_pipeline.py` is
the pytest suite — 23 tests, all passing).

| § | Subsystem | Status | Notes |
|---|---|---|---|
| 1 | Export Engine Core | ✅ Done | asyncio job queue, per-user concurrency cap (5), retries, cancellation, history, temp-file sweep |
| 2 | Frontend Export UI | ✅ Done | `ExportDialog` + 7 subcomponents, typechecked (`tsc --noEmit` clean) |
| 3 | Video Export | ✅ Done | MP4/WebM/MOV/MKV/AVI via real ffmpeg subprocess + live progress parsing |
| 4 | Image Sequence Export | ✅ Done | PNG/APNG/WebP/TIFF fully working; AVIF/EXR work *if* optional native libs are installed (fail loud otherwise, don't fail silently) |
| 5 | CSS/HTML Code Gen | ✅ Done | Real Jinja2 templates driven by one shared animation model |
| 6 | Motion Library Code Export | ✅ Done | Framer Motion, GSAP, Motion One, Anime.js, Web Animation API, Three.js |
| 7 | SVG Animation Export | ✅ Done | SMIL / CSS-driven / JS-driven variants |
| 8 | Lottie Export | ✅ Done | Hand-built, schema-valid Lottie JSON (rect/ellipse layers) |
| 9 | Rive Export | ✅ Done — with a real constraint | `.riv` is a closed binary format; no library writes it from scratch. Ships a Lottie + state-machine bundle for manual import instead of faking a `.riv` file. See `services/rive_export.py`. |
| 10 | Asset Optimization | ✅ Done | PNG recompression, format size/quality comparison, dedup, bundle-size report |
| 11 | Advanced Rendering | ✅ Done | Motion blur (real temporal supersampling), bloom, tone mapping (Reinhard/ACES), film grain. Depth of field is a documented simplification — see the module docstring in `services/advanced_rendering.py` |
| 12 | Format Conversion | ✅ Done | `POST /api/export/convert/{job_id}` re-encodes a finished export without re-rendering |
| 13 | Metadata & Embedding | ✅ Done | Real ffmpeg metadata remux for video, EXIF/XMP for images, Lottie `meta` block, code header comments |
| 14 | Storage & Distribution | ✅ Done, needs credentials | Vercel Blob / S3 / Google Drive upload code is real and wired into the job flow; each raises a clear `StorageNotConfigured` until you set the relevant env var (see below) |
| 15 | Performance Monitoring | ✅ Done | Every job is wrapped in a benchmark (`ExportJob.benchmark`); SLA misses are logged automatically |
| 16 | Error Handling & Logging | ✅ Done | Retry w/ backoff, structured errors on the job object, timeout enforcement |
| 17 | Testing & Documentation | ✅ Done | pytest suite + this README + inline docstrings per module |

### Known, deliberate limitations (not bugs)

1. **Rive `.riv` binary export doesn't exist.** Nothing — not this
   implementation, not any open-source library — can write Rive's binary
   format outside Rive's own editor/SDK. The `rive` format ships a Lottie
   file + a state-machine JSON blueprint instead, with import instructions.
2. **Frame rendering is a CPU (Pillow) rasterizer, not the real Viewport
   Renderer.** `07_EXPORT_PIPELINE_NEEDS.md` exports frames; it doesn't
   render them — that's `05_CLAUDE_A5_VIEWPORT_RENDERER.md`'s job. This repo
   includes a working stand-in (`services/frame_renderer.py`) so the whole
   pipeline is runnable and testable on its own, but exported pixels won't
   match the WebGL viewport exactly until that hook is swapped in (see
   "Integrating into ForgeOS" below).
3. **Depth of field is a uniform-blur approximation**, not true per-layer
   defocus — there's no depth buffer available from `ProjectData` alone.
4. **AVIF and EXR** need optional native dependencies
   (`pillow-avif-plugin`, `OpenEXR`/`Imath`) that aren't installed by
   default; every other format works without them.
5. **Cloud storage upload** (`vercel_blob` / `s3` / `gdrive`) is real,
   working code, but needs credentials this handoff doesn't include (see
   Environment Variables below). It fails loudly and specifically rather
   than silently falling back to local disk.
6. **`../contracts/API_CONTRACT.md` and `../contracts/STATE_CONTRACT.md`**
   were referenced by `INDEX.md` as the locked source of truth for
   endpoint/state shapes but weren't included in this handoff. The 6
   endpoints implemented match the list in `07_EXPORT_PIPELINE_NEEDS.md`
   exactly; the `ProjectData`/`Layer`/`Keyframe` shapes in
   `models/schemas.py` are a reasonable reconstruction — reconcile them
   against the real contract files if they differ.

## Repository layout

```
export-pipeline/
├── backend/
│   ├── main.py                    FastAPI app entry point
│   ├── requirements.txt
│   ├── models/schemas.py          shared Pydantic schemas (ProjectData, ExportRequest, ExportJob, ...)
│   ├── routes/export.py           the 6 /api/export/* endpoints
│   ├── services/
│   │   ├── export_engine.py       job queue, concurrency, retries, cleanup
│   │   ├── frame_renderer.py      CPU rasterizer (stand-in for the viewport renderer)
│   │   ├── advanced_rendering.py  motion blur / bloom / tone mapping / film grain / DOF
│   │   ├── video_export.py        MP4/WebM/MOV/MKV/AVI via ffmpeg
│   │   ├── image_export.py        PNG/APNG/WebP/AVIF/EXR/TIFF sequences
│   │   ├── code_export.py         CSS/HTML/TSX/Framer Motion/GSAP/Motion One/Anime.js/WAAPI/Three.js/Tailwind/styled-components
│   │   ├── svg_export.py          SMIL / CSS / JS SVG animation
│   │   ├── lottie_export.py       Lottie JSON
│   │   ├── rive_export.py         Lottie+state-machine bundle (see limitation #1)
│   │   ├── sprite_export.py       sprite sheet PNG + JSON atlas
│   │   ├── metadata_export.py     XMP/EXIF/ffmpeg-metadata/Lottie-meta embedding
│   │   ├── format_conversion.py   convert an already-exported file to another format
│   │   ├── optimization.py        compression, format comparison, dedup
│   │   ├── performance_monitor.py wall-clock/memory/CPU benchmarking + SLA checks
│   │   ├── storage_export.py      Vercel Blob / S3 / Google Drive upload
│   │   └── format_registry.py     metadata for all 27 formats
│   ├── templates/*.jinja2         code-gen templates
│   ├── tests/test_export_pipeline.py
│   └── smoke_test.py              manual end-to-end run across every format
└── frontend/
    ├── components/export/
    │   ├── ExportDialog.tsx       main dialog — ties everything together
    │   ├── FormatSelector.tsx
    │   ├── QualitySettings.tsx
    │   ├── ProgressIndicator.tsx
    │   ├── ExportPreview.tsx
    │   ├── HistoryPanel.tsx
    │   ├── PresetExports.tsx
    │   └── ExportQueue.tsx
    ├── lib/export/{types,formats,hooks,utils}.ts
    ├── package.json
    └── tsconfig.json
```

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt   # ffmpeg must also be on PATH — see below
uvicorn main:app --reload --port 8001
```

**System dependency:** `ffmpeg` is required for every video format. It is
*not* pip-installable — `apt-get install ffmpeg` / `brew install ffmpeg` /
download from ffmpeg.org.

**Optional dependencies** (uncomment in `requirements.txt` as needed):
- `pillow-avif-plugin` — AVIF image sequence export
- `OpenEXR` + system `libopenexr-dev` — EXR image sequence export
- `boto3` — S3 storage uploads
- `numpy` + `scikit-image` — PSNR/SSIM quality metrics (advanced rendering's
  motion blur / bloom / tone mapping / film grain need `numpy` regardless —
  it's in the base requirements)

Run the test suite:
```bash
pip install pytest pytest-asyncio
pytest -q          # 23 tests
python smoke_test.py   # exercises all 22 formats against a sample project
```

### Frontend

```bash
cd frontend
npm install --save-dev typescript @types/react @types/react-dom @types/node
npm run typecheck   # tsc --noEmit — currently clean
```

This package assumes it's dropped into an existing Next.js/React/Tailwind
app (per `INDEX.md`'s architecture) rather than being its own app — there's
no `next.config.js` or Tailwind config here on purpose.

### Environment variables (storage uploads only; everything else works with none set)

| Variable | Used for |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | S3 uploads |
| `GDRIVE_OAUTH_TOKEN` | Google Drive uploads |

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
   needs to survive a server restart.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ffmpeg binary not found on PATH` | Install ffmpeg; it's a system dependency, not a Python package |
| AVIF/EXR export raises `RuntimeError` naming a missing package | Install the optional dependency listed in the error — these are intentionally not bundled by default |
| Storage upload raises `StorageNotConfigured` | Set the relevant environment variable from the table above, or leave `storage.destination: "local"` |
| Export sits at `queued` forever | More than 5 concurrent exports already running for that user — the 6th waits on the semaphore, per the spec's hard limit |
| Framer Motion / TSX output has mismatched braces | Should not happen — `tests/test_export_pipeline.py::TestCodeExport::test_framer_motion_has_balanced_jsx_braces` guards this specifically after a real bug of this exact shape was caught and fixed during development |
| Exported video looks different from the live editor preview | Expected until the frame renderer is swapped for the real Viewport Renderer — see "Integrating into ForgeOS" step 2 |
