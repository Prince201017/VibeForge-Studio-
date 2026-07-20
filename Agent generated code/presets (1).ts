/**
 * [ParticleEngine] Preset library — 20+ ready-made particle system configs
 * covering the effect categories required by the spec (smoke, fire, dust,
 * sparks, rain, snow, magic, nebula, liquid, pixel, typography, logo,
 * portrait, geometry, procedural mesh, plus a few extra genre presets).
 *
 * Each preset is a factory function (rather than a static object) so callers
 * can parametrize origin position / primary color without deep-cloning.
 */

import type {
  EmitterConfig,
  ForceField,
  ParticleRenderSettings,
  ParticleSystemConfig,
  PropertyCurves,
  Vec3,
} from './types';

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function defaultRender(overrides: Partial<ParticleRenderSettings> = {}): ParticleRenderSettings {
  return {
    geometry: 'quad',
    blendMode: 'additive',
    softParticles: true,
    softParticleDistance: 0.5,
    depthSort: false,
    trails: { enabled: false, length: 0, fadeRate: 0.9 },
    hdrIntensity: 1,
    useGPU: true,
    lod: { enabled: true, distanceThresholds: [10, 30, 60], particleReductionFactors: [1, 0.5, 0.2] },
    ...overrides,
  };
}

function baseSystem(
  name: string,
  presetId: string,
  emitters: EmitterConfig[],
  forces: ForceField[],
  propertyCurves: PropertyCurves,
  render: ParticleRenderSettings,
  maxParticles = 50_000
): ParticleSystemConfig {
  const now = Date.now();
  return {
    id: uid('psys'),
    name,
    presetId,
    emitters,
    forces,
    collisions: { planes: [], spheres: [], boxes: [] },
    noise: [{ type: 'curl', frequency: 0.08, amplitude: 0.6 }],
    propertyCurves,
    render,
    maxParticles,
    simulationSpace: 'world',
    timeScale: 1,
    seed: 1337,
    createdAt: now,
    updatedAt: now,
  };
}

function pointEmitter(origin: Vec3, overrides: Partial<EmitterConfig> = {}): EmitterConfig {
  return {
    id: uid('emitter'),
    shape: 'point',
    position: origin,
    rateOverTime: [{ t: 0, rate: 50 }],
    bursts: [],
    maxParticlesPerFrame: 200,
    looping: true,
    duration: 1,
    spawn: {
      lifetime: [1, 2],
      speed: [0.5, 1.5],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.3,
      scale: [0.5, 1],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-1, 1],
      colorStart: { r: 255, g: 255, b: 255, a: 1 },
      colorVariance: 0.05,
    },
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Smoke
// ---------------------------------------------------------------------------

export function createSmokePreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'sphere',
    sphere: { radius: 0.3, surfaceOnly: false },
    rateOverTime: [{ t: 0, rate: 30 }],
    spawn: {
      lifetime: [3, 6],
      speed: [0.3, 0.8],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.4,
      scale: [1, 2],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-0.3, 0.3],
      colorStart: { r: 200, g: 200, b: 200, a: 0.5 },
      colorVariance: 0.05,
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'wind', enabled: true, strength: 0.2, direction: { x: 1, y: 0, z: 0 }, turbulence: 0.4 },
    { id: uid('f'), type: 'curlNoise', enabled: true, strength: 0.5 },
    { id: uid('f'), type: 'drag', enabled: true, strength: 0.1 },
  ];
  const curves: PropertyCurves = {
    scaleOverLife: [{ t: 0, value: 0.3 }, { t: 0.5, value: 1.5 }, { t: 1, value: 2.5 }],
    opacityOverLife: [{ t: 0, value: 0 }, { t: 0.2, value: 0.5 }, { t: 1, value: 0 }],
    colorOverLife: [
      { t: 0, color: { r: 220, g: 220, b: 220, a: 0.6 } },
      { t: 1, color: { r: 120, g: 120, b: 120, a: 0 } },
    ],
  };
  return baseSystem('Smoke', 'smoke', [emitter], forces, curves, defaultRender({ blendMode: 'normal', softParticles: true }));
}

