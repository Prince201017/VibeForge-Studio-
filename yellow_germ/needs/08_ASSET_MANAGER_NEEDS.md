# Asset Manager Needs

## Scope
Professional asset library management system supporting images, videos, SVGs, 3D models, gradients, patterns, fonts, color palettes, presets, brushes, and custom plugins. Browser-based with cloud storage, tagging, search, versioning, and collaborative sharing.

## Target
- 2500-3000 LOC (frontend 1500 + backend 1000)
- Support 100K+ assets per project
- Real-time preview generation
- Full-text search across metadata
- Tagging and categorization

## Core Systems Required

### 1. Asset Manager UI (600 LOC)
- Asset grid/list view toggle
- Thumbnail preview with metadata overlay
- Search bar with filters
- Tag-based filtering
- Category navigation (sidebar)
- Sort options (date, size, name, popularity)
- Multi-select for batch operations
- Drag-and-drop into canvas
- Asset details panel (properties, history, sharing)
- Upload UI (drag-and-drop, file picker)

### 2. Asset Types Support (500 LOC)
- Images (PNG, JPG, AVIF, WebP, GIF)
- Videos (MP4, WebM, MOV)
- SVG vectors
- 3D models (GLTF, GLB, OBJ, FBX, USD)
- PDF documents
- Audio files (MP3, WAV, OGG)
- Color palettes (JSON, JSON5)
- Gradient presets (JSON)
- Pattern definitions (SVG, Canvas)
- Font files (WOFF2, TTF)
- Brush definitions
- Particle presets
- Animation clips (Lottie, Rive)
- Custom plugin packages

### 3. Storage & Organization (400 LOC)
- Project-level asset library
- Shared team asset libraries
- Public asset marketplace
- Personal saved assets
- Recently used stack
- Favorites/bookmarks
- Folder hierarchy
- Smart collections (auto-organized)
- Duplicate detection
- Version history per asset

### 4. Metadata & Tagging (400 LOC)
- Automatic metadata extraction (dimensions, colors, duration, etc.)
- Custom tags (user-defined)
- Automated tagging (AI-powered)
- Collections (multiple tags grouped)
- Descriptions and notes
- License information
- Creator attribution
- Usage rights metadata
- Color palette extraction
- Dominant color analysis

### 5. Preview Generation (400 LOC)
- Thumbnail generation (multiple sizes)
- Lazy-loaded preview images
- Animated GIF preview for videos
- 3D model preview (Three.js)
- SVG rasterization
- Video frame extraction
- Color palette visualization
- Metadata visualization

### 6. Search & Filtering (350 LOC)
- Full-text search (name, description, tags)
- Fuzzy matching
- Filter by type (image, video, 3D, etc.)
- Filter by color (visual color search)
- Filter by dimensions
- Filter by date range
- Filter by usage (most used)
- Filter by custom metadata
- Saved search queries
- Search history

### 7. Upload & Import (300 LOC)
- File upload with progress tracking
- Drag-and-drop upload
- Batch upload
- URL import (download from web)
- Cloud sync (Google Drive, Dropbox)
- AI reference import (automatically analyze and tag)
- Asset pack import (ZIP with metadata)
- Format conversion on upload (WebP, AVIF)

### 8. Library Management (300 LOC)
- Create/rename/delete folders
- Move assets between folders
- Organize by projects
- Lock assets (prevent deletion)
- Publish to marketplace
- Library templates
- Export library as bundle
- Import community libraries

### 9. Collaboration Features (250 LOC)
- Shared libraries between team members
- Asset permissions (view/edit/admin)
- Usage notifications
- Asset comments/feedback
- Version rollback
- Audit log (who used what)

### 10. Advanced Features (300 LOC)
- AI-powered smart tagging
- Visual similarity search
- Content-aware cropping suggestions
- Color harmony suggestions
- Asset recommendations (based on project)
- Trending assets
- Featured collections

### 11. Performance Optimization (250 LOC)
- Lazy loading previews
- Virtual scrolling (handle 10K+ assets)
- Caching strategy
- CDN delivery for previews
- Thumbnail generation queue
- Background indexing

### 12. Testing & Documentation (250 LOC)
- Unit tests for asset operations
- Integration tests for upload/download
- Performance tests (large libraries)
- Documentation for each asset type
- Asset type examples
- Best practices guide

## File Structure

