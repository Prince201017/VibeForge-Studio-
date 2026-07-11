# Claude.A2 - Geometry Engine Specification

**Agent:** Claude.A2  
**Task:** Geometry Engine - Procedural Transformations & SVG/Canvas Operations  
**LOC Target:** 3500-4500 lines  
**Complexity:** High  
**Files:** 12-15  
**Timeline:** Phase 1 (5 days)

---

## Executive Summary

Build the procedural geometry transformation system that enables non-destructive editing of shapes, SVGs, and images. All operations must be parameter-driven and real-time previewable on the canvas.

**Key Deliverables:**
- Geometry operation engine (Voronoi, boolean, slicing, grids, waves)
- SVG path manipulation and composition
- Canvas-based rendering of geometric operations
- Parameter node system for chaining operations
- Real-time preview in viewport
- Export-ready geometry data

---

## File Structure & Responsibilities

### Core Engine Files

```
components/editor/panels/GeometryPanel.tsx (400 LOC)
├─ UI for geometry operations panel
├─ Operation selector and parameter editor
├─ Live preview toggle
└─ [Claude.A2] tag on all code

lib/geometry/engine.ts (1200 LOC)
├─ Main geometry operation processor
├─ Operation registry
├─ Parameter validation
├─ History/undo tracking
└─ Core of the system

lib/geometry/operations.ts (1500 LOC)
├─ Individual operation implementations
├─ Voronoi diagram generator
├─ Boolean operations (union, intersect, subtract)
├─ Path slicing and segmentation
├─ Grid and wave generators
├─ Polygon triangulation
└─ Each function fully documented

lib/geometry/svg.ts (800 LOC)
├─ SVG path parsing and manipulation
├─ Path conversion utilities
├─ SVG to Canvas rendering
├─ Path composition and merging
└─ Export SVG generation

lib/geometry/canvas.ts (600 LOC)
├─ Canvas rendering for geometry
├─ Stroke/fill rendering
├─ Anti-aliasing and quality settings
├─ Performance optimization
└─ Viewport integration

lib/geometry/types.ts (300 LOC)
├─ TypeScript interfaces for geometry
├─ Operation parameter types
├─ Geometry data structures
└─ Type-safe all code

hooks/useGeometry.ts (300 LOC)
├─ Custom React hook for geometry operations
├─ Parameter state management
├─ Undo/redo integration
├─ Viewport updates on geometry change
└─ Export and preview functions

__tests__/geometry.test.ts (500 LOC)
├─ Unit tests for all operations
├─ Parameter validation tests
├─ Canvas rendering tests
├─ SVG path tests
└─ 70%+ coverage requirement
```

---

## Detailed Requirements

### 1. Geometry Operation Engine (`lib/geometry/engine.ts`)

**Purpose:** Central processor for all geometry transformations.

**Required Functions:**

```typescript
// [Claude.A2] Core operation processor
class GeometryEngine {
  // Register an operation
  registerOperation(name: string, handler: OperationHandler)
  
  // Apply operation to geometry
  applyOperation(geometry: Geometry, operation: Operation): Geometry
  
  // Chain multiple operations
  chain(geometry: Geometry, operations: Operation[]): Geometry
  
  // Validate operation parameters
  validateParams(operation: Operation): ValidationResult
  
  // Get operation metadata
  getOperationMeta(name: string): OperationMeta
  
  // Undo last operation
  undo(): Geometry
  
  // Redo last undone operation
  redo(): Geometry
  
  // Clear history
  clearHistory()
}
```

**Constraints:**
- All operations must be pure functions (no side effects)
- Parameters must be validated before execution
- Operations must be chainable (output of one is input to next)
- History must track all operations for undo/redo
- Performance: Process complex geometries in < 500ms

**Tests Required:**
- Operation registration and retrieval
- Parameter validation edge cases
- Undo/redo history tracking
- Chain operation ordering

---

### 2. Geometry Operations (`lib/geometry/operations.ts`)

**Purpose:** Implement 15+ procedural geometry generators.

**Required Operations (STRICT):**