// 2. Fire
export function createFirePreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'cylinder',
    cylinder: { radius: 0.25, height: 0.05 },
    rateOverTime: [{ t: 0, rate: 120 }],
    spawn: {
      lifetime: [0.6, 1.2],
      speed: [1, 2.5],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.25,
      scale: [0.4, 0.9],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-2, 2],
      colorStart: { r: 255, g: 200, b: 60, a: 1 },
      colorVariance: 0.02,
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: -0.3, direction: { x: 0, y: 1, z: 0 } },
    { id: uid('f'), type: 'curlNoise', enabled: true, strength: 1.2 },
  ];
  const curves: PropertyCurves = {
    scaleOverLife: [{ t: 0, value: 1 }, { t: 1, value: 0.1 }],
    opacityOverLife: [{ t: 0, value: 1 }, { t: 0.7, value: 0.8 }, { t: 1, value: 0 }],
    colorOverLife: [
      { t: 0, color: { r: 255, g: 255, b: 180, a: 1 } },
      { t: 0.3, color: { r: 255, g: 150, b: 30, a: 1 } },
      { t: 0.7, color: { r: 200, g: 40, b: 10, a: 0.8 } },
      { t: 1, color: { r: 40, g: 40, b: 40, a: 0 } },
    ],
  };
  return baseSystem('Fire', 'fire', [emitter], forces, curves, defaultRender({ blendMode: 'additive' }));
}

// 3. Dust
export function createDustPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 4, y: 0.1, z: 4 } },
    rateOverTime: [{ t: 0, rate: 15 }],
    spawn: {
      lifetime: [4, 8],
      speed: [0.02, 0.1],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 1.5,
      scale: [0.05, 0.15],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-0.1, 0.1],
      colorStart: { r: 200, g: 190, b: 160, a: 0.4 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: 0.02, direction: { x: 0, y: -1, z: 0 } },
    { id: uid('f'), type: 'wind', enabled: true, strength: 0.05, direction: { x: 1, y: 0, z: 0.2 }, turbulence: 0.1 },
  ];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0 }, { t: 0.3, value: 0.4 }, { t: 1, value: 0 }] };
  return baseSystem('Dust', 'dust', [emitter], forces, curves, defaultRender({ blendMode: 'normal' }));
}

// 4. Sparks
export function createSparksPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    rateOverTime: [{ t: 0, rate: 0 }],
    bursts: [{ time: 0, count: 60, cycles: 1 }],
    looping: false,
    duration: 1,
    spawn: {
      lifetime: [0.3, 0.8],
      speed: [3, 8],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: Math.PI,
      scale: [0.05, 0.15],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 255, g: 210, b: 100, a: 1 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: 4, direction: { x: 0, y: -1, z: 0 } },
    { id: uid('f'), type: 'drag', enabled: true, strength: 0.5 },
  ];
  const curves: PropertyCurves = {
    opacityOverLife: [{ t: 0, value: 1 }, { t: 1, value: 0 }],
    colorOverLife: [
      { t: 0, color: { r: 255, g: 240, b: 180, a: 1 } },
      { t: 1, color: { r: 255, g: 60, b: 20, a: 0 } },
    ],
    scaleOverLife: [{ t: 0, value: 1 }, { t: 1, value: 0.2 }],
  };
  return baseSystem('Sparks', 'sparks', [emitter], forces, curves, defaultRender({
    blendMode: 'additive', trails: { enabled: true, length: 8, fadeRate: 0.8 },
  }));
}

