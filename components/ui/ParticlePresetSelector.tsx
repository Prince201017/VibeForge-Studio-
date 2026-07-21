/**
 * [ParticleEngine] ParticlePresetSelector — dropdown/grid of the 20+ built-in
 * particle presets, each with a live Canvas2D thumbnail preview driven by
 * useParticlePreview.
 */

import React, { useRef } from 'react';
import { listPresetNames, instantiatePreset, type PresetName } from '../presets';
import { useParticlePreview } from '../hooks/useParticlePreview';

export interface ParticlePresetSelectorProps {
  selected?: PresetName;
  onSelect: (preset: PresetName) => void;
  columns?: number;
}

const PRESET_LABELS: Record<PresetName, string> = {
  smoke: 'Smoke',
  fire: 'Fire',
  dust: 'Dust',
  sparks: 'Sparks',
  rain: 'Rain',
  snow: 'Snow',
  magic: 'Magic Energy',
  nebula: 'Nebula',
  liquid: 'Liquid',
  pixel: 'Pixel',
  typography: 'Typography',
  logo: 'Logo',
  portrait: 'Portrait',
  geometry: 'Geometry',
  proceduralMesh: 'Procedural Mesh',
  confetti: 'Confetti',
  bubbles: 'Bubbles',
  explosion: 'Explosion',
  waterfall: 'Waterfall',
  fireflies: 'Fireflies',
  ash: 'Ash / Embers',
};

export function ParticlePresetSelector({ selected, onSelect, columns = 4 }: ParticlePresetSelectorProps) {
  const presets = listPresetNames();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 10,
        padding: 12,
      }}
    >
      {presets.map((name) => (
        <PresetThumbnail
          key={name}
          name={name}
          label={PRESET_LABELS[name]}
          selected={selected === name}
          onSelect={() => onSelect(name)}
        />
      ))}
    </div>
  );
}

function PresetThumbnail({
  name,
  label,
  selected,
  onSelect,
}: {
  name: PresetName;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = React.useMemo(() => instantiatePreset(name), [name]);
  useParticlePreview(canvasRef, config);

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 6,
        borderRadius: 8,
        border: selected ? '2px solid #7c8cff' : '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
      }}
      aria-pressed={selected}
    >
      <canvas ref={canvasRef} width={96} height={96} style={{ borderRadius: 6, background: '#0c0c10' }} />
      <span style={{ fontSize: 11, color: 'var(--text, #eee)' }}>{label}</span>
    </button>
  );
}