### Frontend (1500 LOC)
```
components/asset-manager/
├── AssetManager.tsx (main component)
├── AssetGrid.tsx (grid view)
├── AssetList.tsx (list view)
├── AssetCard.tsx (individual asset preview)
├── SearchBar.tsx (search with filters)
├── FilterSidebar.tsx (category + tag filters)
├── DetailPanel.tsx (asset metadata + actions)
├── UploadArea.tsx (drag-drop upload)
├── AssetPreview.tsx (full-screen preview)
├── CollectionView.tsx (folder structure)
└── AssetContextMenu.tsx (right-click actions)

lib/asset-manager/
├── types.ts (AssetType, Asset interface)
├── hooks.ts (useAssets, useAssetSearch, useUpload)
├── utils.ts (format validation, preview generation)
├── store.ts (Zustand for asset state)
└── api.ts (fetch assets, upload, metadata)
```

### Backend (1000 LOC)
```
python-service/routes/
└── assets.py (FastAPI routes for CRUD)

python-service/services/
├── asset_manager.py (asset lifecycle)
├── metadata_extractor.py (extract dimensions, colors, duration)
├── preview_generator.py (thumbnails, previews)
├── storage_service.py (Blob storage integration)
├── search_service.py (full-text search, indexing)
└── ai_tagger.py (AI-powered tagging)

python-service/models/
└── asset.py (Pydantic Asset model)
```

## Asset Type Specifications

### Image Assets
- Formats: PNG, JPG, AVIF, WebP, GIF, SVG
- Metadata: Width, height, color space, DPI, ICC profile
- Preview: Thumbnail at 200x200, 400x400, full res
- Processing: Auto-convert to AVIF/WebP

### Video Assets
- Formats: MP4, WebM, MOV, MKV
- Metadata: Duration, resolution, frame rate, codec, bitrate
- Preview: Frame grid (9 keyframes), animated GIF
- Processing: Extract frames for preview

### 3D Model Assets
- Formats: GLTF, GLB, OBJ, FBX, USD, USDZ
- Metadata: Polygon count, material count, animation count
- Preview: Three.js rendered thumbnail, rotatable preview
- Processing: Validate, optimize, convert to GLB

### SVG Assets
- Formats: SVG with embedded/external resources
- Metadata: Dimensions, viewBox, paths count
- Preview: Rasterized thumbnail + vector preview
- Processing: Validate, optimize (SVGO)

### Color Palettes
- Format: JSON palette objects
- Metadata: Number of colors, named colors
- Preview: Color swatch grid
- Usage: Apply to layers, gradients, strokes

### Gradient Presets
- Format: Gradient stop arrays
- Metadata: Type (linear, radial, conic)
- Preview: Gradient swatch
- Usage: Apply to fills, strokes, backgrounds

### Font Assets
- Formats: WOFF2, TTF, OTF
- Metadata: Font family, weight, style variations
- Preview: Text sample in font
- Usage: Apply to text layers

## API Endpoints Required
```
GET /api/assets
- Query: folder, tags, search, type, sort
- Response: paginated assets with metadata

GET /api/assets/{assetId}
- Response: asset details + download URL

POST /api/assets
- Payload: file upload, metadata, tags
- Response: assetId, previewUrl

PUT /api/assets/{assetId}
- Payload: metadata, tags, description
- Response: updated asset

DELETE /api/assets/{assetId}
- Response: deletion status

POST /api/assets/batch-upload
- Payload: multiple files
- Response: batch job status

GET /api/assets/search
- Query: query, filters
- Response: search results

GET /api/assets/preview/{assetId}
- Response: preview image/video/3D

POST /api/assets/import-from-url
- Payload: URL, metadata
- Response: assetId
```

## Performance Targets (Hard SLAs)
- Load asset grid: < 2 seconds (100 assets)
- Preview generation: < 500ms per asset
- Search: < 100ms (1000+ assets)
- Upload: 100MB file < 30 seconds
- Thumbnail generation: < 200ms

## Storage Requirements
- Thumbnail storage: 100KB per asset (average)
- Full resolution cache: project quota
- CDN for preview delivery
- Deduplication for identical assets

## Quality Standards
- 70%+ test coverage
- Zero TypeScript errors
- Metadata accuracy verification
- Preview quality testing
- [AgentName] tags mandatory
- Performance benchmarks

## Integration Points
- Zustand store for current library state
- Drag-and-drop to canvas to create layers
- Asset usage tracking in history
- Undo/redo for asset operations
- Search indexed by AI
- Metadata extracted automatically

## Constraints
- Single file limit: 2GB
- Max 100K assets per project
- Preview generation timeout: 10s
- Storage quota: enforced
- Rate limiting on uploads