// 5. Rain
export function createRainPreset(origin: Vec3 = { x: 0, y: 5, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 10, y: 0.1, z: 10 } },
    rateOverTime: [{ t: 0, rate: 300 }],
    spawn: {
      lifetime: [1, 1.5],
      speed: [8, 10],
      direction: { x: 0, y: -1, z: 0 },
      directionSpread: 0.05,
      scale: [0.02, 0.04],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 180, g: 200, b: 230, a: 0.6 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'gravity', enabled: true, strength: 9.8, direction: { x: 0, y: -1, z: 0 } }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0.6 }, { t: 1, value: 0.6 }] };
  return baseSystem('Rain', 'rain', [emitter], forces, curves, defaultRender({
    blendMode: 'normal', trails: { enabled: true, length: 4, fadeRate: 0.6 },
  }), 100_000);
}

// 6. Snow
export function createSnowPreset(origin: Vec3 = { x: 0, y: 5, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 10, y: 0.1, z: 10 } },
    rateOverTime: [{ t: 0, rate: 60 }],
    spawn: {
      lifetime: [4, 8],
      speed: [0.2, 0.5],
      direction: { x: 0, y: -1, z: 0 },
      directionSpread: 0.6,
      scale: [0.05, 0.15],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-0.5, 0.5],
      colorStart: { r: 255, g: 255, b: 255, a: 0.9 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: 0.3, direction: { x: 0, y: -1, z: 0 } },
    { id: uid('f'), type: 'wind', enabled: true, strength: 0.15, direction: { x: 1, y: 0, z: 0 }, turbulence: 0.3 },
  ];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0 }, { t: 0.1, value: 0.9 }, { t: 1, value: 0.7 }] };
  return baseSystem('Snow', 'snow', [emitter], forces, curves, defaultRender({ blendMode: 'normal' }), 80_000);
}

// 7. Magic / energy
export function createMagicPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'sphere',
    sphere: { radius: 0.4, surfaceOnly: true },
    rateOverTime: [{ t: 0, rate: 80 }],
    spawn: {
      lifetime: [0.8, 1.6],
      speed: [0.3, 1],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: Math.PI,
      scale: [0.1, 0.3],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-3, 3],
      colorStart: { r: 140, g: 90, b: 255, a: 1 },
      colorVariance: 0.15,
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'vortex', enabled: true, strength: 1.5, position: origin, axis: { x: 0, y: 1, z: 0 }, radius: 2 },
    { id: uid('f'), type: 'attractor', enabled: true, strength: 0.3, position: origin, radius: 3 },
  ];
  const curves: PropertyCurves = {
    opacityOverLife: [{ t: 0, value: 0 }, { t: 0.2, value: 1 }, { t: 1, value: 0 }],
    scaleOverLife: [{ t: 0, value: 0.2 }, { t: 0.5, value: 1 }, { t: 1, value: 0 }],
    colorOverLife: [
      { t: 0, color: { r: 200, g: 150, b: 255, a: 1 } },
      { t: 1, color: { r: 60, g: 20, b: 140, a: 0 } },
    ],
  };
  return baseSystem('Magic Energy', 'magic', [emitter], forces, curves, defaultRender({
    blendMode: 'additive', trails: { enabled: true, length: 12, fadeRate: 0.85 },
  }));
}

// 8. Nebula / gas cloud
export function createNebulaPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'sphere',
    sphere: { radius: 3, surfaceOnly: false },
    rateOverTime: [{ t: 0, rate: 20 }],
    spawn: {
      lifetime: [8, 15],
      speed: [0.02, 0.08],
      direction: { x: 0, y: 0, z: 1 },
      directionSpread: Math.PI,
      scale: [2, 5],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-0.02, 0.02],
      colorStart: { r: 120, g: 80, b: 200, a: 0.15 },
      colorVariance: 0.3,
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'curlNoise', enabled: true, strength: 0.1 }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0 }, { t: 0.3, value: 0.2 }, { t: 1, value: 0 }] };
  return baseSystem('Nebula', 'nebula', [emitter], forces, curves, defaultRender({ blendMode: 'screen', softParticles: true }), 20_000);
}

