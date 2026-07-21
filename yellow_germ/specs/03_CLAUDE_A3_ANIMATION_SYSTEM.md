# Claude.A3 - Animation & Timeline System Specification

**Agent:** Claude.A3  
**Task:** Animation Engine - Timeline, Keyframes, Graph Editor, Motion Curves  
**LOC Target:** 3000-4000 lines  
**Complexity:** High  
**Files:** 10-12  
**Timeline:** Phase 1 (5 days)

---

## Executive Summary

Build a professional-grade timeline editor with keyframe management, easing curve editor, and real-time animation preview. Every property must be keyframeable. Animations must preview in real-time on the viewport.

**Key Deliverables:**
- Timeline component with playhead and scrubbing
- Keyframe editor with precise frame control
- Graph editor for easing curves (Bézier interpolation)
- Animation preview and rendering
- Export support (CSS animations, GSAP, Lottie)
- Undo/redo for animation changes

---

## File Structure & Responsibilities

### Core Animation Files

```
components/editor/panels/TimelinePanel.tsx (600 LOC)
├─ Main timeline UI component
├─ Playhead scrubbing
├─ Frame ruler and grid
├─ Layer animation tracks display
├─ Zoom and pan controls
└─ [Claude.A3] tag

lib/animation/engine.ts (1200 LOC)
├─ Core animation processor
├─ Keyframe interpolation engine
├─ Timeline management
├─ Easing curve evaluation
├─ Animation composition
└─ Real-time playback

lib/animation/keyframe.ts (600 LOC)
├─ Keyframe data structure
├─ Keyframe sorting and retrieval
├─ Property path resolution
├─ Value interpolation logic
└─ Change detection

lib/animation/easing.ts (500 LOC)
├─ Easing curve functions
├─ Bézier curve math
├─ Spring physics solver
├─ Custom curve evaluation
└─ Curve previsualization

lib/animation/timeline.ts (400 LOC)
├─ Timeline data structure
├─ Track management
├─ Timing and duration
├─ Playback controls
└─ Timeline composition

components/editor/panels/GraphEditor.tsx (500 LOC)
├─ Easing curve visualization
├─ Interactive Bézier curve editor
├─ Tangent handle manipulation
├─ Curve preset selector
└─ Real-time preview

components/editor/panels/KeyframeEditor.tsx (400 LOC)
├─ Keyframe properties inspector
├─ Precise frame and value input
├─ Keyframe type selector (linear, ease, custom)
├─ Interpolation preview
└─ Batch keyframe operations

hooks/useAnimation.ts (350 LOC)
├─ Main animation hook
├─ Playback state management
├─ Timeline synchronization
├─ Viewport update integration
└─ Export functions

lib/animation/types.ts (300 LOC)
├─ TypeScript interfaces
├─ Keyframe structures
├─ Animation data models
├─ Easing definitions
└─ Type-safe code

__tests__/animation.test.ts (450 LOC)
├─ Unit tests for interpolation
├─ Easing curve tests
├─ Timeline management tests
├─ Playback state tests
└─ 70%+ coverage
```

---

## Detailed Requirements

### 1. Timeline Component (`components/editor/panels/TimelinePanel.tsx`)

**Purpose:** Professional timeline UI for animation editing.

**Required Elements:**

```typescript
// [Claude.A3] Main timeline panel component
export function TimelinePanel() {
  // Layout: header (controls) + ruler (frames) + tracks (layers)
  return (
    <div className="flex flex-col h-full bg-background border-t border-border">
      {/* Timeline header with controls */}
      <TimelineHeader 
        duration={duration}
        currentFrame={currentFrame}
        isPlaying={isPlaying}
        onPlay={() => ...}
        onPause={() => ...}
        onStop={() => ...}
      />
      
      {/* Frame ruler with grid */}
      <TimelineRuler 
        duration={duration}
        currentFrame={currentFrame}
        fps={30}
        zoom={zoomLevel}
        onScrub={(frame) => ...}
      />
      
      {/* Animation tracks for each layer */}
      <TimelineTracks
        layers={layers}
        tracks={animationTracks}
        currentFrame={currentFrame}
        selectedKeyframes={selectedKeyframes}
        onKeyframeSelect={(keyframe) => ...}
        onKeyframeMove={(keyframe, newFrame) => ...}
        onKeyframeDelete={(keyframe) => ...}
        onTrackClick={(layerId) => ...}
      />
      
      {/* Timeline zoom and pan controls */}
      <TimelineControls 
        zoom={zoomLevel}
        onZoomIn={() => ...}
        onZoomOut={() => ...}
        onZoomFit={() => ...}
      />
    </div>
  )
}
```