1. **Voronoi Diagram**
   ```typescript
   // [Claude.A2] Generate Voronoi diagram from points
   function voronoi(points: Point[], width: number, height: number): Path[]
   
   // Parameters: point_count, relaxation_iterations, clip_bounds
   // Output: Array of polygonal cells
   // Performance: < 200ms for 100 points
   ```

2. **Boolean Operations**
   ```typescript
   // [Claude.A2] Union, intersection, subtraction of paths
   function booleanUnion(pathA: Path, pathB: Path): Path
   function booleanIntersect(pathA: Path, pathB: Path): Path
   function booleanSubtract(pathA: Path, pathB: Path): Path
   
   // Uses: SVG path algebra or clipping algorithm
   // Output: Valid SVG path
   // Performance: < 100ms per operation
   ```

3. **Path Slicing**
   ```typescript
   // [Claude.A2] Slice path into segments
   function slicePath(path: Path, slices: number, direction: 'horizontal' | 'vertical'): Path[]
   
   // Parameters: path, number of slices, orientation
   // Output: Array of sliced paths
   // Performance: < 50ms
   ```

4. **Triangulation**
   ```typescript
   // [Claude.A2] Delaunay triangulation of points or polygon
   function triangulate(points: Point[]): Triangle[]
   
   // Parameters: point array
   // Output: Triangle array with indices
   // Performance: < 100ms for 1000 points
   ```

5. **Hexagonal Grid**
   ```typescript
   // [Claude.A2] Generate hexagonal grid pattern
   function hexGrid(width: number, height: number, hexSize: number): Path[]
   
   // Parameters: dimensions, hex size
   // Output: Array of hex paths
   // Performance: < 50ms
   ```

6. **Isometric Layout**
   ```typescript
   // [Claude.A2] Convert geometry to isometric projection
   function isometric(path: Path, angle: number = 30): Path
   
   // Parameters: path, isometric angle
   // Output: Isometrically projected path
   // Performance: < 50ms
   ```

7. **Wave Deformation**
   ```typescript
   // [Claude.A2] Apply sinusoidal wave to path
   function wave(path: Path, amplitude: number, frequency: number, phase: number): Path
   
   // Parameters: amplitude, frequency, phase offset
   // Output: Wavy path
   // Performance: < 50ms
   ```

8. **Spiral Generator**
   ```typescript
   // [Claude.A2] Generate spiral path
   function spiral(turns: number, radius: number, center: Point): Path
   
   // Parameters: number of turns, final radius, center point
   // Output: Spiral path
   // Performance: < 50ms
   ```

9. **Polygon to Grid**
   ```typescript
   // [Claude.A2] Convert polygon to pixel/square grid representation
   function polygonToGrid(path: Path, gridSize: number): boolean[][]
   
   // Parameters: path, grid cell size
   // Output: 2D boolean grid
   // Performance: < 100ms
   ```

10. **Mesh Gradient Generator**
    ```typescript
    // [Claude.A2] Create mesh gradient points from path
    function meshGradient(path: Path, controlPoints: number): MeshPatch[]
    
    // Parameters: path, density of control points
    // Output: Array of mesh patches
    // Performance: < 100ms
    ```

11. **Stripification**
    ```typescript
    // [Claude.A2] Convert path to diagonal stripes
    function diagonalStripes(path: Path, stripeWidth: number, angle: number): Path[]
    
    // Parameters: stripe width, angle
    // Output: Array of stripe paths
    // Performance: < 100ms
    ```

12. **Offset/Expand**
    ```typescript
    // [Claude.A2] Expand or contract path outline
    function offset(path: Path, distance: number): Path
    
    // Parameters: offset distance (positive = expand, negative = contract)
    // Output: Offset path
    // Performance: < 100ms
    ```

13. **Simplification**
    ```typescript
    // [Claude.A2] Simplify path by removing redundant points
    function simplify(path: Path, tolerance: number): Path
    
    // Parameters: simplification tolerance
    // Output: Simplified path
    // Performance: < 50ms
    ```

14. **Smooth/Interpolate**
    ```typescript
    // [Claude.A2] Smooth path using Bézier interpolation
    function smoothPath(path: Path, smoothness: number): Path
    
    // Parameters: smoothness factor (0-1)
    // Output: Smoothed path
    // Performance: < 50ms
    ```