// 9. Liquid
export function createLiquidPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'point',
    rateOverTime: [{ t: 0, rate: 0 }],
    bursts: [{ time: 0, count: 200 }],
    looping: false,
    duration: 3,
    spawn: {
      lifetime: [2, 3],
      speed: [1, 3],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.5,
      scale: [0.1, 0.2],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 60, g: 140, b: 255, a: 0.85 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'gravity', enabled: true, strength: 6, direction: { x: 0, y: -1, z: 0 } }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0.85 }, { t: 1, value: 0.85 }] };
  return baseSystem('Liquid', 'liquid', [emitter], forces, curves, defaultRender({
    blendMode: 'normal', geometry: 'sphere', softParticles: true,
  }), 30_000, );
}

// 10. Pixel particles
export function createPixelPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    rateOverTime: [{ t: 0, rate: 200 }],
    spawn: {
      lifetime: [0.5, 1.5],
      speed: [0.5, 2],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: Math.PI,
      scale: [1, 1],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 0, g: 255, b: 140, a: 1 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'gravity', enabled: true, strength: 1, direction: { x: 0, y: -1, z: 0 } }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 1 }, { t: 1, value: 0 }] };
  return baseSystem('Pixel', 'pixel', [emitter], forces, curves, defaultRender({ geometry: 'point', blendMode: 'additive' }));
}

// 11. Typography (spawn from text — expects caller to supply a mesh/image emitter)
export function createTypographyPreset(
  origin: Vec3 = { x: 0, y: 0, z: 0 },
  imageAlphaSrc?: string
): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'image',
    image: { src: imageAlphaSrc ?? '', alphaThreshold: 0.5, density: 4 },
    rateOverTime: [{ t: 0, rate: 400 }],
    spawn: {
      lifetime: [1, 2],
      speed: [0.1, 0.4],
      direction: { x: 0, y: 0, z: 1 },
      directionSpread: 0.5,
      scale: [0.05, 0.1],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 255, g: 255, b: 255, a: 1 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'curlNoise', enabled: true, strength: 0.3 }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 1 }, { t: 0.8, value: 1 }, { t: 1, value: 0 }] };
  return baseSystem('Typography', 'typography', [emitter], forces, curves, defaultRender({ blendMode: 'normal' }));
}

// 12. Logo particles
export function createLogoPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }, imageSrc?: string): ParticleSystemConfig {
  const preset = createTypographyPreset(origin, imageSrc);
  preset.name = 'Logo Particles';
  preset.presetId = 'logo';
  return preset;
}

// 13. Portrait particles (face-detection driven emission mask)
export function createPortraitPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }, imageSrc?: string): ParticleSystemConfig {
  const preset = createTypographyPreset(origin, imageSrc);
  preset.name = 'Portrait Particles';
  preset.presetId = 'portrait';
  preset.propertyCurves.colorOverLife = [
    { t: 0, color: { r: 255, g: 220, b: 190, a: 1 } },
    { t: 1, color: { r: 120, g: 90, b: 80, a: 0 } },
  ];
  return preset;
}

// 14. Geometry particles (spawn from shape outlines)
export function createGeometryPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'shape',
    rateOverTime: [{ t: 0, rate: 100 }],
    spawn: {
      lifetime: [1, 2],
      speed: [0.5, 1],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: Math.PI,
      scale: [0.2, 0.5],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-2, 2],
      colorStart: { r: 255, g: 255, b: 255, a: 1 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'gravity', enabled: true, strength: 0.5, direction: { x: 0, y: -1, z: 0 } }];
  const curves: PropertyCurves = { rotationOverLife: [{ t: 0, value: 0 }, { t: 1, value: Math.PI * 4 }] };
  return baseSystem('Geometry', 'geometry', [emitter], forces, curves, defaultRender({ geometry: 'mesh', blendMode: 'normal' }));
}

// 15. Procedural mesh particles
export function createProceduralMeshPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const preset = createGeometryPreset(origin);
  preset.name = 'Procedural Mesh Particles';
  preset.presetId = 'procedural-mesh';
  return preset;
}

