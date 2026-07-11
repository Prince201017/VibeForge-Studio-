# Zustand State Contract - Single Source of Truth

**Version:** 1.0  
**Location:** `/lib/store.ts`  
**Status:** LOCKED (changes via communication_gate.md only)

---

## Editor Store Shape

All agents **MUST** interact with this state only via these mutations. Direct state manipulation is forbidden.

```typescript
// [V0.A1] Global editor store
interface EditorStore {
  // ─── Projects ───
  currentProjectId: string
  projects: Project[]
  
  // ─── Layers ───
  layers: Layer[]
  selectedLayerId: string | null
  layerOrder: string[]
  
  // ─── Viewport ───
  zoom: number
  pan: { x: number; y: number }
  showGrid: boolean
  renderMode: 'canvas' | 'webgl'
  
  // ─── Animation ───
  currentFrame: number
  totalFrames: number
  isPlaying: boolean
  fps: number
  
  // ─── History ───
  history: HistoryEntry[]
  historyIndex: number
  
  // ─── UI State ───
  panels: Record<string, boolean>
  selectedKeyframeId: string | null
  
  // ─── Mutations ───
  
  // Project management
  createProject(name: string): void
  deleteProject(id: string): void
  setCurrentProject(id: string): void
  updateProjectMeta(id: string, meta: Partial<Project>): void
  
  // Layer management
  addLayer(layer: Layer): void
  deleteLayer(id: string): void
  updateLayer(id: string, updates: Partial<Layer>): void
  selectLayer(id: string): void
  reorderLayers(oldIndex: number, newIndex: number): void
  
  // Geometry operations
  applyGeometry(layerId: string, geometry: Geometry): void
  
  // Animation management
  addKeyframe(layerId: string, property: string, frame: number, value: any): void
  removeKeyframe(keyframeId: string): void
  updateKeyframe(keyframeId: string, value: any): void
  
  // Viewport
  setZoom(zoom: number): void
  setPan(pan: { x: number; y: number }): void
  toggleGrid(): void
  setRenderMode(mode: 'canvas' | 'webgl'): void
  
  // Playback
  play(): void
  pause(): void
  seek(frame: number): void
  setFPS(fps: number): void
  
  // History
  undo(): void
  redo(): void
  recordHistory(action: string): void
  
  // UI
  togglePanel(panelName: string): void
  selectKeyframe(id: string | null): void
  
  // Utilities
  resetEditor(): void
  exportState(): Record<string, any>
  importState(state: Record<string, any>): void
}
```

---

## Mutation Rules (STRICT)

### 1. Layer Mutations
- Always use `updateLayer()` never direct assignment
- Include timestamp on every update
- Trigger history recording automatically
- Validate layer structure before commit

```typescript
// ✓ CORRECT
store.updateLayer(layerId, { opacity: 0.5 })
store.updateLayer(layerId, { geometry: newGeometry })

// ✗ WRONG - Direct mutation
store.layers[0].opacity = 0.5
```

### 2. Geometry Mutations
- Geometry changes must go through `applyGeometry()`
- Never mutate geometry object in place
- Always create new geometry object
- Trigger viewport re-render automatically

```typescript
// ✓ CORRECT
const newGeometry = { ...oldGeometry, paths: [...] }
store.applyGeometry(layerId, newGeometry)

// ✗ WRONG
geometry.paths.push(newPath)
```

### 3. Animation Mutations
- Use specific animation functions
- Don't manipulate keyframes directly
- Always validate keyframe time/value
- Update animation playback on changes

```typescript
// ✓ CORRECT
store.addKeyframe(layerId, 'transform.position.x', 30, 100)
store.updateKeyframe(keyframeId, 150)

// ✗ WRONG
layer.animation.keyframes.push({...})
```

### 4. Viewport Mutations
- Use dedicated pan/zoom setters
- Changes automatically trigger re-render
- Debounce rapid zoom/pan changes
- Maintain aspect ratio

```typescript
// ✓ CORRECT
store.setZoom(2.0)
store.setPan({ x: 100, y: 200 })

// ✗ WRONG
store.zoom = 2.0
store.pan = { x: 100, y: 200 }
```

### 5. History Tracking
- Every user action must call `recordHistory()`
- History entry must include: action name, timestamp, undo data
- Undo/redo must restore exact state
- Max 100 history entries (FIFO when exceeded)

```typescript
// [Claude.A2] Example: Geometry operation
store.applyGeometry(layerId, newGeometry)
store.recordHistory("Apply Voronoi to layer: " + layerId)

// [Claude.A3] Example: Animation change
store.updateKeyframe(keyframeId, newValue)
store.recordHistory("Update keyframe")
```

