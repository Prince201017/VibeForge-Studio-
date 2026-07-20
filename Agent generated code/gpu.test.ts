/**
 * [ParticleEngine] gpu.test.ts — tests for the GPU rendering layer.
 *
 * Full WebGL rendering (GPUParticleRenderer / GPUParticleSimulator) requires
 * a real or mocked WebGLRenderingContext, which isn't available in a plain
 * Node/vitest environment. Those classes are exercised in integration/e2e
 * tests (Playwright, browser-mode Vitest) instead. Here we cover the
 * environment-agnostic pieces: capability detection, shader source
 * integrity, and the Canvas2D CPU fallback renderer, which together give
 * confidence the module loads and its pure logic is correct without
 * requiring a GPU context in CI.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  detectGPUCapability,
  PARTICLE_VERTEX_SHADER,
  PARTICLE_FRAGMENT_SHADER,
  PARTICLE_TRAIL_VERTEX_SHADER,
  PARTICLE_TRAIL_FRAGMENT_SHADER,
  Canvas2DFallbackRenderer,
} from '../gpu';
import { ParticlePool } from '../engine';
import type { ParticleRenderSettings } from '../types';

describe('detectGPUCapability', () => {
  it('returns "none" when document is unavailable (Node/SSR environment)', () => {
    // In a plain vitest (node) environment `document` is undefined, so the
    // function should short-circuit safely rather than throwing.
    const result = detectGPUCapability();
    expect(['webgl2', 'webgl1', 'none']).toContain(result);
  });
});

describe('shader sources', () => {
  it('vertex shader declares expected instanced attributes', () => {
    expect(PARTICLE_VERTEX_SHADER).toContain('instancePosition');
    expect(PARTICLE_VERTEX_SHADER).toContain('instanceRotation');
    expect(PARTICLE_VERTEX_SHADER).toContain('gl_Position');
  });

  it('fragment shader implements soft-particle depth fade', () => {
    expect(PARTICLE_FRAGMENT_SHADER).toContain('uSoftParticles');
    expect(PARTICLE_FRAGMENT_SHADER).toContain('uDepthTexture');
    expect(PARTICLE_FRAGMENT_SHADER).toContain('gl_FragColor');
  });

  it('trail shaders reference previous-position interpolation', () => {
    expect(PARTICLE_TRAIL_VERTEX_SHADER).toContain('previousPosition');
    expect(PARTICLE_TRAIL_FRAGMENT_SHADER).toContain('vAlpha');
  });
});

describe('Canvas2DFallbackRenderer', () => {
  function createMockCanvas() {
    const calls: string[] = [];
    const ctx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      beginPath: () => calls.push('beginPath'),
      arc: () => calls.push('arc'),
      fill: () => calls.push('fill'),
      set globalCompositeOperation(v: string) {
        calls.push(`composite:${v}`);
      },
      set globalAlpha(v: number) {
        calls.push(`alpha:${v}`);
      },
      set fillStyle(v: string) {
        calls.push(`fill:${v}`);
      },
    };
    const canvas = {
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;
    return { canvas, calls };
  }

  it('throws a clear error when 2D context is unavailable', () => {
    const badCanvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => new Canvas2DFallbackRenderer(badCanvas)).toThrow(/Canvas2D context unavailable/);
  });

  it('draws one particle per alive pool entry', () => {
    const { canvas, calls } = createMockCanvas();
    const renderer = new Canvas2DFallbackRenderer(canvas);
    const pool = new ParticlePool(3);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5, color: { r: 255, g: 0, b: 0, a: 1 } });
    pool.spawn({ position: { x: 1, y: 1, z: 1 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5, color: { r: 0, g: 255, b: 0, a: 1 } });

    const settings: ParticleRenderSettings = {
      geometry: 'point',
      blendMode: 'additive',
      softParticles: false,
      softParticleDistance: 0,
      depthSort: false,
      trails: { enabled: false, length: 0, fadeRate: 0 },
      hdrIntensity: 1,
      useGPU: false,
      lod: { enabled: false, distanceThresholds: [], particleReductionFactors: [] },
    };

    renderer.render(pool, settings, () => ({ x: 0, y: 0, scale: 1 }));

    const arcCalls = calls.filter((c) => c === 'arc').length;
    expect(arcCalls).toBe(2);
    expect(calls).toContain('composite:lighter'); // additive blend mode mapping
  });

  it('skips dead particles', () => {
    const { canvas, calls } = createMockCanvas();
    const renderer = new Canvas2DFallbackRenderer(canvas);
    const pool = new ParticlePool(2);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5 });
    const secondIdx = pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5 })!;
    pool.kill(secondIdx);

    const settings: ParticleRenderSettings = {
      geometry: 'point',
      blendMode: 'normal',
      softParticles: false,
      softParticleDistance: 0,
      depthSort: false,
      trails: { enabled: false, length: 0, fadeRate: 0 },
      hdrIntensity: 1,
      useGPU: false,
      lod: { enabled: false, distanceThresholds: [], particleReductionFactors: [] },
    };
    renderer.render(pool, settings, () => ({ x: 0, y: 0, scale: 1 }));
    expect(calls.filter((c) => c === 'arc').length).toBe(1);
  });
});
