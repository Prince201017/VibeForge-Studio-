# NEED 4: VIEWPORT RENDERER - Canvas/WebGL Rendering Engine

## System Overview
Real-time rendering engine combining Canvas 2D and WebGL for 60 FPS viewport performance. Displays layers, animations, particles, and interactive elements.

## What Goes In This System
- Canvas 2D rendering pipeline
- WebGL rendering pipeline (Three.js)
- Layer composition and blending
- Real-time animation playback
- Interactive element handling
- Performance monitoring

## Files to Create
- `lib/renderer/engine.ts` - Core render engine
- `lib/renderer/canvas-renderer.ts` - Canvas 2D rendering
- `lib/renderer/webgl-renderer.ts` - WebGL/Three.js rendering
- `lib/renderer/layer-compositor.ts` - Layer blending
- `lib/renderer/animation-player.ts` - Animation playback
- `lib/renderer/types.ts` - Type definitions
- `lib/renderer/hook.ts` - React hook (useRenderer)
- `components/viewport/RenderCanvas.tsx` - Main canvas component
- `components/viewport/RenderControls.tsx` - Viewport controls
- `tests/renderer.test.ts` - Tests (70%+ coverage)

## LOC Target: 2500-3500 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: 60 FPS (< 16ms per frame)

## Rendering Features
1. Multiple layer rendering
2. Blend mode support (multiply, screen, overlay, etc)
3. Filter effects (blur, brightness, contrast)
4. Particle rendering
5. Text rendering
6. Bezier path rendering
7. Image rendering with transforms
8. Animation playback sync

## Performance Targets
- 60 FPS sustained (< 16ms/frame)
- 4K resolution support
- 1000+ elements without frame drops
- Smooth pan/zoom
- Memory efficient

## API Endpoints
- GET /api/render/export-canvas
- POST /api/render/screenshot
- GET /api/render/performance-metrics

## State Integration
Use Zustand store:
- `editorStore.renderFrame()` - Trigger render
- Listen to layer updates
- Listen to animation updates
- Listen to particle updates
- Update on viewport changes

## Export Formats Supported (Initial)
- PNG (screenshot)
- JPEG (screenshot)
- WebP (screenshot)
- SVG (vector export)

## Interactive Features
- Pan with middle-click + drag
- Zoom with scroll wheel
- Zoom with Ctrl+scroll
- Fit to view (keyboard shortcut)
- Viewport grid toggle
- Viewport guides

## Deliverables Checklist
- Canvas 2D rendering working
- WebGL rendering working
- Layer composition working
- 60 FPS performance maintained
- All blend modes working
- All filters working
- Animation playback in sync
- Particle rendering working
- Text rendering working
- Pan/zoom working smoothly
- Export formats working
- All tests passing
- Performance benchmarks met
- JSDoc complete
