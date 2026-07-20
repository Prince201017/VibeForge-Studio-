# ForgeOS Architecture

Built from INDEX.md bullet: "System design, tech stack, integration points, constraints."
No source `01_ARCHITECTURE_REQUIREMENTS.md` was provided — this is a reasonable baseline
inferred from how every other subsystem in the index references it (Zustand store, FastAPI
backend, Neon Postgres, Vercel Blob, WebSocket sync, RBAC on every endpoint).

## Tech Stack
- Frontend: React + TypeScript (strict), Zustand for state, Vite build
- Backend: Python FastAPI (async), SQLAlchemy 2.0, Neon Postgres
- Realtime: WebSocket + OT (see 09-collaboration)
- Storage: Vercel Blob for assets/exports
- Cache/queues: Redis (Upstash)
- Auth: Clerk (see 12-security, already delivered)

## Monorepo Layout
```
/apps
  /web            # React app (editor shell, all subsystem UIs mount here)
/packages
  /geometry-engine
  /animation-system
  /viewport-renderer
  /particle-engine
  /css-codegen
  /ui-components
  /shared-types   # cross-package contracts
/python-service
  /ai-integration
  /export-pipeline
  /asset-manager
  /collaboration
  /advanced-ai
  /security       # delivered separately
```

## Integration Points
- All frontend mutations go through the Zustand store (`useEditorStore`), never direct
  fetch calls from components — mutations dispatch actions, actions call the API client,
  API client updates the store with server-confirmed state.
- Every mutation is recorded to a history stack for undo/redo (see shared-types/history.ts).
- Backend endpoints all require the `current_user` dependency (see 12-security/auth.py)
  and a permission check via `security/rbac.py` before touching a project.

## Constraints carried over from the index
- 60 FPS viewport + animation playback
- API responses < 200ms
- Particle physics < 16ms/frame
- Export pipeline < 60s for video
- Search < 100ms @ 10K items
- WebSocket sync < 100ms latency

## Environment
See 12-security/README for the full env var list (Clerk, DB, encryption, Redis, blob token).