// 16. Confetti (bonus genre preset)
export function createConfettiPreset(origin: Vec3 = { x: 0, y: 3, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    rateOverTime: [{ t: 0, rate: 0 }],
    bursts: [{ time: 0, count: 150 }],
    looping: false,
    duration: 4,
    spawn: {
      lifetime: [2, 4],
      speed: [2, 5],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: Math.PI,
      scale: [0.1, 0.2],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-5, 5],
      colorStart: { r: 255, g: 80, b: 120, a: 1 },
      colorVariance: 0.5,
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: 2, direction: { x: 0, y: -1, z: 0 } },
    { id: uid('f'), type: 'wind', enabled: true, strength: 0.3, direction: { x: 1, y: 0, z: 0 }, turbulence: 0.5 },
  ];
  const curves: PropertyCurves = { rotationOverLife: [{ t: 0, value: 0 }, { t: 1, value: Math.PI * 10 }] };
  return baseSystem('Confetti', 'confetti', [emitter], forces, curves, defaultRender({ geometry: 'quad', blendMode: 'normal' }));
}

// 17. Bubbles
export function createBubblesPreset(origin: Vec3 = { x: 0, y: -2, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 2, y: 0.1, z: 2 } },
    rateOverTime: [{ t: 0, rate: 20 }],
    spawn: {
      lifetime: [3, 6],
      speed: [0.3, 0.7],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.2,
      scale: [0.1, 0.3],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 180, g: 220, b: 255, a: 0.4 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: -0.5, direction: { x: 0, y: 1, z: 0 } },
    { id: uid('f'), type: 'curlNoise', enabled: true, strength: 0.15 },
  ];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0.4 }, { t: 0.9, value: 0.4 }, { t: 1, value: 0 }] };
  return baseSystem('Bubbles', 'bubbles', [emitter], forces, curves, defaultRender({ geometry: 'sphere', blendMode: 'screen' }));
}

// 18. Explosion
export function createExplosionPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    rateOverTime: [{ t: 0, rate: 0 }],
    bursts: [{ time: 0, count: 300 }],
    looping: false,
    duration: 2,
    spawn: {
      lifetime: [0.4, 1],
      speed: [4, 12],
      direction: { x: 0, y: 0, z: 0 },
      directionSpread: Math.PI,
      scale: [0.2, 0.5],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-5, 5],
      colorStart: { r: 255, g: 160, b: 40, a: 1 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'drag', enabled: true, strength: 1.2 },
    { id: uid('f'), type: 'gravity', enabled: true, strength: 3, direction: { x: 0, y: -1, z: 0 } },
  ];
  const curves: PropertyCurves = {
    colorOverLife: [
      { t: 0, color: { r: 255, g: 255, b: 200, a: 1 } },
      { t: 0.4, color: { r: 255, g: 120, b: 20, a: 1 } },
      { t: 1, color: { r: 40, g: 20, b: 20, a: 0 } },
    ],
    scaleOverLife: [{ t: 0, value: 1 }, { t: 1, value: 0.1 }],
  };
  return baseSystem('Explosion', 'explosion', [emitter], forces, curves, defaultRender({ blendMode: 'additive' }));
}

// 19. Waterfall
export function createWaterfallPreset(origin: Vec3 = { x: 0, y: 4, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'line',
    line: { start: { x: -1, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } },
    rateOverTime: [{ t: 0, rate: 250 }],
    spawn: {
      lifetime: [1, 1.5],
      speed: [3, 5],
      direction: { x: 0, y: -1, z: 0 },
      directionSpread: 0.1,
      scale: [0.05, 0.12],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 200, g: 225, b: 255, a: 0.7 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'gravity', enabled: true, strength: 9.8, direction: { x: 0, y: -1, z: 0 } }];
  const curves: PropertyCurves = { opacityOverLife: [{ t: 0, value: 0.7 }, { t: 1, value: 0.3 }] };
  return baseSystem('Waterfall', 'waterfall', [emitter], forces, curves, defaultRender({
    blendMode: 'screen', trails: { enabled: true, length: 6, fadeRate: 0.7 },
  }), 100_000);
}

