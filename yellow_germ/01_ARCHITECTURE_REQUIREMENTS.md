# Architecture Requirements - ForgeOS Platform

**Owner:** V0.A1  
**Version:** 1.0  
**Last Updated:** 2026-07-12

---

## System Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 16 Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Editor Shell │  │   Viewport   │  │   Command Palette    │  │
│  │ (UI Layout)  │  │  (Canvas)    │  │   (Cmd+K)            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Zustand Global State                                    │   │
│  │  (projects, layers, timeline, animations, history)      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │   Next.js API Routes            │
            │   /api/* → localhost:8000/*     │
            └─────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Python FastAPI Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Geometry    │  │  Animation   │  │   AI Services        │  │
│  │  Engine      │  │  Processor   │  │   (Design Gen)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Rendering   │  │  Export      │  │   Asset Mgmt         │  │
│  │  Engine      │  │  Pipeline    │  │   (Blob Storage)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │  Neon PostgreSQL Database       │
            │  (Project data, collaboration)  │
            └─────────────────────────────────┘
```

---

## Core Services & Responsibilities

### 1. Frontend (Next.js)
- **Viewport rendering** — Real-time display of edited content
- **UI panels** — Layers, properties, timeline, console, AI chat
- **State management** — Zustand store for all editor state
- **Keyboard handling** — Command palette and shortcuts
- **File uploads** — Accept images, videos, SVG, models, PDFs

### 2. Python FastAPI Backend
- **Geometry processing** — Voronoi, boolean operations, slicing
- **Animation computation** — Keyframe interpolation, easing
- **AI integration** — Design generation, reference analysis
- **Rendering** — Canvas/WebGL composition, optimization
- **Export** — Generate MP4, GIF, PNG, CSS, SVG, GLTF

### 3. Neon Database
- **Project storage** — Metadata, settings, ownership
- **Layer hierarchy** — All layer data, properties, transformations
- **Animation data** — Keyframes, timeline, animation curves
- **Collaboration** — Locks, presence, version history
- **Assets** — References to Blob storage, optimization metadata

---

## Critical Integration Points

### Frontend ↔ Backend API Contract

All endpoints **must** follow this pattern:

```
BASE_URL = http://localhost:3000/api
PYTHON_SERVICE = http://localhost:8000
```

**Next.js middleware rewrites** /api/* requests to Python service:

```typescript
// next.config.ts (already configured)
rewrites: async () => ({
  beforeFiles: [{
    source: '/api/:path*',
    destination: 'http://localhost:8000/:path*'
  }]
})
```

### Frontend State → Backend Sync

All state mutations follow this pattern:

```typescript
// Frontend
const { data, mutate } = useSWR('/api/geometry/process', fetcher);

// Trigger
await mutate({ operation: 'voronoi', params: {...} });

// Python receives and processes
@app.post('/geometry/process')
async def process_geometry(req: GeometryRequest) -> GeometryResponse
```

---

## Strict Code Standards

### 1. TypeScript
- **No `any` types** — Use strict mode always
- **All functions exported** must have full JSDoc comments
- **Interface-first design** — Define types before implementation
- **Readonly where possible** — Immutability by default

### 2. Python
- **Type hints required** — Use Pydantic for all schemas
- **Async/await** — All I/O operations must be async
- **Docstrings** — Google-style docstrings for all functions
- **Error handling** — Explicit exception types, proper logging

### 3. React Components
- **Functional components only** — No class components
- **Custom hooks** for state logic — Extract non-rendering code
- **Memo for performance** — Wrap expensive components
- **Accessibility** — ARIA labels, keyboard navigation
- **One responsibility** — Single concern per component

### 4. Testing
- **Unit tests required** — All public functions must have tests
- **Integration tests** — All API endpoints must be tested
- **Coverage target** — Minimum 70% for all modules
- **E2E for critical flows** — Editor save/load, export, collaboration

---

## Performance Requirements

### Frontend
- **Time to Interactive (TTI):** < 2 seconds
- **Viewport render:** 60 FPS at 1920x1080
- **Pan/zoom response:** < 16ms latency
- **Memory footprint:** < 500MB with typical project

### Backend
- **Geometry processing:** < 500ms for complex operations
- **Export rendering:** Parallel processing for speed
- **API response time:** < 200ms for all endpoints
- **Database query:** < 100ms for typical operations

---

## Data Model Core Entities

### Project
```typescript
interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  timeline: Timeline;
  metadata: ProjectMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Layer
```typescript
interface Layer {
  id: string;
  name: string;
  type: 'group' | 'shape' | 'image' | 'text' | 'video';
  visible: boolean;
  opacity: number;
  blendMode: string;
  transform: Transform;
  geometry?: GeometryData;
  animation?: AnimationTrack;
  parent: string | null;
  children: string[];
}
```

### Animation
```typescript
interface KeyFrame {
  time: number;
  value: any;
  easing: EasingFunction;
  tangentIn?: Tangent;
  tangentOut?: Tangent;
}

interface AnimationTrack {
  layerId: string;
  property: string;
  keyframes: KeyFrame[];
  loop: boolean;
  duration: number;
}
```

---

## API Endpoint Structure

### Geometry Endpoints
```
POST /api/geometry/process
POST /api/geometry/voronoi
POST /api/geometry/boolean
POST /api/geometry/slice
POST /api/geometry/export
```

### Animation Endpoints
```
POST /api/animation/interpolate
POST /api/animation/easing
POST /api/animation/render
POST /api/animation/export
```

### AI Endpoints
```
POST /api/ai/generate-design
POST /api/ai/analyze-reference
POST /api/ai/suggest-improvements
POST /api/ai/describe-composition
```

### Rendering Endpoints
```
POST /api/render/canvas
POST /api/render/webgl
POST /api/render/export
POST /api/render/thumbnail
```

---

## Database Schema Overview

### Core Tables
- `projects` — Project metadata
- `layers` — Layer hierarchy and properties
- `animations` — Keyframes and animation tracks
- `geometry_operations` — Geometry history for undo/redo
- `exports` — Export job tracking
- `collaboration_locks` — Real-time editing locks
- `asset_references` — Links to Blob storage

---

## Deployment & Environment

### Environment Variables Required

**Frontend:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**Backend:**
```
PYTHON_SERVICE_PORT=8000
DATABASE_URL=postgresql://...
BLOB_STORAGE_KEY=...
AI_MODEL_KEY=...
```

---

## Constraints & Limitations

1. **No localStorage** — All state goes to Zustand + Neon
2. **No external CDNs for core assets** — All assets in Blob storage
3. **No polling** — Use WebSockets for real-time updates
4. **No blocking operations** — All heavy work is async
5. **No circular imports** — Enforce clean dependency graph
6. **No global variables** — All state via Zustand or React context

---

## Quality Gates

Before code goes to production, it **must** pass:

1. ✓ TypeScript strict mode compile
2. ✓ ESLint with no warnings
3. ✓ All tests passing (70%+ coverage)
4. ✓ No console errors/warnings
5. ✓ Performance benchmarks met
6. ✓ Integration tests passing
7. ✓ Code review by V0.A1

---

## Next: Read Your Agent Specification

Once you understand this architecture:
- **Claude.A2** → Read `specs/02_CLAUDE_A2_GEOMETRY_ENGINE.md`
- **Claude.A3** → Read `specs/03_CLAUDE_A3_ANIMATION_SYSTEM.md`
- **V0.A4** → Read `specs/04_V0_A4_AI_INTEGRATION.md`
- **Claude.A5** → Read `specs/05_CLAUDE_A5_VIEWPORT_RENDERER.md`