15. **Circular Crop**
    ```typescript
    // [Claude.A2] Crop geometry to circular boundary
    function circularCrop(path: Path, center: Point, radius: number): Path
    
    // Parameters: center, radius
    // Output: Cropped path
    // Performance: < 50ms
    ```

**Every operation must have:**
- Full TypeScript typing
- JSDoc comment with parameters and return type
- Input validation
- Error handling with clear messages
- Performance assertions (< target ms)
- Unit tests

---

### 3. SVG Path Manipulation (`lib/geometry/svg.ts`)

**Purpose:** Parse, manipulate, and export SVG paths.

**Required Functions:**

```typescript
// [Claude.A2] Parse SVG path string to internal format
function parsePath(pathString: string): Path

// [Claude.A2] Convert internal path to SVG string
function pathToString(path: Path): string

// [Claude.A2] Merge multiple paths
function mergePaths(paths: Path[], operation: 'union' | 'combine'): Path

// [Claude.A2] Extract bounds of path
function getBounds(path: Path): Bounds

// [Claude.A2] Transform path (scale, rotate, translate)
function transformPath(path: Path, matrix: Matrix3): Path

// [Claude.A2] Reverse path direction
function reversePath(path: Path): Path

// [Claude.A2] Convert path to absolute coordinates
function toAbsolute(path: Path): Path

// [Claude.A2] Get path length
function getPathLength(path: Path): number

// [Claude.A2] Get point at distance along path
function getPointAtDistance(path: Path, distance: number): Point

// [Claude.A2] Get tangent at distance along path
function getTangentAtDistance(path: Path, distance: number): Vector
```

**Constraints:**
- Must handle all SVG path commands (M, L, C, Q, A, Z, etc.)
- Preserve path data precision (6+ decimal places)
- Handle edge cases (empty paths, single points, degenerate curves)
- All transformations must be reversible

---

### 4. Canvas Rendering (`lib/geometry/canvas.ts`)

**Purpose:** Render geometry to canvas for viewport display.

**Required Functions:**

```typescript
// [Claude.A2] Render path to canvas context
function renderPath(ctx: CanvasRenderingContext2D, path: Path, options: RenderOptions): void

// [Claude.A2] Render stroked path
function strokePath(ctx: CanvasRenderingContext2D, path: Path, stroke: StrokeStyle): void

// [Claude.A2] Render filled path
function fillPath(ctx: CanvasRenderingContext2D, path: Path, fill: FillStyle): void

// [Claude.A2] Render multiple paths efficiently (batched)
function renderPaths(ctx: CanvasRenderingContext2D, paths: Path[], options: RenderOptions): void

// [Claude.A2] Get rasterized geometry as ImageData
function rasterize(path: Path, width: number, height: number, dpi: number): ImageData
```

**Constraints:**
- Must support 60 FPS rendering
- Use canvas context transforms for efficiency
- Support stroke styles, fill patterns, shadows
- Anti-alias paths for quality output

---

### 5. React Hook (`hooks/useGeometry.ts`)

**Purpose:** Connect geometry engine to React components.

**Required Hook:**

```typescript
// [Claude.A2] Main geometry hook
function useGeometry(initialGeometry?: Geometry) {
  // Current geometry state
  geometry: Geometry
  
  // Apply operation
  applyOperation: (op: Operation) => void
  
  // Undo/redo
  undo: () => void
  redo: () => void
  
  // Reset to initial
  reset: () => void
  
  // Get geometry for export
  export: (format: 'svg' | 'png' | 'json') => Promise<any>
  
  // Parameters for UI
  currentParams: Record<string, any>
  setParam: (key: string, value: any) => void
  
  // Validation
  isValid: boolean
  errors: string[]
  
  return { geometry, applyOperation, undo, redo, ... }
}
```

---

### 6. TypeScript Types (`lib/geometry/types.ts`)

**Required Type Definitions:**

