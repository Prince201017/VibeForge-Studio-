# Particle Engine [Claude.A6]

Built from INDEX.md bullet only ("1M+ particles, GPU, 20+ presets, 3500-4500 LOC") —
real `06_PARTICLE_ENGINE_NEEDS.md` not provided.

## Included
- Struct-of-arrays `ParticleBuffer` (cache-friendly, GPU-buffer-transferable), hard-capped, O(1) swap-remove compaction
- Composable force fields: gravity, drag, point attractor, turbulence
- Rate-based emitter with point/circle/line spawn shapes
- Simulation loop budgeted against the 16ms/frame SLA (`isWithinBudget()`)
- 10 fully-specified presets + notes on the remaining 10 to reach the 20+ target

## Honest limitation
"1M+ particles" implies a GPU compute path (WebGL transform-feedback or WebGPU compute
shaders) — this delivers the CPU simulation core with a SoA layout designed to be
GPU-buffer-compatible, but does not include the actual WebGL/WebGPU shader pipeline,
since that requires real spec detail (shader language target, buffer layout contract)
that wasn't provided.
