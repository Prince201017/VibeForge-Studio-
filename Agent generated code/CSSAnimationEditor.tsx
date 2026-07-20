// [CSS.A10] CSSAnimationEditor.tsx
// Top-level component. Composes PropertySelector (inline), EasingEditor,
// LivePreview, and the multi-framework code panel. All mutations go through
// useCSSAnimationStore so history/undo-redo stays consistent with the rest
// of the app's Zustand-based STATE_CONTRACT.

import { useState } from 'react';
import { useCSSAnimationStore } from '../../lib/css-animation/store';
import { useCodeGen } from '../../lib/css-animation/hooks';
import { PROPERTY_REGISTRY, isGpuOnlyAnimation, recommendWillChange } from '../../lib/css-animation/properties';
import type { AnimatableProperty, ExportFramework } from '../../lib/css-animation/types';
import EasingEditor from './EasingEditor';
import LivePreview from './LivePreview';

const FRAMEWORKS: { id: ExportFramework; label: string }[] = [
  { id: 'css', label: 'CSS' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'styled-components', label: 'Styled Components' },
  { id: 'framer-motion', label: 'Framer Motion' },
  { id: 'gsap', label: 'GSAP' },
  { id: 'motion-one', label: 'Motion One' },
  { id: 'animejs', label: 'Anime.js' },
  { id: 'web-animation-api', label: 'Web Animation API' },
  { id: 'html', label: 'Full HTML' },
];

export default function CSSAnimationEditor() {
  const { config, selectedFramework, setFramework, addTrack, removeTrack, updateTrack, undo, redo, playbackSpeed, setSpeed } =
    useCSSAnimationStore();
  const { result, loading, error } = useCodeGen(config, selectedFramework);
  const [propertyToAdd, setPropertyToAdd] = useState<AnimatableProperty>('translateX');

  const properties = config.tracks.filter((t) => t.enabled).map((t) => t.property);
  const gpuOnly = isGpuOnlyAnimation(properties);

  const copyCode = async () => {
    if (result) await navigator.clipboard.writeText(result.code);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 420px', gap: 16, fontFamily: 'ui-sans-serif, system-ui', color: '#e6e6ea' }}>
      {/* --- Left: tracks / property selector --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={undo} style={pill}>Undo</button>
          <button onClick={redo} style={pill}>Redo</button>
        </div>

        <div>
          <div style={label}>Tracks</div>
          {config.tracks.map((track) => (
            <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <input
                type="checkbox"
                checked={track.enabled}
                onChange={(e) => updateTrack(track.id, { enabled: e.target.checked })}
              />
              <span style={{ flex: 1, fontSize: 13 }}>{PROPERTY_REGISTRY[track.property].label}</span>
              <button onClick={() => removeTrack(track.id)} style={{ ...pill, padding: '2px 6px' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <select value={propertyToAdd} onChange={(e) => setPropertyToAdd(e.target.value as AnimatableProperty)} style={select}>
            {(Object.keys(PROPERTY_REGISTRY) as AnimatableProperty[]).map((p) => (
              <option key={p} value={p}>{PROPERTY_REGISTRY[p].label}</option>
            ))}
          </select>
          <button onClick={() => addTrack(propertyToAdd)} style={pill}>+ Add</button>
        </div>

        <div>
          <div style={label}>Easing</div>
          <EasingEditor value={config.timing.easing} onChange={(easing) => useCSSAnimationStore.setState((s) => ({ config: { ...s.config, timing: { ...s.config.timing, easing } } }))} />
        </div>

        <div style={{ fontSize: 12, padding: 8, borderRadius: 6, background: gpuOnly ? 'rgba(90,200,120,0.12)' : 'rgba(255,180,80,0.12)' }}>
          {gpuOnly
            ? '✓ GPU-accelerated (transform/opacity only)'
            : `⚠ Includes layout-affecting properties. Consider will-change: ${recommendWillChange(properties)}`}
        </div>
      </div>

      {/* --- Center: live preview + timing --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LivePreview config={config} speed={playbackSpeed} showBoundingBox />
        <div>
          <div style={label}>Speed: {playbackSpeed.toFixed(1)}x</div>
          <input type="range" min={0.1} max={2} step={0.1} value={playbackSpeed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <label>
            Duration (ms)
            <input
              type="number"
              value={config.timing.durationMs}
              onChange={(e) => useCSSAnimationStore.setState((s) => ({ config: { ...s.config, timing: { ...s.config.timing, durationMs: Number(e.target.value) } } }))}
              style={input}
            />
          </label>
          <label>
            Delay (ms)
            <input
              type="number"
              value={config.timing.delayMs}
              onChange={(e) => useCSSAnimationStore.setState((s) => ({ config: { ...s.config, timing: { ...s.config.timing, delayMs: Number(e.target.value) } } }))}
              style={input}
            />
          </label>
        </div>
      </div>

      {/* --- Right: framework selector + generated code --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FRAMEWORKS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFramework(f.id)}
              style={{ ...pill, background: selectedFramework === f.id ? 'var(--accent, #7c9cff)' : 'transparent', color: selectedFramework === f.id ? '#000' : 'inherit' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 300 }}>
          <button onClick={copyCode} style={{ ...pill, position: 'absolute', top: 8, right: 8, zIndex: 1 }}>Copy</button>
          <pre style={{ margin: 0, padding: 12, borderRadius: 8, background: '#0d0d10', fontSize: 12, overflow: 'auto', height: '100%' }}>
            {loading ? 'Generating…' : error ? `Error: ${error}` : result?.code}
          </pre>
        </div>
        {result && <div style={{ fontSize: 11, opacity: 0.5 }}>{result.filename} · {result.sizeBytes} bytes</div>}
      </div>
    </div>
  );
}

const pill: React.CSSProperties = { fontSize: 12, padding: '5px 10px', borderRadius: 999, border: '1px solid #2a2a30', background: 'transparent', color: 'inherit', cursor: 'pointer' };
const label: React.CSSProperties = { fontSize: 11, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const select: React.CSSProperties = { flex: 1, background: '#0d0d10', color: 'inherit', border: '1px solid #2a2a30', borderRadius: 6, fontSize: 12, padding: '4px 6px' };
const input: React.CSSProperties = { width: '100%', background: '#0d0d10', color: 'inherit', border: '1px solid #2a2a30', borderRadius: 6, padding: '4px 6px', marginTop: 2 };
