# Export Pipeline Needs

## Scope
Comprehensive export system supporting 25+ output formats including video (MP4, WebM, MOV), image sequences (PNG, APNG, EXR, AVIF), code generation (CSS, HTML, TSX, Tailwind, GSAP, Framer Motion, Motion One, Anime.js), SVG/Rive animations, and sprite sheets. Server-side processing with FFmpeg, Python image libraries, and code generation.

## Target
- 5000-6000 LOC total (split frontend 1500 + backend 3500)
- Export 60-second video in < 60 seconds
- Lossless quality for all formats
- Progress tracking and cancellation support
- Queue management for concurrent exports

## Core Systems Required

### 1. Export Engine Core (600 LOC)
- Export job queue management
- Progress tracking with real-time updates
- Cancellation support
- Export history and caching
- Retry logic for failed exports
- Resource cleanup
- Temporary file management
- Export format registry

### 2. Frontend Export UI (500 LOC)
- Export dialog with format selector
- Quality/codec selection
- Resolution/dimensions input
- Frame rate selection
- Frame range selection (full/range/current frame)
- Preview before export
- Progress indicator with time remaining
- Download/save to storage
- Export history and replay
- Preset export configurations
- Batch export queue

### 3. Video Export Pipeline (1200 LOC Backend)
- MP4 export (H.264 codec)
- WebM export (VP8/VP9 codec)
- MOV export (ProRes for high-quality)
- MKV export (lossless intermediate)
- Frame-by-frame rendering
- Audio track inclusion
- Subtitle/caption support
- Frame interpolation options
- Color space management (sRGB, P3, HDR)
- Bitrate optimization
- Hardware acceleration (NVIDIA/Intel)

### 4. Image Sequence Export (700 LOC Backend)
- PNG sequence export (lossless, 16-bit)
- APNG export (animated PNG)
- WebP sequence
- AVIF sequence (high-quality modern format)
- EXR sequence (linear color, alpha)
- OpenEXR multi-layer export
- Naming convention configuration
- Compression level control
- Color depth selection (8, 16, 32-bit)
- Frame padding (001, 0001, etc.)

### 5. CSS/HTML Code Generation (800 LOC Backend)
- CSS animation export (pure CSS with @keyframes)
- HTML export (complete page with styles)
- Inline CSS vs external stylesheet
- Tailwind CSS code generation
- CSS Modules export
- Styled Components export (JavaScript)
- Emotion export (JavaScript)
- CSS-in-JS export
- Media queries for responsive animation
- Print styles
- Accessibility attributes

### 6. Motion Library Code Export (800 LOC Backend)
- Framer Motion export (React component)
- GSAP animation export (JavaScript)
- Motion One export (Solid.js)
- Anime.js export (JavaScript)
- Web Animation API export (native JavaScript)
- Three.js animation export
- Canvas animation export
- Complete working React/Vue/Svelte components
- TypeScript types included
- Copy-paste ready code

### 7. SVG Animation Export (500 LOC Backend)
- SVG with SMIL animation
- SVG with CSS animation
- SVG with JavaScript animation
- SVG SMIL to CSS converter
- Path morphing animations (SVG.js)
- Animated SVG sprite sheets
- SVG filter animations
- Clipping path animations

### 8. Lottie Export (400 LOC Backend)
- Lottie JSON export
- Lottie animation verification
- Frame baking for Lottie compatibility
- Performance optimization for Lottie
- Lottie preview in browser
- Lottie import capability

### 9. Rive Export (400 LOC Backend)
- Rive file export (.riv format)
- Rive animation timeline mapping
- Rive state machine integration
- Rive bones/rigging support (if applicable)
- Rive preview in editor

### 10. Asset Optimization (600 LOC Backend)
- Image optimization (compression levels)
- Video codec selection based on target
- Audio track optimization
- Sprite sheet packing optimization
- Code minification (JavaScript/CSS)
- Tree-shaking unused styles
- Asset deduplication
- Bundle size analysis
- Format comparison (size vs quality)

### 11. Advanced Rendering Options (500 LOC Backend)
- Anti-aliasing quality levels
- Motion blur rendering
- DOF (depth of field) rendering
- Bloom/glow rendering
- Tone mapping for HDR
- Color grading before export
- Chromatic aberration
- Film grain
- Custom post-processing chains

### 12. Format Conversion (400 LOC Backend)
- Format auto-detection
- Format conversion (MP4 to WebM, PNG to AVIF)
- Codec transcoding
- Color space conversion
- Resolution upscaling/downscaling
- Frame rate conversion
- Aspect ratio conversion with padding/crop

### 13. Metadata & Embedding (300 LOC Backend)
- Embed XMP metadata
- EXIF data injection
- File creation date/time
- Creator/copyright information
- Project metadata embedding
- Render timestamp
- Software version embedding
- Custom metadata fields

### 14. Storage & Distribution (400 LOC Backend)
- Export to local download
- Export to Vercel Blob (cloud storage)
- Export to AWS S3
- Export to Google Drive
- Auto-organize by date/project
- Expiration policies
- CDN delivery
- Public/private sharing links
- Batch download as ZIP

