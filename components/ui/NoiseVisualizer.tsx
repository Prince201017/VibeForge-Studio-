/**
 * [ParticleEngine] NoiseVisualizer — renders a live 2D slice of a noise
 * field (Perlin / Simplex / fBm / Ridged / Worley / Curl) to a canvas so
 * artists can tune frequency/amplitude/octaves before wiring the field into
 * a force or spawn mask.
 */

import React, { useEffect, useRef } from 'react';
import { NoiseField } from '../noise';
import type { NoiseConfig } from '../types';

export interface NoiseVisualizerProps {
  config: NoiseConfig;
  width?: number;
  height?: number;
  animate?: boolean;
  seed?: number;
}

export function NoiseVisualizer({ config, width = 220, height = 220, animate = true, seed = 1337 }: NoiseVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<NoiseField>();
  if (!fieldRef.current) fieldRef.current = new NoiseField(seed);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const field = fieldRef.current!;
    const imageData = ctx.createImageData(width, height);
    let z = 0;
    let rafId: number;

    const renderFrame = () => {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let value: number;
          if (config.type === 'curl') {
            const v = field.evaluateVector(config, x * 0.05, y * 0.05, z);
            value = (v.x + v.y) * 0.5;
          } else {
            value = field.evaluateScalar(config, x * 0.05, y * 0.05, z);
          }
          const normalized = Math.max(0, Math.min(1, (value + 1) / 2));
          const idx = (y * width + x) * 4;
          const gray = Math.floor(normalized * 255);
          imageData.data[idx] = gray;
          imageData.data[idx + 1] = gray;
          imageData.data[idx + 2] = Math.floor(gray * 0.9 + 20);
          imageData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      if (animate) {
        z += 0.02;
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [config, width, height, animate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 6, imageRendering: 'pixelated' }} />
      <div style={{ fontSize: 11, opacity: 0.6, color: 'var(--text, #eee)' }}>
        {config.type} · freq {config.frequency.toFixed(2)} · amp {config.amplitude.toFixed(2)}
        {config.octaves ? ` · ${config.octaves} octaves` : ''}
      </div>
    </div>
  );
}
