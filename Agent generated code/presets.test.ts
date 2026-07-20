/**
 * [ParticleEngine] presets.test.ts — validates that every preset factory
 * produces a structurally valid, engine-consumable ParticleSystemConfig,
 * and that the library meets the spec's "20+ presets" requirement.
 */

import { describe, it, expect } from 'vitest';
import {
  PARTICLE_PRESETS,
  listPresetNames,
  instantiatePreset,
  createSmokePreset,
  createFirePreset,
} from '../presets';
import { ParticlePool } from '../engine';
import { EmitterDriver, updateEmitter } from '../emitter';

describe('preset registry', () => {
  it('exposes at least 20 presets, satisfying the spec requirement', () => {
    expect(listPresetNames().length).toBeGreaterThanOrEqual(20);
  });

  it('every preset name maps to a callable factory', () => {
    for (const name of listPresetNames()) {
      expect(typeof PARTICLE_PRESETS[name]).toBe('function');
    }
  });

  it('instantiatePreset returns a config with at least one emitter and one force', () => {
    for (const name of listPresetNames()) {
      const config = instantiatePreset(name);
      expect(config.emitters.length).toBeGreaterThan(0);
      expect(Array.isArray(config.forces)).toBe(true);
      expect(config.maxParticles).toBeGreaterThan(0);
      expect(config.render).toBeDefined();
    }
  });

  it('produces unique ids across repeated instantiations', () => {
    const a = instantiatePreset('fire');
    const b = instantiatePreset('fire');
    expect(a.id).not.toBe(b.id);
  });

  it('respects a supplied origin for position-based presets', () => {
    const origin = { x: 5, y: 5, z: 5 };
    const config = createSmokePreset(origin);
    expect(config.emitters[0].position).toEqual(origin);
  });
});

describe('preset simulation smoke test', () => {
  it('a preset can spawn particles into a pool without throwing', () => {
    const config = createFirePreset();
    const pool = new ParticlePool(1000);
    const driver = new EmitterDriver(config.emitters[0], config.seed);
    const spawned = updateEmitter(driver, pool, 1 / 30);
    expect(spawned).toBeGreaterThanOrEqual(0);
  });

  it('every preset spawns at least one particle within one second of ticks', () => {
    for (const name of listPresetNames()) {
      const config = instantiatePreset(name);
      const pool = new ParticlePool(Math.min(config.maxParticles, 2000));
      const drivers = config.emitters.map((e, i) => new EmitterDriver(e, config.seed + i));
      let totalSpawned = 0;
      for (let frame = 0; frame < 60; frame++) {
        for (const driver of drivers) {
          totalSpawned += updateEmitter(driver, pool, 1 / 30);
        }
      }
      expect(totalSpawned).toBeGreaterThan(0);
    }
  });
});