**Constraints:**
- Ruler must show frames at correct intervals based on zoom
- Playhead must be draggable for scrubbing
- Tracks must be scrollable horizontally and vertically
- Support keyboard shortcuts (Space to play, arrows to navigate)
- Real-time preview while scrubbing
- 60 FPS smooth scrolling

**Features:**
- [ ] Playhead follows current frame
- [ ] Scrubbing updates viewport in real-time
- [ ] Frame ruler with FPS indicators
- [ ] Layer track visualization
- [ ] Keyframe markers on tracks
- [ ] Selection highlighting
- [ ] Multi-select with Shift+Click
- [ ] Drag to reposition keyframes

---

### 2. Animation Engine (`lib/animation/engine.ts`)

**Purpose:** Core animation processing and interpolation.

**Required Class:**

```typescript
// [Claude.A3] Main animation engine
class AnimationEngine {
  // Add keyframe to animation track
  addKeyframe(layerId: string, property: string, time: number, value: any): Keyframe
  
  // Remove keyframe
  removeKeyframe(keyframeId: string): void
  
  // Update keyframe value
  updateKeyframe(keyframeId: string, value: any): void
  
  // Move keyframe to new time
  moveKeyframe(keyframeId: string, newTime: number): void
  
  // Get all keyframes for property
  getKeyframes(layerId: string, property: string): Keyframe[]
  
  // Interpolate property value at specific time
  interpolate(layerId: string, property: string, time: number): any
  
  // Get interpolated state for all properties at time
  getStateAtTime(time: number): Record<string, any>
  
  // Set easing curve for keyframe pair
  setEasing(keyframe1Id: string, keyframe2Id: string, easing: EasingCurve): void
  
  // Play animation forward
  play(): void
  
  // Pause animation
  pause(): void
  
  // Seek to specific frame
  seek(time: number): void
  
  // Get current frame
  getCurrentFrame(): number
  
  // Get animation duration
  getDuration(): number
  
  // Preview animation rendering
  renderFrame(canvas: HTMLCanvasElement, time: number): void
  
  // Export animation to format
  export(format: 'css' | 'gsap' | 'lottie' | 'apng'): Promise<any>
}
```

**Constraints:**
- All interpolation must be smooth and accurate
- Support keyframe interpolation for: position, rotation, scale, opacity, colors, any numeric value
- Timing must be frame-accurate (no drifting)
- Handle edge cases: single keyframe, no easing, extreme values
- Performance: < 16ms per frame at 60 FPS

---

### 3. Keyframe Management (`lib/animation/keyframe.ts`)

**Purpose:** Keyframe data structures and operations.

**Required Functions:**

```typescript
// [Claude.A3] Keyframe structure and operations
interface Keyframe {
  id: string
  time: number // Frame number
  value: any
  easing?: EasingCurve
  tangentIn?: Tangent
  tangentOut?: Tangent
  type: 'linear' | 'ease' | 'cubic' | 'custom'
  locked: boolean
}

// Get keyframe value at time (interpolated)
function getValueAtTime(keyframes: Keyframe[], time: number): any

// Insert keyframe at time, interpolating between neighbors
function insertKeyframe(keyframes: Keyframe[], time: number, value?: any): Keyframe[]

// Remove keyframe
function removeKeyframe(keyframes: Keyframe[], keyframeId: string): Keyframe[]

// Shift keyframes after time
function shiftKeyframes(keyframes: Keyframe[], startTime: number, offset: number): Keyframe[]

// Get keyframes in range
function getKeyframesInRange(keyframes: Keyframe[], startTime: number, endTime: number): Keyframe[]

// Sort keyframes by time
function sortKeyframes(keyframes: Keyframe[]): Keyframe[]

// Copy keyframes with time offset
function copyKeyframes(keyframes: Keyframe[], timeOffset: number): Keyframe[]

// Reverse keyframe order and timing
function reverseKeyframes(keyframes: Keyframe[], duration: number): Keyframe[]
```

---

### 4. Easing Curves (`lib/animation/easing.ts`)

**Purpose:** Easing functions and Bézier curve interpolation.

**Required Easing Functions:**

