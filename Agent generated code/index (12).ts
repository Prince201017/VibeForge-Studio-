/**
 * [ParticleEngine] Public API surface for lib/particles.
 */

// Types
export * from './types';

// Core systems
export * from './engine';
export * from './emitter';
export * from './physics';
export * from './noise';
export * from './animator';
export * from './gpu';
export * from './presets';
export * from './store-integration';

// Hooks
export { useParticles } from './hooks/useParticles';
export { useEmitter } from './hooks/useEmitter';
export { usePhysics, createDefaultForce } from './hooks/usePhysics';
export { useParticlePreview } from './hooks/useParticlePreview';

// Components
export { ParticleSystemPanel } from './components/ParticleSystemPanel';
export { EmitterInspector } from './components/EmitterInspector';
export { PhysicsPanel } from './components/PhysicsPanel';
export { ParticlePresetSelector } from './components/ParticlePresetSelector';
export { ParticleVisualizer } from './components/ParticleVisualizer';
export { NoiseVisualizer } from './components/NoiseVisualizer';
export { PerformanceProfiler } from './components/PerformanceProfiler';
