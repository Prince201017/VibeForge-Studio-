// [V0.A1] Master exports for all lib systems
// All generated code is in lib/utils/

// Core utilities and engines
export * from './utils/geometry';
export * from './utils/operations';
export * from './utils/engine';
export * from './utils/timeline';
export * from './utils/easing';
export * from './utils/animation';
export * from './utils/canvas-renderer';
export * from './utils/physics';
export * from './utils/forces';
export * from './utils/simulation';
export * from './utils/sync-engine';
export * from './utils/operational-transform';
export * from './utils/presence';
export * from './utils/export';
export * from './utils/formats';
export * from './utils/css-generator';
export * from './utils/gsap-generator';
export * from './utils/framer-motion-generator';
export * from './utils/tailwind-generator';
export * from './utils/validators';
export * from './utils/presets';
export * from './utils/particles';

// Custom hooks
export { useGeometry } from './utils/hooks';
export { useAnimation } from './utils/hooks';
export { useParticles } from './utils/useParticles';
export { usePhysics } from './utils/usePhysics';
export { useKeyboard } from './utils/useKeyboard';
export { useMediaQuery } from './utils/useMediaQuery';
export { useClickOutside } from './utils/useClickOutside';
export { useDebounce } from './utils/useDebounce';
export { useTimeout } from './utils/useTimeout';
export { useEmitter } from './utils/useEmitter';

// Types
export * from './types';
export * from './utils/types';

// Store integration
export { useEditorStore } from './store';
export { keyboardManager } from './keyboard';
