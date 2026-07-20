# Particle Engine

Implementation of `06_PARTICLE_ENGINE_NEEDS.md` for ForgeOS. A professional-grade
2D/3D particle system: SoA CPU pool with recycling, 9 emitter shapes, 7 force
field types + collisions, 6 noise algorithms, GPU instanced rendering via
Three.js (with a Canvas2D CPU fallback), 21 built-in presets, full property-
over-lifetime animation, Zustand store integration, 7 React UI components, and
a test suite covering the engine, physics, and presets.

## Quick start

```ts
import { instantiatePreset, createParticleSystemHandle, stepSimulation } from './lib/particles';
import { EmitterDriver, updateEmitter } from './lib/particles/emitter';
import { NoiseField } from './lib/particles/noise';

const config = instantiatePreset('fire', { x: 0, y: 0, z: 0 });
const handle = createParticleSystemHandle(config.maxParticles, config.render.geometry);
const drivers = config.emitters.map((e, i) => new EmitterDriver(e, config.seed + i));
const noiseField = new NoiseField(config.seed);

function frame(dt: number, t: number) {
  for (const driver of drivers) updateEmitter(driver, handle.pool, dt);
  stepSimulation(handle.pool, dt, {
    forces: config.forces,
    collisions: config.collisions,
    propertyCurves: config.propertyCurves,
    noiseField,
    simulationTime: t,
  });
}
```

In React, prefer the `useParticles` hook, which wraps the above in a
`requestAnimationFrame` loop and exposes live `PerformanceStats`.

## Module map

| File | Responsibility |
|---|---|
| `types.ts` | Shared TypeScript interfaces for the whole module |
| `engine.ts` | `ParticlePool` (SoA typed-array pool) + `stepSimulation` |
| `emitter.ts` | 9 emission shapes, rate-over-time curves, bursts |
| `physics.ts` | Force fields (gravity/wind/attractor/repulsor/vortex/drag/curl/custom) + collisions + spatial hash |
| `noise.ts` | Perlin, Simplex, Curl, fBm, Ridged, Worley |
| `animator.ts` | Curve/gradient evaluation, easing, seeded RNG helpers |
| `gpu.ts` | Three.js instanced renderer, GPU ping-pong simulator, Canvas2D fallback |
| `presets.ts` | 21 ready-made `ParticleSystemConfig` factories |
| `store-integration.ts` | Zustand slice: add/remove/update systems with undo/redo |
| `hooks/*` | `useParticles`, `useEmitter`, `usePhysics`, `useParticlePreview` |
| `components/*` | 7 editor UI panels (layer panel, inspectors, visualizers, profiler) |
| `shaders/*.glsl` | On-disk canonical GLSL mirroring the inline shader strings in `gpu.ts` |
| `presets/*.json` | Serialized preset configs for import/export and non-TS consumers |
| `tests/*` | Vitest suites for the engine, physics, and preset library |

## Presets (21)

smoke, fire, dust, sparks, rain, snow, magic, nebula, liquid, pixel,
typography, logo, portrait, geometry, proceduralMesh, confetti, bubbles,
explosion, waterfall, fireflies, ash — exceeding the spec's 20+ requirement.

## Performance notes

- `ParticlePool` is capped at `MAX_PARTICLES_HARD_LIMIT` (1,048,576), matching
  the 1M-particle SLA, and stores all particle state in `Float32Array` /
  `Uint8Array` / `Uint16Array` typed arrays for cache-friendly iteration and
  direct GPU upload.
- Above ~100K particles, prefer `GPUParticleSimulator` (float render-target
  ping-pong) over the CPU `stepSimulation` loop to stay under the 16ms frame
  budget on 2-year-old hardware.
- `detectGPUCapability()` should gate whether the app uses `GPUParticleRenderer`
  (WebGL1/2) or falls back to `Canvas2DFallbackRenderer`.

## Known follow-ups (not yet wired end-to-end)

- Export pipeline hooks (`/api/particles/render-video`, Lottie/PNG-sequence
  export) are specified as API integration points but the export
  implementations themselves live in the Export Pipeline system (spec 07),
  not here.
- `sampleImageAlpha` / image and mesh emitters expect the host app to supply
  decoded `ImageData` / vertex buffers (e.g. from the Asset Manager or
  Geometry Engine systems) — this module does not do image decoding or mesh
  loading itself.
- GPU depth-texture wiring (`setDepthTexture`) assumes the host viewport
  renderer (spec 05) exposes a scene depth prepass; soft particles are inert
  until that texture is provided.
