# Claude.A5 - Viewport Renderer Specification

**Agent:** Claude.A5  
**Task:** Viewport Rendering - Canvas/WebGL Real-time Rendering, Export  
**LOC Target:** 2500-3500 lines  
**Complexity:** High  
**Files:** 8-10  
**Timeline:** Phase 1 (5 days)

---

## Executive Summary

Build the real-time viewport rendering engine that displays geometry, animations, and effects in real-time. Support both Canvas 2D and WebGL rendering paths. Optimize for 60 FPS performance and handle complex layer compositions.

**Key Deliverables:**
- Viewport Canvas component with pan/zoom
- Canvas 2D rendering pipeline
- WebGL rendering for complex scenes
- Real-time animation playback
- Export rendering (MP4, PNG sequences, APNG)
- Performance optimization and culling
- Responsive and retina-display support

---

## File Structure & Responsibilities

```
components/editor/Viewport.tsx (500 LOC)
├─ Main viewport component
├─ Canvas setup and initialization
├─ Pan/zoom controls
├─ Grid and guides
├─ Selection overlay
└─ [Claude.A5] tag

lib/renderer/canvas-renderer.ts (800 LOC)
├─ Canvas 2D rendering pipeline
├─ Layer composition
├─ Geometry rendering
├─ Animation playback
├─ Effects and filters
├─ Performance monitoring

lib/renderer/webgl-renderer.ts (800 LOC)
├─ WebGL rendering pipeline
├─ Shader compilation
├─ Geometry batching
├─ Lighting and materials
├─ Post-processing
├─ GPU memory management

lib/renderer/render-engine.ts (500 LOC)
├─ Render engine abstraction
├─ Renderer selection logic
├─ Frame loop management
├─ Viewport state
├─ Export coordination

lib/renderer/export.ts (400 LOC)
├─ Export pipeline
├─ Video rendering (FFmpeg integration)
├─ Image sequence export
├─ GIF/APNG generation
├─ Canvas snapshot

lib/renderer/performance.ts (300 LOC)
├─ Performance profiling
├─ GPU usage monitoring
├─ FPS counter
├─ Memory usage tracking
├─ Optimization suggestions

hooks/useViewport.ts (400 LOC)
├─ Viewport hook
├─ Pan/zoom state
├─ Rendering loop
├─ Frame callback
├─ Export functions

lib/renderer/types.ts (300 LOC)
├─ TypeScript interfaces
├─ Renderer types
├─ Export options
├─ Performance metrics

__tests__/renderer.test.ts (400 LOC)
├─ Unit tests for rendering
├─ Performance benchmarks
├─ Export tests
└─ 70%+ coverage
```

---

## Detailed Requirements

### 1. Viewport Component (`components/editor/Viewport.tsx`)

**Purpose:** Main canvas rendering area.

**Requirements:**

```typescript
// [Claude.A5] Main viewport component
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // State from Zustand
  const layers = useEditorStore(s => s.layers)
  const currentFrame = useEditorStore(s => s.currentFrame)
  const zoom = useEditorStore(s => s.zoom)
  const pan = useEditorStore(s => s.pan)
  const selectedLayerId = useEditorStore(s => s.selectedLayerId)
  const showGrid = useEditorStore(s => s.showGrid)
  const renderMode = useEditorStore(s => s.renderMode) // 'canvas' | 'webgl'
  
  const { renderFrame } = useViewport()
  
  useEffect(() => {
    if (!canvasRef.current) return
    
    // Setup WebGL context if needed
    if (renderMode === 'webgl') {
      const gl = canvasRef.current.getContext('webgl2')
      // Initialize WebGL
    } else {
      const ctx = canvasRef.current.getContext('2d')
      // Initialize Canvas 2D
    }
    
    // Start render loop
    const loop = () => {
      renderFrame(canvasRef.current, currentFrame)
      requestAnimationFrame(loop)
    }
    loop()
  }, [renderMode])
  
  // Pan/zoom controls
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(zoom + delta)
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (e.buttons === 4) { // Middle mouse
      setPan({
        x: pan.x + e.movementX / zoom,
        y: pan.y + e.movementY / zoom
      })
    }
  }
  
  return (
    <div
      ref={containerRef}
      className="flex-1 bg-grid relative overflow-hidden"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={containerRef.current?.offsetWidth || 1920}
        height={containerRef.current?.offsetHeight || 1080}
      />
      
      {/* Selection overlay for selected layer */}
      {selectedLayerId && (
        <SelectionOverlay
          layer={findLayer(selectedLayerId)}
          zoom={zoom}
          pan={pan}
        />
      )}
      
      {/* Grid overlay */}
      {showGrid && <GridOverlay zoom={zoom} pan={pan} />}
      
      {/* Performance monitor */}
      <PerformanceMonitor fps={fps} memory={memory} />
    </div>
  )
}
```