```typescript
// [Claude.A3] Standard easing functions
type EasingFunction = (t: number) => number

// Linear (t = t)
const linear: EasingFunction = (t) => t

// Quadratic (t^2)
const easeInQuad: EasingFunction = (t) => t * t
const easeOutQuad: EasingFunction = (t) => 1 - (1 - t) * (1 - t)
const easeInOutQuad: EasingFunction = (t) => t < 0.5 ? 2 * t * t : -1 + 4 * t - 2 * t * t

// Cubic (t^3)
const easeInCubic: EasingFunction = (t) => t * t * t
const easeOutCubic: EasingFunction = (t) => 1 - (1 - t) ** 3
const easeInOutCubic: EasingFunction = (t) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

// Quartic (t^4)
const easeInQuart: EasingFunction = (t) => t * t * t * t
const easeOutQuart: EasingFunction = (t) => 1 - (1 - t) ** 4
const easeInOutQuart: EasingFunction = (t) => t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2

// Quintic (t^5)
// Sinusoidal
const easeInSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2)
const easeOutSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2)
const easeInOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2

// Exponential
const easeInExpo: EasingFunction = (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10)
const easeOutExpo: EasingFunction = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
const easeInOutExpo: EasingFunction = (t) => 
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2

// Circular
// Elastic
// Back (overshoot)
// Bounce (elastic bounce)

// [Claude.A3] Cubic Bézier curve interpolation
interface BezierCurve {
  p0: { x: number; y: number } // (0, 0)
  p1: { x: number; y: number } // Control point 1
  p2: { x: number; y: number } // Control point 2
  p3: { x: number; y: number } // (1, 1)
}

// Evaluate Bézier curve at t (0-1)
function evaluateBezier(curve: BezierCurve, t: number): number

// Create Bézier curve from control points
function createBezier(cp1: Point, cp2: Point): BezierCurve

// Get all preset easing curves
function getEasingPresets(): Record<string, EasingFunction>

// Visualize easing curve as path
function visualizeEasing(easing: EasingFunction, width: number, height: number): Path
```

**Constraints:**
- Bézier evaluation must be accurate (< 0.001 error)
- Support spring physics easing (mass, tension, friction)
- All easing functions normalized to [0,1] input/output
- Bezier tangent handles for custom curves

---

### 5. Graph Editor Component (`components/editor/panels/GraphEditor.tsx`)

**Purpose:** Interactive easing curve editor.

**Required Features:**

```typescript
// [Claude.A3] Graph editor for easing curves
export function GraphEditor() {
  return (
    <div className="flex flex-col gap-4">
      {/* Easing preset selector */}
      <select onChange={selectEasing}>
        <option value="linear">Linear</option>
        <option value="easeInQuad">Ease In Quad</option>
        <option value="easeOutQuad">Ease Out Quad</option>
        {/* All 25+ preset curves */}
      </select>
      
      {/* Canvas for curve visualization and editing */}
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border border-border bg-secondary"
      />
      
      {/* Tangent handle controls */}
      <div className="flex gap-2">
        <label>
          P1 X: <input type="number" value={cp1.x} onChange={updateCP1X} />
        </label>
        <label>
          P1 Y: <input type="number" value={cp1.y} onChange={updateCP1Y} />
        </label>
        <label>
          P2 X: <input type="number" value={cp2.x} onChange={updateCP2X} />
        </label>
        <label>
          P2 Y: <input type="number" value={cp2.y} onChange={updateCP2Y} />
        </label>
      </div>
      
      {/* Preview animation */}
      <button onClick={previewAnimation}>Preview</button>
    </div>
  )
}
```

**Interactions:**
- Drag control points (P1, P2) on canvas
- Visualize curve in real-time
- Show grid and guides
- Adjust via numeric input
- Preset library with quick access

---

### 6. Keyframe Editor Component (`components/editor/panels/KeyframeEditor.tsx`)

**Purpose:** Precise keyframe property editing.

**Required Features:**

```typescript
// [Claude.A3] Keyframe inspector
export function KeyframeEditor() {
  const selectedKeyframe = useEditorStore(s => s.selectedKeyframe)
  
  return (
    <div className="flex flex-col gap-4 p-4">
      {selectedKeyframe ? (
        <>
          <div>
            <label>Frame: </label>
            <input 
              type="number" 
              value={selectedKeyframe.time}
              onChange={(e) => updateKeyframeTime(e.target.value)}
            />
          </div>
          
          <div>
            <label>Value: </label>
            <input 
              type="text" 
              value={JSON.stringify(selectedKeyframe.value)}
              onChange={(e) => updateKeyframeValue(e.target.value)}
            />
          </div>
          
          <div>
            <label>Easing: </label>
            <select onChange={(e) => setEasing(e.target.value)}>
              <option value="linear">Linear</option>
              <option value="custom">Custom Bézier</option>
              {/* All easing options */}
            </select>
          </div>
          
          <div>
            <label>Keyframe Type: </label>
            <select onChange={(e) => setKeyframeType(e.target.value)}>
              <option value="linear">Linear</option>
              <option value="ease">Auto Ease</option>
              <option value="cubic">Cubic</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button onClick={deleteKeyframe}>Delete</button>
            <button onClick={copyKeyframe}>Copy</button>
            <button onClick={pasteKeyframe}>Paste</button>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Select a keyframe to edit</p>
      )}
    </div>
  )
}
```

