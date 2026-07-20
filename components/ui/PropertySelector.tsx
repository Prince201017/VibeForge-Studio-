// [CSS.A10] PropertySelector.tsx
import { useState } from 'react';
import type { AnimatableProperty, AnimationTrack } from '../../lib/css-animation/types';
import { PROPERTY_REGISTRY } from '../../lib/css-animation/properties';

interface PropertySelectorProps {
  tracks: AnimationTrack[];
  onAdd: (property: AnimatableProperty) => void;
  onRemove: (trackId: string) => void;
  onToggle: (trackId: string, enabled: boolean) => void;
  onSelect?: (trackId: string) => void;
  selectedTrackId?: string;
}

const CATEGORY_ORDER = ['transform', 'filter', 'other'] as const;

function categoryOf(property: AnimatableProperty): 'transform' | 'filter' | 'other' {
  const host = PROPERTY_REGISTRY[property].cssProperty;
  if (host === 'transform') return 'transform';
  if (host === 'filter') return 'filter';
  return 'other';
}

export default function PropertySelector({ tracks, onAdd, onRemove, onToggle, onSelect, selectedTrackId }: PropertySelectorProps) {
  const [propertyToAdd, setPropertyToAdd] = useState<AnimatableProperty>('translateX');
  const [filter, setFilter] = useState('');

  const usedProperties = new Set(tracks.map((t) => t.property));
  const available = (Object.keys(PROPERTY_REGISTRY) as AnimatableProperty[])
    .filter((p) => !usedProperties.has(p))
    .filter((p) => PROPERTY_REGISTRY[p].label.toLowerCase().includes(filter.toLowerCase()));

  const grouped: Record<string, AnimationTrack[]> = { transform: [], filter: [], other: [] };
  for (const t of tracks) grouped[categoryOf(t.property)].push(t);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tracks ({tracks.length}/50)</div>

      {CATEGORY_ORDER.map((cat) =>
        grouped[cat].length ? (
          <div key={cat}>
            <div style={{ fontSize: 10, opacity: 0.45, textTransform: 'capitalize', marginBottom: 4 }}>{cat}</div>
            {grouped[cat].map((track) => (
              <div
                key={track.id}
                onClick={() => onSelect?.(track.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: onSelect ? 'pointer' : 'default',
                  background: selectedTrackId === track.id ? 'rgba(124,156,255,0.12)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={track.enabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggle(track.id, e.target.checked)}
                />
                <span style={{ flex: 1, fontSize: 13, opacity: track.enabled ? 1 : 0.4 }}>
                  {PROPERTY_REGISTRY[track.property].label}
                </span>
                <span style={{ fontSize: 11, opacity: 0.4 }}>{track.keyframes.length} kf</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(track.id);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          placeholder="Filter properties…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ display: 'none' }}
        />
        <select
          value={propertyToAdd}
          onChange={(e) => setPropertyToAdd(e.target.value as AnimatableProperty)}
          style={{ flex: 1, background: '#0d0d10', color: 'inherit', border: '1px solid #2a2a30', borderRadius: 6, fontSize: 12, padding: '4px 6px' }}
        >
          {available.map((p) => (
            <option key={p} value={p}>{PROPERTY_REGISTRY[p].label}</option>
          ))}
        </select>
        <button
          disabled={tracks.length >= 50 || available.length === 0}
          onClick={() => onAdd(propertyToAdd)}
          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, border: '1px solid #2a2a30', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
