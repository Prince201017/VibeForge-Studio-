/**
 * [ParticleEngine] useParticlePreview — lightweight, capped-particle-count
 * simulation intended for small inspector thumbnails / preset picker
 * previews, where a full 1M-particle GPU pipeline would be wasteful.
 *
 * Renders via Canvas2D (not Three.js) to keep preview mounts cheap — many
 * of these can exist on screen at once (e.g. the preset selector grid).
 */

import { useEffect, useRef } from 'react';
import { createParticleSystemHandle, stepSimulation, type SimulationContext } from '../engine';
import { EmitterDriver, updateEmitter } from '../emitter';
import { NoiseField } from '../noise';
import { Canvas2DFallbackRenderer } from '../gpu';
import type { ParticleSystemConfig } from '../types';

const PREVIEW_MAX_PARTICLES = 500;

export interface UseParticlePreviewOptions {
  width?: number;
  height?: number;
  cameraDistance?: number;
}

/**
 * Attaches a self-contained simulate+render loop to the given canvas ref.
 * Intended usage:
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   useParticlePreview(canvasRef, presetConfig);
 *   return <canvas ref={canvasRef} width={120} height={120} />;
 */
export function useParticlePreview(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  config: ParticleSystemConfig,
  options: UseParticlePreviewOptions = {}
): void {
  const { cameraDistance = 8 } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createParticleSystemHandle(
      Math.min(config.maxParticles, PREVIEW_MAX_PARTICLES),
      config.render.geometry
    );
    const drivers = config.emitters.map((e, idx) => new EmitterDriver(e, config.seed + idx));
    const noiseField = new NoiseField(config.seed);
    const renderer = new Canvas2DFallbackRenderer(canvas);

    let rafId: number;
    let last = performance.now();
    let simTime = 0;

    const project = (x: number, y: number, z: number) => {
      const scale = cameraDistance / (cameraDistance + z);
      return {
        x: canvas.width / 2 + x * scale * (canvas.width / 6),
        y: canvas.height / 2 - y * scale * (canvas.height / 6),
        scale,
      };
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;

      for (const driver of drivers) updateEmitter(driver, handle.pool, dt);

      const ctx: SimulationContext = {
        forces: config.forces,
        collisions: config.collisions,
        propertyCurves: config.propertyCurves,
        noiseField,
        simulationTime: simTime,
      };
      stepSimulation(handle.pool, dt, ctx);
      simTime += dt;

      const canvasCtx = canvas.getContext('2d');
      if (canvasCtx) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      renderer.render(handle.pool, config.render, project);

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, config.id, config.presetId]);
}