---

## Data Type Contracts

### Layer Type
```typescript
interface Layer {
  id: string                    // UUID
  name: string                  // "Layer 1", etc
  type: 'group' | 'shape' | 'image' | 'text' | 'video'
  visible: boolean              // Show/hide
  opacity: number               // 0-1
  blendMode: string             // "normal", "multiply", etc
  
  // Transform
  transform: Transform
  
  // Content (varies by type)
  geometry?: Geometry           // For shapes
  image?: { url: string; ...}   // For images
  text?: TextContent            // For text
  animation?: AnimationTrack    // If animated
  
  // Hierarchy
  parent: string | null         // Parent layer ID
  children: string[]            // Child layer IDs
  
  // Metadata
  locked: boolean               // Prevent editing
  metadata: Record<string, any> // Custom data
}
```

### Keyframe Type
```typescript
interface Keyframe {
  id: string
  time: number                  // Frame number
  value: any                    // Can be any type (number, string, array, object)
  easing: EasingCurve
  type: 'linear' | 'ease' | 'cubic' | 'custom'
  locked: boolean
}
```

### Animation Track
```typescript
interface AnimationTrack {
  layerId: string
  property: string              // Full path: "transform.position.x"
  keyframes: Keyframe[]
  duration: number              // In seconds
  loop: boolean
}
```

---

## Subscription Patterns

Agents subscribe to specific store slices:

```typescript
// [Claude.A3] Animation system subscribes to playback state
const { currentFrame, isPlaying } = useEditorStore(state => ({
  currentFrame: state.currentFrame,
  isPlaying: state.isPlaying
}))

// [Claude.A2] Geometry system subscribes to selected layer
const selectedLayer = useEditorStore(state => {
  return state.layers.find(l => l.id === state.selectedLayerId)
})

// [Claude.A5] Viewport subscribes to render settings
const { zoom, pan, renderMode } = useEditorStore(state => ({
  zoom: state.zoom,
  pan: state.pan,
  renderMode: state.renderMode
}))
```

---

## History Entry Format

```typescript
interface HistoryEntry {
  id: string
  timestamp: Date
  action: string                // Description of action
  snapshot: EditorStore         // Full state snapshot (for undo)
  sourceAgent: string           // [Claude.A2], [V0.A4], etc
}
```

---

## Mutation Sequence Example

**Scenario:** Claude.A2 applies Voronoi geometry to a layer

```typescript
// [Claude.A2] Geometry operation
async function applyVoronoi(layerId: string, params: VoronoiParams) {
  // 1. Validate
  const layer = store.layers.find(l => l.id === layerId)
  if (!layer) throw new Error("Layer not found")
  
  // 2. Process geometry (via Python service)
  const geometry = await fetch('/api/geometry/voronoi', { body: params })
  
  // 3. Update store
  store.updateLayer(layerId, { geometry })
  
  // 4. Record history
  store.recordHistory(`Applied Voronoi: ${params.point_count} points`)
  
  // 5. Viewport re-renders automatically (subscribed to layers)
}
```

---

## Forbidden Patterns

❌ DO NOT DO:

```typescript
// Never mutate directly
store.layers[0].opacity = 0.5

// Never bypass mutations
store.setState({ zoom: 2.0 })

// Never modify layer geometry in place
layer.geometry.paths.push(...)

// Never skip history recording
store.updateLayer(id, updates)  // Missing: recordHistory()

// Never manipulate history directly
store.history.push(...)

// Never use setTimeout for state updates
setTimeout(() => store.updateLayer(...), 100)
```

---

## Testing State Mutations

All agents must test their store interactions:

```typescript
// [Agent] Test mutation
describe('StateContract', () => {
  test('updateLayer triggers history recording', () => {
    const before = store.history.length
    store.updateLayer(layerId, { opacity: 0.5 })
    const after = store.history.length
    expect(after).toBe(before + 1)
  })
  
  test('undo restores previous layer state', () => {
    const original = store.layers[0].opacity
    store.updateLayer(layers[0].id, { opacity: 0.5 })
    store.undo()
    expect(store.layers[0].opacity).toBe(original)
  })
})
```

---

## Summary

**All agents must:**
1. Use ONLY the provided mutation functions
2. Never mutate state directly
3. Always record history for user actions
4. Subscribe to specific state slices
5. Validate inputs before mutations
6. Test state interactions

**Violating this contract breaks undo/redo and breaks collaboration.**
