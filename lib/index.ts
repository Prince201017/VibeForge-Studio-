// [V0.A1] Master exports for all lib systems
// Barrel exports for easy imports across the project

// Geometry Engine
export * from './geometry/engine';
export * from './geometry/operations';
export * from './geometry/svg';
export * from './geometry/canvas';
export * from './geometry/types';
export { useGeometry } from './geometry/hook';

// Animation System
export * from './animation/engine';
export * from './animation/keyframe';
export * from './animation/easing';
export * from './animation/timeline';
export { useAnimation } from './animation/hook';

// AI Integration
export * from './ai/generator';
export * from './ai/analyzer';
export * from './ai/types';
export { useAI } from './ai/hook';

// Viewport Renderer
export * from './renderer/engine';
export * from './renderer/canvas-renderer';
export * from './renderer/webgl-renderer';
export * from './renderer/compositor';
export { useRenderer } from './renderer/hook';

// Particle System
export * from './particles/engine';
export * from './particles/emitter';
export * from './particles/physics';
export * from './particles/effects';
export { useParticles } from './particles/hook';

// Export Pipeline
export * from './export/engine';
export * from './export/exporters';
export * from './export/optimizer';
export { useExport } from './export/hook';

// Asset Manager
export * from './assets/manager';
export * from './assets/storage';
export * from './assets/search';
export { useAssets } from './assets/hook';

// Collaboration
export * from './collaboration/engine';
export * from './collaboration/sync';
export * from './collaboration/presence';
export { useCollaboration } from './collaboration/hook';

// Types
export * from './types';

// Store integration
export { useEditorStore } from '../lib/store';
