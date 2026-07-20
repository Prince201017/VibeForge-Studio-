# Export Pipeline [V0.A7]

Built from INDEX.md bullet only ("25+ formats, video/image/code, 5000-6000 LOC") —
real `07_EXPORT_PIPELINE_NEEDS.md` not provided.

## Included
- `exporters/base.py` — common `Exporter` interface, `ExportJob`/`ExportResult`
- `exporters/image_exporter.py` — PNG/JPG/WebP, dimension validation
- `exporters/video_exporter.py` — MP4/WebM via real ffmpeg subprocess call, enforces
  the 60s SLA via `asyncio.wait_for`, fails loudly if ffmpeg isn't installed
- `exporters/code_exporter.py` — React/HTML/SVG/JSON export from scene graph
- `pipeline.py` — format dispatch + timeout enforcement

## Honest limitations
- Image export produces a correctly-sized/formatted blank canvas — actual pixel
  rendering requires a headless-render service driving the real viewport-renderer (05),
  which needs infra (headless Chromium or server-side WebGL) not specified in the index.
- Only ~7 of the "25+ formats" are covered (png/jpg/webp, mp4/webm, react/html/svg/json).
  GIF, Lottie, PDF, AI, EPS etc. would follow the same `Exporter` interface but need
  format-specific libraries the real spec would have named.