```typescript
// [Claude.A2] Core geometry types
interface Path {
  commands: PathCommand[]
  closed: boolean
  metadata?: Record<string, any>
}

interface Point {
  x: number
  y: number
}

interface Geometry {
  paths: Path[]
  bounds: Bounds
  metadata: GeometryMetadata
}

interface Operation {
  id: string
  name: string
  params: Record<string, any>
  timestamp: Date
}

interface OperationMeta {
  name: string
  label: string
  category: string
  params: ParamDefinition[]
  description: string
}

interface ParamDefinition {
  name: string
  type: 'number' | 'string' | 'boolean' | 'select'
  min?: number
  max?: number
  default: any
  description: string
}

// All types must be strict (no any types)
```

---

### 7. UI Component (`components/editor/panels/GeometryPanel.tsx`)

**Purpose:** UI for geometry operations.

**Required Elements:**

```typescript
// [Claude.A2] Main geometry panel component
export function GeometryPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Operation selector dropdown */}
      <select onChange={handleOperationChange}>
        <option value="">Select Operation...</option>
        <option value="voronoi">Voronoi Diagram</option>
        <option value="boolean">Boolean Operations</option>
        {/* All 15+ operations listed */}
      </select>
      
      {/* Parameter editor for selected operation */}
      <div>{renderParamEditor(selectedOperation)}</div>
      
      {/* Preview toggle */}
      <checkbox>Live Preview</checkbox>
      
      {/* Action buttons */}
      <button onClick={applyOperation}>Apply</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      
      {/* Geometry info display */}
      <div>Point count: {geometry.pointCount}</div>
      <div>Path count: {geometry.paths.length}</div>
    </div>
  )
}
```

---

### 8. Tests (`__tests__/geometry.test.ts`)

**Test Coverage Required (70%+ coverage):**

```typescript
// [Claude.A2] Unit tests for all geometry operations
describe('GeometryEngine', () => {
  test('voronoi generates correct cell count')
  test('boolean union produces valid output')
  test('path slicing creates correct number of segments')
  test('triangulation handles collinear points')
  test('hexGrid generates regular pattern')
  test('wave deformation preserves path')
  test('offset handles negative distances')
  test('simplify reduces point count')
  // ... more tests for edge cases
})

describe('SVGPath', () => {
  test('parsePath handles all SVG commands')
  test('pathToString produces valid SVG')
  test('transformPath correctly applies matrix')
  test('getBounds calculates correct rectangle')
  // ... more tests
})

describe('Canvas', () => {
  test('renderPath draws on canvas')
  test('strokePath applies stroke style')
  test('fillPath applies fill color')
  // ... more tests
})
```

---

## Integration Points

### With Viewport (Claude.A5)
- Export geometry as renderable data structure
- Receive canvas context for live preview rendering
- Support layer selection and highlighting

### With Animation (Claude.A3)
- Geometry parameters must be keyframeable
- Export animation-ready path data

### With State Management (V0.A1)
- Sync geometry to Zustand store on every operation
- Support undo/redo through global state

### With Rendering (Claude.A5)
- Provide optimized path data for export
- Support rasterization for image export

---

## Code Quality Standards (STRICT)

1. **All functions must be pure** (no side effects)
2. **No global state** — use Zustand only
3. **Comprehensive error handling** with custom error types
4. **Performance assertions** in every operation
5. **JSDoc on every exported symbol**
6. **100% TypeScript strict mode**
7. **No `any` types allowed**
8. **Unit tests for all public functions**
9. **< 500 LOC per file** (except operations.ts)

---

## Submission Checklist

Before pushing code:

- [ ] All 15+ operations implemented and tested
- [ ] Zero TypeScript errors in strict mode
- [ ] Zero ESLint warnings
- [ ] 70%+ test coverage
- [ ] All functions have JSDoc comments
- [ ] Performance benchmarks met (< 500ms for complex ops)
- [ ] Integration with V0.A1's Zustand store working
- [ ] Viewport can render geometry in real-time
- [ ] Git commit tagged [Claude.A2]
- [ ] Posted summary in communication_gate.md

---

## Questions & Blockers

If you encounter issues:
1. Check `contracts/API_CONTRACT.md`
2. Review `contracts/TYPE_CONTRACTS.md`
3. Post in `communication_gate.md` immediately

Ready? Start with the `GeometryEngine` class in `lib/geometry/engine.ts`. Let's build something incredible.
