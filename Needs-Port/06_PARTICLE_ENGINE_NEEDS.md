# Particle Engine Needs

## Scope
Professional-grade particle system rivaling VFX software (Houdini, Cinema 4D, After Effects). 2D and 3D particle physics, GPU acceleration, turbulence fields, emitter systems, and 20+ preset effect types.

## Target
- 3500-4500 LOC in TypeScript
- Support 1M+ particles at 60 FPS on GPU
- CPU fallback for older browsers
- Full GPU compute pipeline with WebGL compute shaders

## Core Systems Required

### 1. Particle Engine Core (800 LOC)
- Particle pool management with recycling
- Life cycle management (spawn, age, death)
- Property tracking (position, velocity, acceleration, rotation, scale, color, opacity, age)
- Delta time integration
- Particle groups and instancing
- Type-safe particle data structures
- Batch operations for CPU-based particles

### 2. Emitter System (600 LOC)
- Point emitters
- Line emitters (ribbon trails)
- Mesh emitters (emission from surface)
- Volume emitters (box, sphere, cylinder)
- SVG path emitters
- Image-based emitters (emit from image alpha)
- Shape emitters with density control
- Emission rate over time curves
- Burst emission events
- Per-frame spawn limiting

### 3. Physics Engine (800 LOC)
- Gravity simulation
- Wind forces with turbulence
- Attraction fields (pull particles to points)
- Repulsion fields (push particles away)
- Vortex forces
- Drag and friction
- Damping curves
- Collision detection (plane, sphere, box, mesh)
- Bounce and stick behaviors
- Custom force fields (mathematical functions)

### 4. Turbulence & Noise (600 LOC)
- Perlin noise implementation
- Simplex noise (faster)
- Curl noise (smooth flow fields)
- Fractal Brownian motion (fBm)
- Ridged multi-fractal
- Cellular noise (Worley)
- Custom noise function support
- Noise field evaluation
- Spatial smoothing

### 5. GPU Rendering (900 LOC)
- WebGL compute shader particle updates
- GPU transform feedback (older approach)
- Instanced rendering of particles
- Dynamic texture atlasing
- Depth sorting for transparency
- Additive and multiplicative blending modes
- Soft particles (fade near surfaces)
- Particle trails and ribbons
- Custom particle geometry (point, quad, sphere, mesh)
- HDR lighting for particles

### 6. Particle Types & Presets (700 LOC)
- Smoke particles (turbulent diffusion)
- Fire/flame particles (color gradient over life)
- Dust particles (slow settling)
- Sparks (fast moving, colored trails)
- Rain/water droplets
- Snow particles (floating, accumulation)
- Magic/energy effects (glowing, trail)
- Nebula/gas clouds (volumetric)
- Liquid particles (cohesion, surface tension)
- Pixel particles
- Typography particles (spawn from text)
- Logo particles (spawn from image)
- Portrait particles (spawn from face detection)
- Geometry particles (spawn from shapes)
- Procedural particle meshes (simple shapes)

### 7. Properties & Animation (700 LOC)
- Particle color over lifetime curve
- Scale over lifetime
- Rotation over lifetime
- Opacity fade in/out
- Velocity damping curve
- Size by velocity
- Color by velocity
- Rotation by velocity
- Spawn position randomization
- Spawn velocity randomization
- Spawn size randomization
- Spawn color randomization
- Property lanes in timeline editor

### 8. State Integration (400 LOC)
- Particle system as layer type in Zustand store
- Emitter configuration in state
- Physics parameters in state
- Particle renderer settings in state
- History tracking for particle systems
- Undo/redo for particle edits
- Export particle state as JSON

### 9. UI Components (600 LOC)
- Particle system layer panel (shows emitters, physics, renderer settings)
- Emitter property inspector (position, rate, velocity, lifetime)
- Physics property panel (gravity, wind, attraction, turbulence)
- Particle type selector (dropdown with 20+ presets)
- Noise function visualizer
- Force field visualizer
- Particle count meter (real-time)
- Performance profiler (FPS, GPU usage)
- Emitter gizmo in viewport (visual editor)