### 15. Performance Monitoring (400 LOC Backend)
- Export time benchmarking
- Memory usage tracking
- GPU/CPU load monitoring
- Network bandwidth monitoring
- File size reporting
- Quality metrics (PSNR, SSIM)
- Render speed vs quality tradeoffs
- Hardware utilization

### 16. Error Handling & Logging (300 LOC Backend)
- Comprehensive error messages
- Export failure recovery
- Partial export resumption
- Detailed logging
- Error reporting to monitoring service
- User-friendly error notifications
- Debugging export issues

### 17. Testing & Documentation (500 LOC)
- Unit tests for format converters
- Integration tests for export pipeline
- Quality assurance tests (output file integrity)
- Performance benchmarks
- Documentation for each export format
- Examples of exported outputs
- Troubleshooting guide

## File Structure

### Frontend (1500 LOC)
```
components/export/
├── ExportDialog.tsx (main export UI)
├── FormatSelector.tsx (format choice)
├── QualitySettings.tsx (quality/codec options)
├── ProgressIndicator.tsx (progress + time remaining)
├── ExportPreview.tsx (preview before export)
├── HistoryPanel.tsx (past exports)
├── PresetExports.tsx (save/load export presets)
└── ExportQueue.tsx (batch queue manager)

lib/export/
├── types.ts (export format types)
├── formats.ts (export format registry)
├── hooks.ts (useExport, useExportProgress)
└── utils.ts (format validation, defaults)
```

### Backend (3500 LOC)
```
python-service/routes/
└── export.py (Flask/FastAPI routes)

python-service/services/
├── export_engine.py (job queue, coordination)
├── video_export.py (FFmpeg integration)
├── image_export.py (Pillow, ImageMagick)
├── code_export.py (CSS/HTML/JS generation)
├── lottie_export.py (Lottie JSON generation)
├── rive_export.py (Rive format handling)
├── optimization.py (compression, optimization)
├── storage_export.py (Blob, S3, Drive)
└── performance_monitor.py (benchmarking)

python-service/templates/
├── css_animation.jinja2
├── html_page.jinja2
├── framer_motion_component.jinja2
├── gsap_animation.jinja2
├── motion_one_component.jinja2
├── anime_js_animation.jinja2
└── web_animation_api.jinja2
```

## Export Formats Supported

### Video Formats
1. MP4 (H.264, AAC audio, widely compatible)
2. WebM (VP8/VP9, Vorbis/Opus audio, web optimized)
3. MOV (ProRes 422 HQ, lossless intermediate)
4. MKV (H.265, lossless master)
5. AVI (legacy support)

### Image Sequence Formats
6. PNG sequence (8, 16, 32-bit)
7. APNG (animated PNG, lossless)
8. WebP sequence (modern, smaller)
9. AVIF sequence (next-gen, high quality)
10. EXR sequence (OpenEXR, linear, alpha)
11. TIFF sequence (lossless, archival)

### Code/Animation Formats
12. CSS animation (@keyframes)
13. HTML page (complete + styles)
14. TSX/JSX (React component)
15. Framer Motion (React)
16. GSAP (JavaScript)
17. Motion One (Solid.js/JavaScript)
18. Anime.js (JavaScript)
19. Web Animation API (native JS)
20. Three.js (3D animation)

### Specialized Formats
21. SVG (with SMIL animation)
22. SVG + CSS animation
23. SVG + JavaScript animation
24. Lottie JSON (animation players)
25. Rive (.riv format, runtime animation)
26. Sprite Sheet (PNG + CSS)
27. Sprite Sheet (JSON metadata)

## Performance Targets (Hard SLAs)
- Export 10 sec video: < 15 seconds
- Export 60 sec video: < 60 seconds
- Image sequence (1000 frames): < 30 seconds
- Code export: < 500ms
- Lottie export: < 1 second
- Format conversion: < 5 seconds

## API Endpoints Required
```
POST /api/export/start
- Payload: format, quality, resolution, frameRange, projectData
- Response: jobId, estimatedTime

GET /api/export/progress/{jobId}
- Response: status, percentComplete, timeRemaining, currentFrame

POST /api/export/cancel/{jobId}
- Response: cancelStatus

GET /api/export/download/{jobId}
- Response: file download

GET /api/export/history
- Response: list of past exports

GET /api/export/formats
- Response: all supported formats with options
```

## Dependencies
- FFmpeg (video encoding)
- Pillow/ImageMagick (image processing)
- OpenCV (video frame extraction)
- Sharp (image optimization)
- Python jinja2 (template rendering)
- cssbeautifier (CSS formatting)
- python-lottie (Lottie generation)

## Quality Standards
- 70%+ test coverage
- All export outputs validated
- No data loss in conversion
- Metadata preservation
- Performance benchmarks
- Quality metrics (PSNR/SSIM for video)
- [AgentName] tags mandatory

## Constraints
- Max 2GB file output
- Export timeout: 5 minutes
- Concurrent exports: 5 max per user
- Storage quota: 100GB per project
- Format validation before processing
- Security: sandboxed export environment

## Integration Points
- `/api/export/*` endpoints in FastAPI
- Zustand store: export history, active jobs
- Blob storage for cloud exports
- Background tasks for video encoding
- Web Workers for preview generation
