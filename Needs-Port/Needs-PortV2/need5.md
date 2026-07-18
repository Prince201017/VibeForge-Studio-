# NEED 5: PARTICLE SYSTEM - GPU Particle Engine & Effects

## System Overview
High-performance GPU particle engine with 1M+ particles support. Includes 20+ pre-built effects (fire, smoke, rain, snow, magic, nebula, etc).

## What Goes In This System
- GPU particle engine (instanced rendering)
- 20+ pre-built particle effects
- Physics simulation (gravity, turbulence, attraction)
- Particle emitters (mesh, image, SVG based)
- Trail and glow effects
- Custom particle shaders

## Files to Create
- `lib/particles/engine.ts` - Core particle engine
- `lib/particles/effects.ts` - 20+ effect definitions
- `lib/particles/emitters.ts` - Emitter types
- `lib/particles/physics.ts` - Physics simulation
- `lib/particles/shaders.ts` - Custom shaders
- `lib/particles/types.ts` - Type definitions
- `lib/particles/hook.ts` - React hook (useParticles)
- `components/particles/ParticlePanel.tsx` - UI panel
- `python-service/routes/particles.py` - Export routes
- `tests/particles.test.ts` - Tests (70%+ coverage)

## LOC Target: 3500-4500 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: 1M+ particles at 60 FPS

## Pre-built Effects (20+)
1. Fire (orange flames)
2. Smoke (gray diffusion)
3. Dust (light particles)
4. Sparks (electric)
5. Snowfall (gravity)
6. Rain (fast falling)
7. Magic (colorful sparkles)
8. Nebula (cosmic clouds)
9. Galaxy (orbital particles)
10. Flowing ribbons
11. Liquid splash
12. Pixel burst
13. Typography particles
14. Logo particles
15. Portrait particles (face detection)
16. Geometry particles
17. Procedural mesh particles
18. Metaballs
19. Boids flocking
20. Wind field simulation

## Physics Features
- Gravity direction and strength
- Turbulence (Perlin noise)
- Curl noise
- Attraction/repulsion fields
- Vortex systems
- Collision detection
- Velocity curves
- Spawn lifetime control

## Emitter Types
- Point emitter
- Mesh emitter
- Image emitter (from pixels)
- SVG emitter
- Video emitter
- Volumetric emitter

## API Endpoints
- GET /api/particles/effects - List effects
- POST /api/particles/render - Generate particle video
- GET /api/particles/presets - Get presets
- POST /api/particles/export - Export as JSON/video

## State Integration
Use Zustand store:
- `editorStore.addParticleEmitter()`
- `editorStore.updateParticles()`
- `editorStore.deleteParticles()`
- Real-time viewport particle rendering

## Export Formats
- Video (MP4, WebM)
- Sprite sheet (PNG)
- GIF animation
- APNG animation
- JSON (particle data)

## Deliverables Checklist
- GPU particle engine working
- All 20+ effects implemented
- 1M+ particles at 60 FPS
- All emitter types working
- Physics simulation accurate
- Custom shaders working
- Trail effects working
- Glow/bloom effects working
- All export formats working
- UI panel functional
- All tests passing
- Performance benchmarks met
- JSDoc complete
