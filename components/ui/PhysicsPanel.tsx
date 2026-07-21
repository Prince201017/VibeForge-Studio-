/**
 * [ParticleEngine] PhysicsPanel — lists and edits force fields (gravity,
 * wind, attraction, repulsion, vortex, drag, curl noise, custom) attached to
 * a particle system.
 */

import React from 'react';
import type { ForceField, ForceFieldType } from '../types';
import { createDefaultForce } from '../hooks/usePhysics';

export interface PhysicsPanelProps {
  forces: ForceField[];
  onAddForce: (force: ForceField) => void;
  onUpdateForce: (id: string, patch: Partial<ForceField>) => void;
  onRemoveForce: (id: string) => void;
  onToggleForce: (id: string) => void;
}

const FORCE_TYPES: ForceFieldType[] = ['gravity', 'wind', 'attractor', 'repulsor', 'vortex', 'drag', 'curlNoise'];

export function PhysicsPanel({ forces, onAddForce, onUpdateForce, onRemoveForce, onToggleForce }: PhysicsPanelProps) {
  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <span style={titleStyle}>Force Fields</span>
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onAddForce(createDefaultForce(e.target.value as ForceFieldType));
              e.target.value = '';
            }
          }}
          style={selectStyle}
        >
          <option value="" disabled>
            + Add force…
          </option>
          {FORCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {forces.length === 0 && <div style={emptyStyle}>No force fields yet. Particles will move in straight lines.</div>}

      {forces.map((force) => (
        <ForceFieldRow
          key={force.id}
          force={force}
          onChange={(patch) => onUpdateForce(force.id, patch)}
          onRemove={() => onRemoveForce(force.id)}
          onToggle={() => onToggleForce(force.id)}
        />
      ))}
    </div>
  );
}

function ForceFieldRow({
  force,
  onChange,
  onRemove,
  onToggle,
}: {
  force: ForceField;
  onChange: (patch: Partial<ForceField>) => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  return (
    <div style={forceCardStyle}>
      <div style={forceHeaderStyle}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={force.enabled} onChange={onToggle} />
          <strong>{force.type}</strong>
        </label>
        <button style={removeButtonStyle} onClick={onRemove} aria-label={`Remove ${force.type} force`}>
          ✕
        </button>
      </div>

      <Field label="Strength">
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={force.strength}
          onChange={(e) => onChange({ strength: parseFloat(e.target.value) })}
        />
        <span style={valueStyle}>{force.strength.toFixed(1)}</span>
      </Field>

      {(force.type === 'attractor' || force.type === 'repulsor' || force.type === 'vortex') && (
        <Field label="Radius">
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={force.radius ?? 5}
            onChange={(e) => onChange({ radius: parseFloat(e.target.value) })}
          />
          <span style={valueStyle}>{(force.radius ?? 5).toFixed(1)}</span>
        </Field>
      )}

      {force.type === 'wind' && (
        <Field label="Turbulence">
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={force.turbulence ?? 0}
            onChange={(e) => onChange({ turbulence: parseFloat(e.target.value) })}
          />
          <span style={valueStyle}>{(force.turbulence ?? 0).toFixed(2)}</span>
        </Field>
      )}

      {force.type === 'drag' && (
        <Field label="Coefficient">
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={force.dragCoefficient ?? 0.3}
            onChange={(e) => onChange({ dragCoefficient: parseFloat(e.target.value) })}
          />
          <span style={valueStyle}>{(force.dragCoefficient ?? 0.3).toFixed(2)}</span>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={fieldRowStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>{children}</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, fontSize: 12, color: 'var(--text, #eee)' };
const headerRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle: React.CSSProperties = { fontWeight: 600, fontSize: 13 };
const selectStyle: React.CSSProperties = { background: '#222', color: 'inherit', border: '1px solid #333', borderRadius: 4, fontSize: 11 };
const emptyStyle: React.CSSProperties = { opacity: 0.5, fontStyle: 'italic', fontSize: 11 };
const forceCardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 };
const forceHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const removeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' };
const fieldRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const fieldLabelStyle: React.CSSProperties = { width: 80, opacity: 0.7, flexShrink: 0 };
const valueStyle: React.CSSProperties = { width: 36, textAlign: 'right', opacity: 0.8 };
