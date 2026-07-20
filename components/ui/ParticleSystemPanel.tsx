/**
 * [ParticleEngine] ParticleSystemPanel — top-level layer panel listing a
 * particle system's emitters, force fields, and renderer summary, with
 * expand/collapse sections that route into EmitterInspector / PhysicsPanel.
 */

import React, { useState } from 'react';
import type { ParticleSystemConfig } from '../types';

export interface ParticleSystemPanelProps {
  system: ParticleSystemConfig;
  selectedEmitterId?: string;
  onSelectEmitter: (emitterId: string) => void;
  onToggleEmitterEnabled: (emitterId: string) => void;
  onAddEmitter: () => void;
  onRemoveEmitter: (emitterId: string) => void;
  onRenameSystem: (name: string) => void;
  onOpenPhysics: () => void;
  onOpenRenderSettings: () => void;
  performance?: { activeParticles: number; fps: number };
}

export function ParticleSystemPanel({
  system,
  selectedEmitterId,
  onSelectEmitter,
  onToggleEmitterEnabled,
  onAddEmitter,
  onRemoveEmitter,
  onRenameSystem,
  onOpenPhysics,
  onOpenRenderSettings,
  performance,
}: ParticleSystemPanelProps) {
  const [nameDraft, setNameDraft] = useState(system.name);
  const [emittersExpanded, setEmittersExpanded] = useState(true);

  return (
    <div className="particle-system-panel" style={panelStyle}>
      <div style={headerStyle}>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => onRenameSystem(nameDraft)}
          style={nameInputStyle}
          aria-label="Particle system name"
        />
        {performance && (
          <span style={statBadgeStyle}>
            {performance.activeParticles.toLocaleString()} particles · {performance.fps} fps
          </span>
        )}
      </div>

      <section style={sectionStyle}>
        <button style={sectionHeaderStyle} onClick={() => setEmittersExpanded((v) => !v)}>
          <span>{emittersExpanded ? '▾' : '▸'} Emitters ({system.emitters.length})</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onAddEmitter();
            }}
            style={addButtonStyle}
          >
            + Add
          </span>
        </button>

        {emittersExpanded && (
          <ul style={listStyle}>
            {system.emitters.map((emitter) => (
              <li
                key={emitter.id}
                style={{
                  ...listItemStyle,
                  ...(selectedEmitterId === emitter.id ? listItemSelectedStyle : {}),
                }}
                onClick={() => onSelectEmitter(emitter.id)}
              >
                <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={emitter.enabled}
                    onChange={() => onToggleEmitterEnabled(emitter.id)}
                  />
                  <span>{emitter.shape}</span>
                </label>
                <button
                  style={removeButtonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEmitter(emitter.id);
                  }}
                  aria-label={`Remove emitter ${emitter.id}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <button style={sectionHeaderStyle} onClick={onOpenPhysics}>
          <span>Physics &amp; Forces ({system.forces.length})</span>
          <span style={chevronStyle}>›</span>
        </button>
      </section>

      <section style={sectionStyle}>
        <button style={sectionHeaderStyle} onClick={onOpenRenderSettings}>
          <span>Renderer — {system.render.blendMode} / {system.render.geometry}</span>
          <span style={chevronStyle}>›</span>
        </button>
      </section>

      <div style={footerStyle}>
        Max particles: {system.maxParticles.toLocaleString()} · Space: {system.simulationSpace}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (kept dependency-free; host app may override via className)
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  background: 'var(--surface, #1a1a1e)',
  color: 'var(--text, #eee)',
  borderRadius: 8,
  fontSize: 13,
  width: 280,
};

const headerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const nameInputStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  color: 'inherit',
  fontWeight: 600,
  fontSize: 14,
  padding: '4px 2px',
};
const statBadgeStyle: React.CSSProperties = { fontSize: 11, opacity: 0.6 };
const sectionStyle: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 };
const sectionHeaderStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '4px 0',
  fontSize: 13,
};
const addButtonStyle: React.CSSProperties = { fontSize: 11, opacity: 0.8, cursor: 'pointer' };
const chevronStyle: React.CSSProperties = { opacity: 0.5 };
const listStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 };
const listItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 6px',
  borderRadius: 4,
  cursor: 'pointer',
};
const listItemSelectedStyle: React.CSSProperties = { background: 'rgba(120,140,255,0.18)' };
const removeButtonStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' };
const footerStyle: React.CSSProperties = { fontSize: 11, opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 };
