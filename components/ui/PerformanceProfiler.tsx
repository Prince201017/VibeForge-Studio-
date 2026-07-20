/**
 * [ParticleEngine] PerformanceProfiler — compact HUD showing live particle
 * count, FPS, frame time, estimated GPU memory, draw calls, and cull count,
 * with color-coded warnings when the hard SLAs from the spec are at risk
 * (1M particles / 16ms frame budget).
 */

import React from 'react';
import type { PerformanceStats } from '../types';

export interface PerformanceProfilerProps {
  stats: PerformanceStats;
  targetFps?: number;
  frameBudgetMs?: number;
}

export function PerformanceProfiler({ stats, targetFps = 60, frameBudgetMs = 16 }: PerformanceProfilerProps) {
  const fpsOk = stats.fps >= targetFps * 0.9;
  const frameOk = stats.frameTimeMs <= frameBudgetMs;

  return (
    <div style={containerStyle}>
      <Metric label="Particles" value={stats.activeParticles.toLocaleString()} />
      <Metric label="FPS" value={stats.fps.toString()} status={fpsOk ? 'ok' : 'warn'} />
      <Metric label="Frame" value={`${stats.frameTimeMs.toFixed(2)} ms`} status={frameOk ? 'ok' : 'warn'} />
      <Metric label="GPU Mem" value={`${stats.gpuMemoryMB.toFixed(1)} MB`} />
      <Metric label="Draw Calls" value={stats.drawCalls.toString()} />
      <Metric label="Culled" value={stats.cullCount.toLocaleString()} />
    </div>
  );
}

function Metric({ label, value, status }: { label: string; value: string; status?: 'ok' | 'warn' }) {
  const color = status === 'warn' ? '#ff6b6b' : status === 'ok' ? '#6bffab' : 'var(--text, #eee)';
  return (
    <div style={metricStyle}>
      <span style={{ opacity: 0.6, fontSize: 10 }}>{label}</span>
      <span style={{ color, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, auto)',
  gap: '8px 16px',
  padding: 10,
  background: 'rgba(10,10,14,0.85)',
  borderRadius: 8,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const metricStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
