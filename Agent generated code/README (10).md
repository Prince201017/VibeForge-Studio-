# Viewport Renderer [Claude.A5]

Built from INDEX.md bullet only ("Canvas/WebGL rendering, exports, 2500-3500 LOC") —
real `05_CLAUDE_A5_VIEWPORT_RENDERER.md` not provided.

## Included
- Pan/zoom camera with screen<->world transforms (`camera.ts`)
- Canvas2D render target implementing a `RenderTarget` interface (`canvas-renderer.ts`)
- 60fps frame scheduler with dirty-flag skip + frame-time tracking against the SLA (`frame-scheduler.ts`)
- PNG/SVG export (`export.ts`)

## Not included
A WebGL render target (would implement the same `RenderTarget` interface for GPU-heavy
scenes/particle overlays) — noted as a clean extension point but not built without a spec
defining shader requirements.