**Constraints:**
- 60 FPS performance
- Smooth pan/zoom
- Retina display support (@2x)
- Responsive to window resize
- No memory leaks

---

### 2. Canvas 2D Renderer (`lib/renderer/canvas-renderer.ts`)

**Purpose:** 2D canvas rendering pipeline.

**Required Class:**

```typescript
// [Claude.A5] Canvas 2D renderer
class Canvas2DRenderer {
  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.width = canvas.width
    this.height = canvas.height
  }
  
  // [Claude.A5] Main render function
  render(
    layers: Layer[],
    time: number,
    options: RenderOptions
  ): void {
    // Clear canvas
    this.ctx.fillStyle = "white"
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // Apply transforms
    this.ctx.save()
    this.ctx.scale(options.zoom, options.zoom)
    this.ctx.translate(options.pan.x, options.pan.y)
    
    // Render layers in order
    for (const layer of layers) {
      this.renderLayer(layer, time, options)
    }
    
    this.ctx.restore()
  }
  
  // [Claude.A5] Render single layer
  private renderLayer(layer: Layer, time: number, options: RenderOptions): void {
    if (!layer.visible) return
    
    this.ctx.save()
    
    // Apply layer transforms
    this.applyTransform(layer.transform)
    this.ctx.globalAlpha = layer.opacity
    this.ctx.globalCompositeOperation = layer.blendMode
    
    // Render based on type
    switch (layer.type) {
      case 'shape':
        this.renderShape(layer)
        break
      case 'image':
        this.renderImage(layer)
        break
      case 'text':
        this.renderText(layer)
        break
      case 'group':
        for (const child of layer.children) {
          this.renderLayer(child, time, options)
        }
        break
    }
    
    // Apply animation if exists
    if (layer.animation) {
      const animatedValue = interpolateAnimation(layer.animation, time)
      this.applyAnimationState(layer, animatedValue)
    }
    
    this.ctx.restore()
  }
  
  // [Claude.A5] Render geometry shape
  private renderShape(layer: Layer): void {
    if (!layer.geometry) return
    
    const { paths, fill, stroke } = layer.geometry
    
    for (const path of paths) {
      this.ctx.beginPath()
      this.drawPath(path)
      
      if (fill) {
        this.ctx.fillStyle = fill.color
        this.ctx.fill()
      }
      
      if (stroke) {
        this.ctx.strokeStyle = stroke.color
        this.ctx.lineWidth = stroke.width
        this.ctx.stroke()
      }
    }
  }
  
  // [Claude.A5] Draw SVG path
  private drawPath(path: Path): void {
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M': // moveTo
          this.ctx.moveTo(cmd.x, cmd.y)
          break
        case 'L': // lineTo
          this.ctx.lineTo(cmd.x, cmd.y)
          break
        case 'C': // cubicBezierCurveTo
          this.ctx.bezierCurveTo(cmd.cp1x, cmd.cp1y, cmd.cp2x, cmd.cp2y, cmd.x, cmd.y)
          break
        case 'Q': // quadraticBezierCurveTo
          this.ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y)
          break
        case 'Z': // closePath
          this.ctx.closePath()
          break
      }
    }
  }
  
  // [Claude.A5] Render image layer
  private renderImage(layer: Layer): void {
    if (!layer.image) return
    
    const img = new Image()
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, layer.width, layer.height)
    }
    img.src = layer.image.url
  }
  
  // [Claude.A5] Render text layer
  private renderText(layer: Layer): void {
    if (!layer.text) return
    
    this.ctx.font = `${layer.text.size}px ${layer.text.family}`
    this.ctx.fillStyle = layer.text.color
    this.ctx.textAlign = layer.text.align
    this.ctx.fillText(layer.text.content, 0, 0)
  }
  
  // [Claude.A5] Apply layer transform
  private applyTransform(transform: Transform): void {
    this.ctx.translate(transform.position.x, transform.position.y)
    this.ctx.rotate(transform.rotation)
    this.ctx.scale(transform.scale.x, transform.scale.y)
    this.ctx.skewX(transform.skewX)
    this.ctx.skewY(transform.skewY)
  }
  
  // Performance: < 16ms per frame
  // Support: Geometry, animations, filters, blend modes
}
```

