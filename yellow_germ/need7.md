# NEED 7: ASSET MANAGER - Digital Asset Management System

## System Overview
Comprehensive asset management system supporting 100K+ assets with search, tagging, versioning, and cloud storage integration.

## What Goes In This System
- Asset upload and organization
- Asset preview generation
- Full-text search and filtering
- Tagging and categorization
- Version control for assets
- Cloud storage integration (Vercel Blob)
- Asset metadata management
- Duplicate detection

## Files to Create
- `lib/assets/manager.ts` - Core asset manager
- `lib/assets/storage.ts` - Storage service
- `lib/assets/search.ts` - Search engine
- `lib/assets/types.ts` - Type definitions
- `lib/assets/hook.ts` - React hook (useAssets)
- `components/assets/AssetManager.tsx` - Main UI
- `components/assets/AssetBrowser.tsx` - Asset grid
- `components/assets/AssetSearch.tsx` - Search bar
- `python-service/routes/assets.py` - Asset API
- `python-service/services/asset_service.py` - Asset processing
- `tests/assets.test.ts` - Tests (70%+ coverage)

## LOC Target: 2500-3000 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: < 100ms for 10K item search

## Asset Types Supported
- Images (PNG, JPEG, WebP, SVG, AVIF)
- Videos (MP4, WebM, MOV)
- 3D Models (glTF, glb, obj)
- Audio (MP3, WAV, M4A)
- Documents (PDF, PSD, XD)
- Animations (Lottie, Rive, GIF)
- Custom (JSON, any file)

## Features Required
1. Upload single or batch
2. Drag-and-drop upload
3. Auto thumbnail generation
4. Metadata extraction
5. Full-text search (name, tags, description)
6. Filter by type, size, date
7. Sort by name, date, size, usage
8. Tagging system (unlimited tags)
9. Collections/folders
10. Asset preview (hover or click)
11. Asset versioning
12. Duplicate detection
13. Usage tracking (where asset is used)
14. Download/export asset
15. Delete with cascade handling

## Search Features
- Keyword search
- Tag filtering
- Type filtering
- Date range filtering
- Size range filtering
- Color search (for images)
- Aspect ratio filtering
- Custom metadata search

## Database Schema (Neon PostgreSQL)
- assets table (id, name, type, size, url, metadata, tags, created_at)
- asset_versions table (asset_id, version, data, created_at)
- asset_tags table (id, name, color)
- asset_tag_map table (asset_id, tag_id)
- asset_collections table (id, name, description)

## API Endpoints
- POST /api/assets/upload - Upload asset
- GET /api/assets/list - List assets with filters
- GET /api/assets/search - Search assets
- GET /api/assets/{id} - Get asset details
- PUT /api/assets/{id} - Update asset metadata
- DELETE /api/assets/{id} - Delete asset
- POST /api/assets/{id}/versions - Get versions
- POST /api/assets/tags - Create tag
- GET /api/assets/tags - List tags
- POST /api/assets/collections - Create collection

## State Integration
Use Zustand store:
- `editorStore.addAsset()`
- `editorStore.updateAsset()`
- `editorStore.deleteAsset()`
- Track selected assets
- Track upload progress

## Cloud Storage
- Use Vercel Blob for storage
- Signed URLs for downloads
- Automatic cleanup of unused assets
- Storage quota per user

## Deliverables Checklist
- Upload working (single + batch)
- Drag-and-drop working
- Thumbnail generation working
- Metadata extraction working
- Search working for 100K+ items
- Tagging system working
- Collections working
- Versioning working
- Duplicate detection working
- Download/export working
- Database schema working
- All API endpoints working
- All tests passing
- Performance benchmarks met
- JSDoc complete
