/**
 * [ParticleEngine] useParticles — drives the CPU/GPU simulation loop for a
 * single particle system config and exposes live performance stats.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createParticleSystemHandle,
  stepSimulation,
  type ParticleSystemHandle,
  type SimulationContext,
} from '../engine';
import { EmitterDriver, updateEmitter } from '../emitter';
import { NoiseField } from '../noise';
import type { ParticleSystemConfig, PerformanceStats } from '../types';

export interface UseParticlesOptions {
  autoPlay?: boolean;
  maxDeltaSeconds?: number; // clamp dt spikes (e.g. tab backgrounded)
}

export interface UseParticlesResult {
  handle: ParticleSystemHandle;
  stats: PerformanceStats;
  play: () => void;
  pause: () => void;
  reset: () => void;
  isPlaying: boolean;
}

export function useParticles(
  config: ParticleSystemConfig,
  options: UseParticlesOptions = {}
): UseParticlesResult {
  const { autoPlay = true, maxDeltaSeconds = 1 / 15 } = options;

  const handleRef = useRef<ParticleSystemHandle>();
  if (!handleRef.current) {
    handleRef.current = createParticleSystemHandle(config.maxParticles, config.render.geometry);
  }

  const drivers = useMemo(
    () => config.emitters.map((e, idx) => new EmitterDriver(e, config.seed + idx)),
    // Re-created if the emitter list identity changes (e.g. add/remove emitter)
    [config.emitters, config.seed]
  );

  const noiseField = useMemo(() => new NoiseField(config.seed), [config.seed]);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [stats, setStats] = useState<PerformanceStats>({
    activeParticles: 0,
    fps: 0,
    frameTimeMs: 0,
    gpuMemoryMB: 0,
    drawCalls: 1,
    cullCount: 0,
  });

  const simTimeRef = useRef(0);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const fpsSampleRef = useRef<{ frames: number; accum: number }>({ frames: 0, accum: 0 });

  useEffect(() => {
    if (!isPlaying) return;

    const tick = (now: number) => {
      const last = lastTimeRef.current ?? now;
      const dtRaw = (now - last) / 1000;
      const dt = Math.min(dtRaw, maxDeltaSeconds) * config.timeScale;
      lastTimeRef.current = now;

      const t0 = performance.now();
      const handle = handleRef.current!;

      for (const driver of drivers) {
        updateEmitter(driver, handle.pool, dt);
      }

      const ctx: SimulationContext = {
        forces: config.forces,
        collisions: config.collisions,
        propertyCurves: config.propertyCurves,
        noiseField,
        simulationTime: simTimeRef.current,
      };
      stepSimulation(handle.pool, dt, ctx);
      simTimeRef.current += dt;

      const frameTimeMs = performance.now() - t0;
      fpsSampleRef.current.frames++;
      fpsSampleRef.current.accum += frameTimeMs;

      if (fpsSampleRef.current.frames >= 15) {
        const avgFrameTime = fpsSampleRef.current.accum / fpsSampleRef.current.frames;
        setStats({
          activeParticles: handle.pool.activeCount,
          fps: avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0,
          frameTimeMs: Math.round(avgFrameTime * 100) / 100,
          gpuMemoryMB: estimateGpuMemoryMB(handle.pool.capacity),
          drawCalls: 1,
          cullCount: 0,
        });
        fpsSampleRef.current = { frames: 0, accum: 0 };
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = undefined;
    };
  }, [isPlaying, drivers, config.forces, config.collisions, config.propertyCurves, config.timeScale, noiseField, maxDeltaSeconds]);

  return {
    handle: handleRef.current,
    stats,
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    reset: () => {
      handleRef.current?.pool.reset();
      simTimeRef.current = 0;
    },
    isPlaying,
  };
}

function estimateGpuMemoryMB(capacity: number): number {
  // Rough estimate: instance matrix (64B) + color/opacity/scale/rotation/tex (5 * 4B) per particle
  const bytesPerParticle = 64 + 5 * 4;
  return Math.round(((capacity * bytesPerParticle) / (1024 * 1024)) * 100) / 100;
}
