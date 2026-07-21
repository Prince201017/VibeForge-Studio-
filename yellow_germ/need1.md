# NEED 1: GEOMETRY ENGINE - Procedural Geometry Transformations

## System Overview
Geometry engine that handles procedural transformations of vector and raster assets without modifying originals. Supports 15+ parametric operations with real-time preview.

## What Goes In This System
- Procedural geometry operations (Voronoi, boolean ops, slicing, grids, waves, etc)
- SVG path manipulation and Canvas rendering
- Parameter-driven transformations
- Real-time preview and undo/redo

## Files to Create
- `lib/geometry/engine.ts` - Core geometry engine
- `lib/geometry/operations.ts` - All 15+ operations
- `lib/geometry/svg.ts` - SVG path utilities
- `lib/geometry/canvas.ts` - Canvas rendering
- `lib/geometry/types.ts` - Type definitions
- `lib/geometry/hook.ts` - React hook (useGeometry)
- `components/geometry/GeometryPanel.tsx` - UI panel
- `tests/geometry.test.ts` - Tests (70%+ coverage)

## LOC Target: 3500-4500 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: < 500ms per operation

## Operations Required (15+)
1. Diagonal stripes geometry
2. Polygon slicing
3. Voronoi diagram
4. Triangulation (Delaunay)
5. Hexagonal grids
6. Isometric layouts
7. Glass card effects
8. Circular crops
9. Wave distortion
10. Ribbon geometry
11. Mesh gradients
12. Wireframe generation
13. Crystal cuts
14. Mosaic patterns
15. Parametric grids

## API Endpoints
- POST /api/geometry/generate
- POST /api/geometry/preview
- GET /api/geometry/operations
- POST /api/geometry/export

## State Integration
Use Zustand store:
- `editorStore.setGeometryOperation()`
- `editorStore.updateLayerGeometry()`
- Update history for undo/redo
- Real-time viewport update

## Deliverables Checklist
- All 15+ operations working
- SVG and Canvas rendering both supported
- Parameter UI in right panel
- Real-time preview in viewport
- Full undo/redo support
- All tests passing
- Performance benchmarks met
- JSDoc complete