---

### 3. WebGL Renderer (`lib/renderer/webgl-renderer.ts`)

**Purpose:** Optimized GPU-accelerated rendering.

**Required Class:**

```typescript
// [Claude.A5] WebGL renderer
class WebGLRenderer {
  gl: WebGL2RenderingContext
  program: WebGLProgram
  
  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl2')!
    this.program = this.createShaderProgram()
  }
  
  // [Claude.A5] Render layers using WebGL
  render(
    layers: Layer[],
    time: number,
    options: RenderOptions
  ): void {
    const gl = this.gl
    
    // Clear screen
    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    
    // Use shader program
    gl.useProgram(this.program)
    
    // Set camera transform
    const projection = mat4.ortho(
      0, this.gl.canvas.width,
      0, this.gl.canvas.height,
      -1, 1
    )
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, 'projection'),
      false,
      projection
    )
    
    // Render layers
    for (const layer of layers) {
      if (layer.visible) {
        this.renderLayer(layer, time, options)
      }
    }
  }
  
  // [Claude.A5] Render single layer
  private renderLayer(layer: Layer, time: number, options: RenderOptions): void {
    // Geometry batching for performance
    // Material/shader setup
    // Draw call
  }
  
  // [Claude.A5] Create shader program
  private createShaderProgram(): WebGLProgram {
    const vertexShader = `#version 300 es
      precision highp float;
      
      in vec3 position;
      in vec3 color;
      
      uniform mat4 projection;
      uniform mat4 model;
      
      out vec3 vColor;
      
      void main() {
        gl_Position = projection * model * vec4(position, 1.0);
        vColor = color;
      }
    `
    
    const fragmentShader = `#version 300 es
      precision highp float;
      
      in vec3 vColor;
      
      out vec4 outColor;
      
      void main() {
        outColor = vec4(vColor, 1.0);
      }
    `
    
    return this.compileShaderProgram(vertexShader, fragmentShader)
  }
  
  private compileShaderProgram(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!
    gl.shaderSource(vertShader, vs)
    gl.compileShader(vertShader)
    
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(fragShader, fs)
    gl.compileShader(fragShader)
    
    const program = gl.createProgram()!
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    
    return program
  }
  
  // Performance: < 16ms per frame
  // Support: GPU batching, instancing, LOD
}
```

---

### 4. Export Pipeline (`lib/renderer/export.ts`)

**Purpose:** Export rendered frames to video/image formats.

**Required Functions:**

