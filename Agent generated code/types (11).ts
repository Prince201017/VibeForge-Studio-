/**
 * [ParticleEngine] Core type definitions for the particle system.
 *
 * These types are shared across engine.ts, emitter.ts, physics.ts, noise.ts,
 * gpu.ts, presets.ts, animator.ts and the Zustand store integration.
 */

// ---------------------------------------------------------------------------
// Primitive math types
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

/** A single keyframe on a numeric curve, t in [0,1] representing normalized life. */
export interface CurveKeyframe {
  t: number;
  value: number;
  /** Optional easing applied from the PREVIOUS keyframe to this one. */
  easing?: EasingFunction;
}

export type EasingFunction =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'step';

/** A gradient over particle lifetime for colors. */
export interface ColorStop {
  t: number; // 0-1
  color: RGBA;
}

// ---------------------------------------------------------------------------
// Particle data
// ---------------------------------------------------------------------------

/**
 * Logical (non-SoA) view of a single particle. The engine internally stores
 * particles in Struct-of-Arrays form (see ParticlePool) for cache efficiency
 * and GPU upload, but this shape is used for spawning, presets, and any
 * CPU-side inspection / debugging.
 */
export interface ParticleSpawnOptions {
  position: Vec3;
  velocity: Vec3;
  acceleration?: Vec3;
  rotation?: number; // radians
  angularVelocity?: number;
  scale?: number;
  color?: RGBA;
  opacity?: number;
  lifetime: number; // seconds
  seed?: number;
  textureIndex?: number;
  mass?: number;
  groupId?: number;
}

export type BlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

export type ParticleGeometry = 'point' | 'quad' | 'sphere' | 'mesh';

// ---------------------------------------------------------------------------
// Emitters
// ---------------------------------------------------------------------------

export type EmitterShape =
  | 'point'
  | 'line'
  | 'mesh'
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'svgPath'
  | 'image'
  | 'shape';

export interface EmissionCurvePoint {
  t: number; // normalized time along emitter's own timeline, 0-1 loop
  rate: number; // particles per second at this point
}

export interface BurstEvent {
  time: number; // seconds since emitter start
  count: number;
  cycles?: number; // repeat N times
  interval?: number; // seconds between repeats
  probability?: number; // 0-1 chance the burst fires
}

export interface EmitterConfig {
  id: string;
  shape: EmitterShape;
  /** World-space transform origin of the emitter. */
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;

  // Shape-specific parameters
  line?: { start: Vec3; end: Vec3 };
  box?: { size: Vec3 };
  sphere?: { radius: number; surfaceOnly?: boolean };
  cylinder?: { radius: number; height: number };
  svgPath?: { d: string; density: number };
  image?: { src: string; alphaThreshold: number; density: number };
  meshEmission?: { vertices: Float32Array; indices: Uint32Array };

  // Emission behavior
  rateOverTime: EmissionCurvePoint[]; // at least 1 point
  bursts: BurstEvent[];
  maxParticlesPerFrame: number;
  looping: boolean;
  duration: number; // seconds, ignored if looping

  // Spawn randomization
  spawn: {
    lifetime: [number, number];
    speed: [number, number];
    direction: Vec3; // base direction, normalized
    directionSpread: number; // radians cone half-angle
    scale: [number, number];
    rotation: [number, number];
    angularVelocity: [number, number];
    colorStart: RGBA;
    colorVariance?: number; // 0-1 HSL jitter
  };

  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Physics / forces
// ---------------------------------------------------------------------------

export type ForceFieldType =
  | 'gravity'
  | 'wind'
  | 'attractor'
  | 'repulsor'
  | 'vortex'
  | 'drag'
  | 'curlNoise'
  | 'custom';

export interface ForceField {
  id: string;
  type: ForceFieldType;
  enabled: boolean;
  strength: number;
  position?: Vec3; // for attractor/repulsor/vortex
  radius?: number; // falloff radius, 0 = infinite
  direction?: Vec3; // for gravity/wind
  turbulence?: number; // wind jitter amount
  axis?: Vec3; // for vortex
  dragCoefficient?: number;
  /** For 'custom': (position, velocity, t) => acceleration */
  customFn?: (p: Vec3, v: Vec3, t: number) => Vec3;
}

export interface CollisionPlane {
  point: Vec3;
  normal: Vec3;
  bounce: number; // 0-1 restitution
  friction: number; // 0-1
}

export interface CollisionSphere {
  center: Vec3;
  radius: number;
  bounce: number;
  friction: number;
}

export interface CollisionBox {
  min: Vec3;
  max: Vec3;
  bounce: number;
  friction: number;
}

export interface CollisionConfig {
  planes: CollisionPlane[];
  spheres: CollisionSphere[];
  boxes: CollisionBox[];
  stickOnCollide?: boolean;
  killOnCollide?: boolean;
}

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

export type NoiseType = 'perlin' | 'simplex' | 'curl' | 'fbm' | 'ridged' | 'worley' | 'custom';

export interface NoiseConfig {
  type: NoiseType;
  frequency: number;
  amplitude: number;
  octaves?: number; // for fbm/ridged
  lacunarity?: number;
  persistence?: number;
  seed?: number;
}

// ---------------------------------------------------------------------------
// Property-over-lifetime animation
// ---------------------------------------------------------------------------

export interface PropertyCurves {
  colorOverLife?: ColorStop[];
  scaleOverLife?: CurveKeyframe[];
  rotationOverLife?: CurveKeyframe[];
  opacityOverLife?: CurveKeyframe[];
  velocityDamping?: CurveKeyframe[];
  sizeByVelocity?: CurveKeyframe[];
  colorByVelocity?: ColorStop[];
  rotationByVelocity?: CurveKeyframe[];
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export interface ParticleRenderSettings {
  geometry: ParticleGeometry;
  blendMode: BlendMode;
  softParticles: boolean;
  softParticleDistance: number;
  depthSort: boolean;
  trails: {
    enabled: boolean;
    length: number;
    fadeRate: number;
  };
  textureAtlas?: {
    src: string;
    columns: number;
    rows: number;
    frameCount: number;
    animated: boolean;
  };
  hdrIntensity: number;
  useGPU: boolean;
  lod: {
    enabled: boolean;
    distanceThresholds: number[]; // world units
    particleReductionFactors: number[]; // 0-1 per threshold
  };
}

// ---------------------------------------------------------------------------
// Full particle system definition (as stored in Zustand)
// ---------------------------------------------------------------------------

export interface ParticleSystemConfig {
  id: string;
  name: string;
  presetId?: string;
  emitters: EmitterConfig[];
  forces: ForceField[];
  collisions: CollisionConfig;
  noise: NoiseConfig[];
  propertyCurves: PropertyCurves;
  render: ParticleRenderSettings;
  maxParticles: number;
  simulationSpace: 'local' | 'world';
  timeScale: number;
  seed: number;
  createdAt: number;
  updatedAt: number;
}

export interface PerformanceStats {
  activeParticles: number;
  fps: number;
  frameTimeMs: number;
  gpuMemoryMB: number;
  drawCalls: number;
  cullCount: number;
}