### 10. Export Support (300 LOC)
- Export particle system as Lottie animation
- Export as PNG sequence
- Export as MP4 video
- Export as WebM video
- Export as APNG
- Export particle JSON config
- Import particle presets

### 11. Performance & Optimization (500 LOC)
- Particle pooling with growth strategy
- Spatial hashing for collision detection
- Distance culling (don't render far particles)
- Particle sort only when needed
- GPU memory management
- Texture atlas generation
- Batch rendering
- LOD system (reduce particles at distance)
- Memory leak prevention

### 12. Testing & Documentation (400 LOC)
- Unit tests for particle physics
- Tests for force fields
- GPU shader compilation tests
- Performance benchmarks
- Demo scenes (10+ particle effects)
- Particle presets library
- JSDoc on all particle functions
- Example particle animations

## File Structure
```
lib/particles/
├── engine.ts (particle pool, lifecycle, updates)
├── emitter.ts (all emitter types)
├── physics.ts (forces, gravity, wind, attraction)
├── noise.ts (Perlin, Simplex, Curl, fBm)
├── gpu.ts (WebGL compute, instancing, rendering)
├── presets.ts (20+ built-in particle types)
├── animator.ts (lifetime curves, properties)
├── types.ts (TypeScript interfaces)
├── store-integration.ts (Zustand hooks)
├── hooks/
│   ├── useParticles.ts
│   ├── useEmitter.ts
│   ├── usePhysics.ts
│   └── useParticlePreview.ts
├── components/
│   ├── ParticleSystemPanel.tsx
│   ├── EmitterInspector.tsx
│   ├── PhysicsPanel.tsx
│   ├── ParticlePresetSelector.tsx
│   ├── ParticleVisualizer.tsx
│   ├── NoiseVisualizer.tsx
│   └── PerformanceProfiler.tsx
├── shaders/
│   ├── particle-update.glsl
│   ├── particle-render.glsl
│   ├── particle-trail.glsl
│   └── particle-soft.glsl
├── tests/
│   ├── engine.test.ts
│   ├── physics.test.ts
│   ├── gpu.test.ts
│   └── presets.test.ts
└── presets/
    ├── smoke.json
    ├── fire.json
    ├── sparks.json
    ├── rain.json
    └── (20+ more)
```

## Complexity Levels

### Level 1: CPU-Based Particles (MVP)
- Basic point particles
- Simple gravity and wind forces
- Additive blending
- 100K particles max at 60 FPS

### Level 2: GPU Acceleration
- WebGL compute shader updates
- 1M particles at 60 FPS
- Advanced physics (vortex, curl noise)
- Soft particles with depth

### Level 3: Advanced Features
- Mesh emitters and collision
- Custom force fields
- Particle trails and ribbons
- GPU memory management
- Spatial hashing optimization

## Performance Targets (Hard SLAs)
- 100K particles: < 8ms per frame
- 500K particles: < 14ms per frame
- 1M particles: < 16ms per frame
- Emitter spawn: < 1ms overhead
- GPU shader compilation: < 500ms

## Dependencies
- Three.js for WebGL
- math3d for vector operations
- GLSL shader compilation

## API Integration Points
- `/api/particles/simulate` - server-side physics simulation
- `/api/particles/render-video` - video export
- `/api/particles/analyze-reference` - AI-powered particle effect extraction
- State: Zustand store mutations for particle layers

## Quality Standards
- 70%+ unit test coverage
- Zero TypeScript errors
- JSDoc on all exports
- [AgentName] tags in code
- Memory profiling results
- GPU usage metrics
- Performance benchmark suite

## Constraints
- Must work on 2-year-old hardware
- No WebGPU (use WebGL fallback)
- Browser compatibility: Chrome, Firefox, Safari, Edge (latest 2 versions)
- File size < 300KB gzipped

## Deliverables Checklist
- Particle engine with 1M+ support
- All 20+ preset effects functional
- UI panels for emitter/physics/render
- Export to video/image/Lottie
- Full test coverage
- Performance benchmarks
- Documentation + examples