// 20. Fireflies
export function createFirefliesPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 5, y: 2, z: 5 } },
    rateOverTime: [{ t: 0, rate: 8 }],
    spawn: {
      lifetime: [5, 10],
      speed: [0.05, 0.2],
      direction: { x: 0, y: 0, z: 0 },
      directionSpread: Math.PI,
      scale: [0.05, 0.1],
      rotation: [0, 0],
      angularVelocity: [0, 0],
      colorStart: { r: 220, g: 255, b: 120, a: 1 },
    },
  });
  const forces: ForceField[] = [{ id: uid('f'), type: 'curlNoise', enabled: true, strength: 0.2 }];
  const curves: PropertyCurves = {
    opacityOverLife: [{ t: 0, value: 0 }, { t: 0.5, value: 1 }, { t: 1, value: 0 }],
  };
  return baseSystem('Fireflies', 'fireflies', [emitter], forces, curves, defaultRender({ blendMode: 'additive' }));
}

// 21. Ash / embers
export function createAshPreset(origin: Vec3 = { x: 0, y: 0, z: 0 }): ParticleSystemConfig {
  const emitter = pointEmitter(origin, {
    shape: 'box',
    box: { size: { x: 2, y: 0.2, z: 2 } },
    rateOverTime: [{ t: 0, rate: 25 }],
    spawn: {
      lifetime: [3, 6],
      speed: [0.3, 1],
      direction: { x: 0, y: 1, z: 0 },
      directionSpread: 0.6,
      scale: [0.03, 0.08],
      rotation: [0, Math.PI * 2],
      angularVelocity: [-1, 1],
      colorStart: { r: 255, g: 120, b: 40, a: 1 },
    },
  });
  const forces: ForceField[] = [
    { id: uid('f'), type: 'gravity', enabled: true, strength: -0.15, direction: { x: 0, y: 1, z: 0 } },
    { id: uid('f'), type: 'wind', enabled: true, strength: 0.2, direction: { x: 1, y: 0, z: 0 }, turbulence: 0.5 },
  ];
  const curves: PropertyCurves = {
    colorOverLife: [
      { t: 0, color: { r: 255, g: 140, b: 40, a: 1 } },
      { t: 0.7, color: { r: 120, g: 40, b: 20, a: 0.6 } },
      { t: 1, color: { r: 40, g: 40, b: 40, a: 0 } },
    ],
  };
  return baseSystem('Ash / Embers', 'ash', [emitter], forces, curves, defaultRender({ blendMode: 'additive' }));
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PARTICLE_PRESETS = {
  smoke: createSmokePreset,
  fire: createFirePreset,
  dust: createDustPreset,
  sparks: createSparksPreset,
  rain: createRainPreset,
  snow: createSnowPreset,
  magic: createMagicPreset,
  nebula: createNebulaPreset,
  liquid: createLiquidPreset,
  pixel: createPixelPreset,
  typography: createTypographyPreset,
  logo: createLogoPreset,
  portrait: createPortraitPreset,
  geometry: createGeometryPreset,
  proceduralMesh: createProceduralMeshPreset,
  confetti: createConfettiPreset,
  bubbles: createBubblesPreset,
  explosion: createExplosionPreset,
  waterfall: createWaterfallPreset,
  fireflies: createFirefliesPreset,
  ash: createAshPreset,
} as const;

export type PresetName = keyof typeof PARTICLE_PRESETS;

export function instantiatePreset(name: PresetName, origin?: Vec3): ParticleSystemConfig {
  const factory = PARTICLE_PRESETS[name];
  return (factory as (o?: Vec3) => ParticleSystemConfig)(origin);
}

export function listPresetNames(): PresetName[] {
  return Object.keys(PARTICLE_PRESETS) as PresetName[];
}