---

### 7. Animation Hook (`hooks/useAnimation.ts`)

**Purpose:** Connect animation engine to React components.

**Required Hook:**

```typescript
// [Claude.A3] Main animation hook
function useAnimation(layerId: string) {
  // Get animation tracks for layer
  tracks: AnimationTrack[]
  
  // Add keyframe
  addKeyframe: (property: string, time: number, value: any) => void
  
  // Remove keyframe
  removeKeyframe: (keyframeId: string) => void
  
  // Update keyframe
  updateKeyframe: (keyframeId: string, value: any) => void
  
  // Play animation
  play: () => void
  
  // Pause animation
  pause: () => void
  
  // Seek to frame
  seek: (frame: number) => void
  
  // Get current frame
  currentFrame: number
  
  // Get animation duration
  duration: number
  
  // Is playing
  isPlaying: boolean
  
  // Undo/redo
  undo: () => void
  redo: () => void
  
  // Export
  export: (format: string) => Promise<any>
  
  return { tracks, addKeyframe, play, ... }
}
```

---

### 8. TypeScript Types (`lib/animation/types.ts`)

**Required Type Definitions:**

```typescript
// [Claude.A3] Core animation types
interface AnimationTrack {
  id: string
  layerId: string
  property: string // e.g. 'transform.position.x'
  keyframes: Keyframe[]
  duration: number
  loop: boolean
  loopCount?: number
}

interface Keyframe {
  id: string
  time: number
  value: any
  easing: EasingCurve
  type: 'linear' | 'ease' | 'cubic' | 'custom'
  locked: boolean
}

interface EasingCurve {
  type: 'preset' | 'bezier' | 'spring'
  preset?: string
  bezier?: { cp1: Point; cp2: Point }
  spring?: { mass: number; tension: number; friction: number }
}

interface Tangent {
  x: number
  y: number
}

interface AnimationExport {
  format: 'css' | 'gsap' | 'lottie' | 'apng'
  data: any
}

// No any types, all strict
```

---

### 9. Tests (`__tests__/animation.test.ts`)

**Test Coverage (70%+ required):**

```typescript
// [Claude.A3] Animation tests
describe('AnimationEngine', () => {
  test('interpolates between keyframes linearly')
  test('applies easing curve to interpolation')
  test('handles keyframe insertion at arbitrary time')
  test('preserves timing when moving keyframes')
  test('clips values at keyframe times')
})

describe('Easing', () => {
  test('all easing functions are normalized 0-1')
  test('bezier curve evaluation is accurate')
  test('spring physics produces smooth curves')
  test('preset curves match expected behavior')
})

describe('KeyframeManagement', () => {
  test('keyframes sort correctly by time')
  test('duplicate keyframes at same time allowed')
  test('getValueAtTime interpolates correctly')
  test('copyKeyframes preserves relative timing')
})

describe('Timeline', () => {
  test('playback advances frame correctly')
  test('seeking jumps to correct frame')
  test('duration calculated from longest track')
  test('loop behavior works correctly')
})
```

---

## Integration Points

### With Viewport (Claude.A5)
- Receive canvas context for animation preview
- Send animated geometry for rendering
- Support animation scrubbing updates

### With Geometry (Claude.A2)
- Animate geometry operation parameters
- Support mesh gradient animation
- Animate particle properties

### With State (V0.A1)
- Sync animation state to Zustand
- Support undo/redo through global state
- Update viewport on frame change

---

## Code Quality Standards (STRICT)

1. **Timing accuracy** — Frame-perfect, no drifting
2. **Smooth interpolation** — No popping or jumping
3. **Performance** — < 16ms per frame at 60 FPS
4. **Memory efficient** — No memory leaks during long animations
5. **Precise easing** — Match industry standard implementations
6. **Full TypeScript strict mode**
7. **JSDoc on all exports**
8. **70%+ test coverage**

---

## Submission Checklist

Before pushing:

- [ ] Timeline UI fully functional
- [ ] Keyframe interpolation accurate
- [ ] All 25+ easing curves implemented
- [ ] Graph editor working with Bézier curves
- [ ] 60 FPS playback achieved
- [ ] Frame-accurate seeking
- [ ] Animation preview in viewport
- [ ] Export formats working (CSS, GSAP)
- [ ] 70%+ test coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] All functions tagged with [Claude.A3]
- [ ] Git commit with detailed message
- [ ] Summary posted in communication_gate.md

Ready? Start building. This is gonna be beautiful.