```typescript
// [Claude.A5] Export pipeline
class ExportPipeline {
  // [Claude.A5] Export to MP4 video
  async exportToMP4(
    viewport: Viewport,
    duration: number,
    fps: number,
    options: ExportOptions
  ): Promise<Blob> {
    // Render all frames
    const frames: Canvas = []
    for (let frame = 0; frame < duration * fps; frame++) {
      const canvas = await this.renderFrame(viewport, frame / fps)
      frames.push(canvas)
    }
    
    // Encode with FFmpeg
    const ffmpeg = new FFmpeg()
    const blob = await ffmpeg.encodeToMP4(frames, fps)
    return blob
  }
  
  // [Claude.A5] Export to PNG sequence
  async exportToPNGSequence(
    viewport: Viewport,
    duration: number,
    fps: number
  ): Promise<Blob[]> {
    const frames: Blob[] = []
    for (let frame = 0; frame < duration * fps; frame++) {
      const canvas = await this.renderFrame(viewport, frame / fps)
      frames.push(this.canvasToPNG(canvas))
    }
    return frames
  }
  
  // [Claude.A5] Export to APNG (animated PNG)
  async exportToAPNG(
    viewport: Viewport,
    duration: number,
    fps: number
  ): Promise<Blob> {
    const frames: Blob[] = []
    for (let frame = 0; frame < duration * fps; frame++) {
      const canvas = await this.renderFrame(viewport, frame / fps)
      frames.push(this.canvasToPNG(canvas))
    }
    return this.encodeAPNG(frames, 1000 / fps)
  }
  
  // [Claude.A5] Export to SVG
  async exportToSVG(viewport: Viewport): Promise<string> {
    const svg = `<svg width="${viewport.width}" height="${viewport.height}">
      ${viewport.layers.map(l => this.layerToSVG(l)).join('')}
    </svg>`
    return svg
  }
  
  // [Claude.A5] Render single frame
  private async renderFrame(viewport: Viewport, time: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    const renderer = new Canvas2DRenderer(canvas)
    renderer.render(viewport.layers, time, { zoom: 1, pan: { x: 0, y: 0 } })
    
    return canvas
  }
  
  // [Claude.A5] Convert canvas to PNG
  private canvasToPNG(canvas: HTMLCanvasElement): Blob {
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png')
    })
  }
  
  // Performance: Parallel frame rendering
  // Support: Progressive encoding, streaming export
}
```

---

## Performance Optimization

### Critical Requirements:

1. **60 FPS Minimum**
   - Render loop: < 16ms per frame
   - All updates: < 16ms
   - No frame drops during animation

2. **Memory Efficiency**
   - Layer culling (only render visible)
   - Texture atlasing for WebGL
   - Canvas pooling for export

3. **GPU Optimization**
   - Batch geometry rendering
   - Use instancing for repeated shapes
   - Minimize state changes

4. **Responsive Design**
   - Handle window resize
   - Retina display (@2x)
   - Support various canvas sizes

---

## Code Quality Standards (STRICT)

1. **Performance-first design** — Every operation must be benchmarked
2. **No memory leaks** — All resources properly cleaned up
3. **GPU memory managed** — Textures and buffers released
4. **Comprehensive profiling** — FPS counter, memory monitor
5. **Full TypeScript strict mode**
6. **JSDoc on all exports**
7. **70%+ test coverage**

---

## Submission Checklist

Before pushing:

- [ ] 60 FPS rendering achieved
- [ ] Canvas 2D pipeline complete
- [ ] WebGL pipeline optimized
- [ ] Export to MP4, PNG, APNG working
- [ ] Pan/zoom smooth and responsive
- [ ] Animation playback synchronized
- [ ] Retina display supported
- [ ] No memory leaks detected
- [ ] Performance profiling active
- [ ] 70%+ test coverage
- [ ] All functions tagged with [Claude.A5]
- [ ] Git commit with detailed message
- [ ] Summary posted in communication_gate.md

Let's make this viewport beautiful and blazingly fast.
