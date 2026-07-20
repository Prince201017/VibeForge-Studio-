/**
 * [ParticleEngine] EmitterInspector — full property inspector for a single
 * emitter: position, shape params, emission rate curve, bursts, and spawn
 * randomization ranges.
 */

import React from 'react';
import type { EmitterConfig, EmitterShape } from '../types';

export interface EmitterInspectorProps {
  emitter: EmitterConfig;
  onChange: (patch: Partial<EmitterConfig>) => void;
}

const SHAPES: EmitterShape[] = ['point', 'line', 'mesh', 'box', 'sphere', 'cylinder', 'svgPath', 'image', 'shape'];

export function EmitterInspector({ emitter, onChange }: EmitterInspectorProps) {
  return (
    <div style={containerStyle}>
      <Row label="Shape">
        <select
          value={emitter.shape}
          onChange={(e) => onChange({ shape: e.target.value as EmitterShape })}
          style={inputStyle}
        >
          {SHAPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Position">
        <Vec3Input
          value={emitter.position}
          onChange={(position) => onChange({ position })}
        />
      </Row>

      {emitter.shape === 'sphere' && (
        <Row label="Radius">
          <NumberInput
            value={emitter.sphere?.radius ?? 1}
            onChange={(radius) => onChange({ sphere: { ...emitter.sphere, radius, surfaceOnly: emitter.sphere?.surfaceOnly ?? false } })}
          />
        </Row>
      )}

      {emitter.shape === 'box' && (
        <Row label="Box Size">
          <Vec3Input value={emitter.box?.size ?? { x: 1, y: 1, z: 1 }} onChange={(size) => onChange({ box: { size } })} />
        </Row>
      )}

      <Row label="Max/Frame">
        <NumberInput value={emitter.maxParticlesPerFrame} onChange={(v) => onChange({ maxParticlesPerFrame: v })} />
      </Row>

      <Row label="Looping">
        <input type="checkbox" checked={emitter.looping} onChange={(e) => onChange({ looping: e.target.checked })} />
      </Row>

      {!emitter.looping && (
        <Row label="Duration (s)">
          <NumberInput value={emitter.duration} onChange={(v) => onChange({ duration: v })} />
        </Row>
      )}

      <SectionTitle>Emission Rate</SectionTitle>
      {emitter.rateOverTime.map((point, i) => (
        <Row key={i} label={`t=${point.t.toFixed(2)}`}>
          <NumberInput
            value={point.rate}
            onChange={(rate) => {
              const next = [...emitter.rateOverTime];
              next[i] = { ...point, rate };
              onChange({ rateOverTime: next });
            }}
          />
        </Row>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() =>
          onChange({
            rateOverTime: [...emitter.rateOverTime, { t: 1, rate: emitter.rateOverTime.at(-1)?.rate ?? 10 }],
          })
        }
      >
        + Add keyframe
      </button>

      <SectionTitle>Bursts ({emitter.bursts.length})</SectionTitle>
      {emitter.bursts.map((burst, i) => (
        <div key={i} style={burstRowStyle}>
          <span>t={burst.time}s</span>
          <NumberInput
            value={burst.count}
            onChange={(count) => {
              const next = [...emitter.bursts];
              next[i] = { ...burst, count };
              onChange({ bursts: next });
            }}
          />
          <button
            style={removeSmallStyle}
            onClick={() => onChange({ bursts: emitter.bursts.filter((_, bi) => bi !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() => onChange({ bursts: [...emitter.bursts, { time: 0, count: 50 }] })}
      >
        + Add burst
      </button>

      <SectionTitle>Spawn Randomization</SectionTitle>
      <RangeRow label="Lifetime" value={emitter.spawn.lifetime} onChange={(lifetime) => onChange({ spawn: { ...emitter.spawn, lifetime } })} />
      <RangeRow label="Speed" value={emitter.spawn.speed} onChange={(speed) => onChange({ spawn: { ...emitter.spawn, speed } })} />
      <RangeRow label="Scale" value={emitter.spawn.scale} onChange={(scale) => onChange({ spawn: { ...emitter.spawn, scale } })} />
      <Row label="Direction Spread">
        <NumberInput
          value={emitter.spawn.directionSpread}
          onChange={(directionSpread) => onChange({ spawn: { ...emitter.spawn, directionSpread } })}
        />
      </Row>
      <Row label="Color">
        <input
          type="color"
          value={rgbToHex(emitter.spawn.colorStart)}
          onChange={(e) => onChange({ spawn: { ...emitter.spawn, colorStart: { ...hexToRgb(e.target.value), a: emitter.spawn.colorStart.a } } })}
        />
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function RangeRow({ label, value, onChange }: { label: string; value: [number, number]; onChange: (v: [number, number]) => void }) {
  return (
    <Row label={label}>
      <div style={{ display: 'flex', gap: 4 }}>
        <NumberInput value={value[0]} onChange={(v) => onChange([v, value[1]])} />
        <span>–</span>
        <NumberInput value={value[1]} onChange={(v) => onChange([value[0], v])} />
      </div>
    </Row>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={sectionTitleStyle}>{children}</div>;
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step="any"
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={numberInputStyle}
    />
  );
}

function Vec3Input({ value, onChange }: { value: { x: number; y: number; z: number }; onChange: (v: { x: number; y: number; z: number }) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <NumberInput value={value.x} onChange={(x) => onChange({ ...value, x })} />
      <NumberInput value={value.y} onChange={(y) => onChange({ ...value, y })} />
      <NumberInput value={value.z} onChange={(z) => onChange({ ...value, z })} />
    </div>
  );
}

function rgbToHex(c: { r: number; g: number; b: number }): string {
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: 12, fontSize: 12, color: 'var(--text, #eee)' };
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 };
const labelStyle: React.CSSProperties = { opacity: 0.7 };
const inputStyle: React.CSSProperties = { background: '#222', color: 'inherit', border: '1px solid #333', borderRadius: 4, padding: '2px 4px' };
const numberInputStyle: React.CSSProperties = { width: 56, background: '#222', color: 'inherit', border: '1px solid #333', borderRadius: 4, padding: '2px 4px' };
const sectionTitleStyle: React.CSSProperties = { fontWeight: 600, marginTop: 8, opacity: 0.8, fontSize: 11, textTransform: 'uppercase' };
const smallButtonStyle: React.CSSProperties = { fontSize: 11, background: 'transparent', border: '1px dashed #555', color: 'inherit', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' };
const burstRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const removeSmallStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' };
