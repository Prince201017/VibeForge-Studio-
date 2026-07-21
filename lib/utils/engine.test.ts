/**
 * [ParticleEngine] engine.test.ts — unit tests for ParticlePool lifecycle
 * and stepSimulation integration.
 */

import { describe, it, expect } from 'vitest';
import { ParticlePool, stepSimulation, createParticleSystemHandle, MAX_PARTICLES_HARD_LIMIT } from '../engine';
import { NoiseField } from '../noise';
import type { SimulationContext } from '../engine';

function emptyContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    forces: [],
    collisions: { planes: [], spheres: [], boxes: [] },
    propertyCurves: {},
    noiseField: new NoiseField(1),
    simulationTime: 0,
    ...overrides,
  };
}

describe('ParticlePool', () => {
  it('spawns particles up to capacity and returns null when exhausted', () => {
    const pool = new ParticlePool(4);
    for (let i = 0; i < 4; i++) {
      const idx = pool.spawn({
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        lifetime: 1,
      });
      expect(idx).not.toBeNull();
    }
    const overflow = pool.spawn({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      lifetime: 1,
    });
    expect(overflow).toBeNull();
  });

  it('recycles indices from killed particles', () => {
    const pool = new ParticlePool(1);
    const first = pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 1 });
    expect(first).toBe(0);
    pool.kill(0);
    const second = pool.spawn({ position: { x: 1, y: 1, z: 1 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 1 });
    expect(second).toBe(0);
    expect(pool.positionX[0]).toBe(1);
  });

  it('throws when constructed above the hard particle limit', () => {
    expect(() => new ParticlePool(MAX_PARTICLES_HARD_LIMIT + 1)).toThrow();
  });

  it('tracks activeCount accurately as particles are spawned and killed', () => {
    const pool = new ParticlePool(10);
    for (let i = 0; i < 5; i++) {
      pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5 });
    }
    expect(pool.activeCount).toBe(5);
    pool.kill(2);
    expect(pool.activeCount).toBe(4);
  });

  it('reset() clears all particles and frees the pool', () => {
    const pool = new ParticlePool(5);
    for (let i = 0; i < 5; i++) pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5 });
    pool.reset();
    expect(pool.activeCount).toBe(0);
    const idx = pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 5 });
    expect(idx).toBe(0);
  });
});

describe('stepSimulation', () => {
  it('ages particles and kills them once age exceeds lifetime', () => {
    const pool = new ParticlePool(1);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 1 });
    stepSimulation(pool, 0.5, emptyContext());
    expect(pool.alive[0]).toBe(1);
    stepSimulation(pool, 0.6, emptyContext());
    expect(pool.alive[0]).toBe(0);
  });

  it('integrates position using velocity via semi-implicit Euler', () => {
    const pool = new ParticlePool(1);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 0, z: 0 }, lifetime: 10 });
    stepSimulation(pool, 1, emptyContext());
    expect(pool.positionX[0]).toBeCloseTo(1, 5);
  });

  it('applies gravity force to accelerate a particle downward', () => {
    const pool = new ParticlePool(1);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 10, mass: 1 });
    const ctx = emptyContext({
      forces: [{ id: 'g', type: 'gravity', enabled: true, strength: 9.8, direction: { x: 0, y: -1, z: 0 } }],
    });
    stepSimulation(pool, 1, ctx);
    expect(pool.velocityY[0]).toBeCloseTo(-9.8, 3);
  });

  it('does not process particles beyond the iteration bound', () => {
    const pool = new ParticlePool(100);
    pool.spawn({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, lifetime: 10 });
    expect(pool.iterationBound).toBe(1);
  });
});

describe('createParticleSystemHandle', () => {
  it('creates a handle with a pool of the requested capacity', () => {
    const handle = createParticleSystemHandle(1000, 'quad');
    expect(handle.pool.capacity).toBe(1000);
    expect(handle.geometry).toBe('quad');
  });
});
