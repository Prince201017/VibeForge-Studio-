/**
 * [ParticleEngine] physics.test.ts — unit tests for force field evaluation,
 * collision resolution, and the spatial hash grid.
 */

import { describe, it, expect } from 'vitest';
import { evaluateForce, resolveCollisions, SpatialHashGrid } from '../physics';
import { NoiseField } from '../noise';
import type { ForceField, CollisionConfig } from '../types';

const noiseField = new NoiseField(42);

describe('evaluateForce', () => {
  it('returns zero acceleration for a disabled force', () => {
    const force: ForceField = { id: 'f1', type: 'gravity', enabled: false, strength: 9.8, direction: { x: 0, y: -1, z: 0 } };
    const acc = evaluateForce(force, 0, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('computes gravity acceleration along the configured direction', () => {
    const force: ForceField = { id: 'f2', type: 'gravity', enabled: true, strength: 9.8, direction: { x: 0, y: -1, z: 0 } };
    const acc = evaluateForce(force, 0, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc.y).toBeCloseTo(-9.8, 5);
    expect(acc.x).toBe(0);
  });

  it('attracts a particle toward the attractor position', () => {
    const force: ForceField = {
      id: 'f3',
      type: 'attractor',
      enabled: true,
      strength: 5,
      position: { x: 10, y: 0, z: 0 },
      radius: 0, // infinite falloff mode
    };
    const acc = evaluateForce(force, 0, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc.x).toBeGreaterThan(0); // pulled toward +x
  });

  it('repulsor pushes a particle away from its position', () => {
    const force: ForceField = {
      id: 'f4',
      type: 'repulsor',
      enabled: true,
      strength: 5,
      position: { x: 10, y: 0, z: 0 },
      radius: 0,
    };
    const acc = evaluateForce(force, 0, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc.x).toBeLessThan(0); // pushed toward -x, away from attractor at +10
  });

  it('respects radius falloff — zero acceleration outside radius', () => {
    const force: ForceField = {
      id: 'f5',
      type: 'attractor',
      enabled: true,
      strength: 5,
      position: { x: 100, y: 0, z: 0 },
      radius: 5,
    };
    const acc = evaluateForce(force, 0, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('drag opposes velocity direction', () => {
    const force: ForceField = { id: 'f6', type: 'drag', enabled: true, strength: 0.5, dragCoefficient: 0.5 };
    const acc = evaluateForce(force, 0, 0, 0, 3, 0, 0, 0, noiseField);
    expect(acc.x).toBeLessThan(0);
  });

  it('vortex produces a tangential acceleration around the axis', () => {
    const force: ForceField = {
      id: 'f7',
      type: 'vortex',
      enabled: true,
      strength: 2,
      position: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 1, z: 0 },
      radius: 10,
    };
    const acc = evaluateForce(force, 1, 0, 0, 0, 0, 0, 0, noiseField);
    // Tangential force should be perpendicular to the radial vector (mostly z component here)
    expect(Math.abs(acc.z)).toBeGreaterThan(0);
  });

  it('custom force field invokes the supplied function', () => {
    const force: ForceField = {
      id: 'f8',
      type: 'custom',
      enabled: true,
      strength: 1,
      customFn: (p) => ({ x: p.x * 2, y: 0, z: 0 }),
    };
    const acc = evaluateForce(force, 3, 0, 0, 0, 0, 0, 0, noiseField);
    expect(acc.x).toBe(6);
  });
});

describe('resolveCollisions', () => {
  it('detects no collision when far from all primitives', () => {
    const config: CollisionConfig = { planes: [], spheres: [], boxes: [] };
    const result = resolveCollisions(config, 0, 0, 0, 1, 1, 1);
    expect(result.collided).toBe(false);
  });

  it('bounces a particle off a ground plane', () => {
    const config: CollisionConfig = {
      planes: [{ point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, bounce: 0.8, friction: 0 }],
      spheres: [],
      boxes: [],
    };
    const result = resolveCollisions(config, 0, -0.1, 0, 0, -5, 0);
    expect(result.collided).toBe(true);
    expect(result.velocity.y).toBeGreaterThan(0); // reflected upward
  });

  it('kills a particle when killOnCollide is set', () => {
    const config: CollisionConfig = {
      planes: [{ point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, bounce: 1, friction: 0 }],
      spheres: [],
      boxes: [],
      killOnCollide: true,
    };
    const result = resolveCollisions(config, 0, -0.1, 0, 0, -5, 0);
    expect(result.killed).toBe(true);
  });

  it('resolves a sphere collision by reflecting velocity along the normal', () => {
    const config: CollisionConfig = {
      planes: [],
      spheres: [{ center: { x: 0, y: 0, z: 0 }, radius: 1, bounce: 0.5, friction: 0 }],
      boxes: [],
    };
    const result = resolveCollisions(config, 0.5, 0, 0, 5, 0, 0);
    expect(result.collided).toBe(true);
    expect(result.velocity.x).toBeLessThan(0);
  });

  it('resolves a box collision on the nearest face', () => {
    const config: CollisionConfig = {
      planes: [],
      spheres: [],
      boxes: [{ min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 }, bounce: 1, friction: 0 }],
    };
    const result = resolveCollisions(config, 0.9, 0, 0, 5, 0, 0);
    expect(result.collided).toBe(true);
  });
});

describe('SpatialHashGrid', () => {
  it('returns inserted indices within the same neighborhood', () => {
    const grid = new SpatialHashGrid(1);
    grid.insert(0, 0.1, 0.1, 0.1);
    grid.insert(1, 0.9, 0.9, 0.9);
    grid.insert(2, 50, 50, 50); // far away, different cell
    const nearby = grid.query(0, 0, 0);
    expect(nearby).toContain(0);
    expect(nearby).toContain(1);
    expect(nearby).not.toContain(2);
  });

  it('clear() empties the grid', () => {
    const grid = new SpatialHashGrid(1);
    grid.insert(0, 0, 0, 0);
    grid.clear();
    expect(grid.query(0, 0, 0)).toHaveLength(0);
  });
});
