// [CSS.A10] CSSAnimationEditor.tsx
// Top-level component. Composes the split-out sub-components:
// PropertySelector, TimelineEditor, EasingEditor, LivePreview,
// ResponsivePreview, FrameworkSelector, GeneratedCodePreview, ExportDialog.
// All mutations go through useCSSAnimationStore so history/undo-redo stays
// consistent with the rest of the app's Zustand-based STATE_CONTRACT.

import { useState } from 'react';
import { useCSSAnimationStore } from '../../lib/css-animation/store';
import { useCodeGen, useCSSAnimation } from '../../lib/css-animation/hooks';
import { isGpuOnlyAnimation, recommendWillChange } from '../../lib/css-animation/properties';
import type { ExportFramework } from '../../lib/css-animation/types';

import PropertySelector from './PropertySelector';
import TimelineEditor from './TimelineEditor';
import EasingEditor from './EasingEditor';
import LivePreview from './LivePreview';
import ResponsivePreview from './ResponsivePreview';
import FrameworkSelector from './FrameworkSelector';
import GeneratedCodePreview from './GeneratedCodePreview';
import ExportDialog from './ExportDialog';

export default function CSSAnimationEditor() {
  const {
    config, selectedFramework, setFramework, addTrack, removeTrack, updateTrack,
    undo, redo, playbackSpeed, setSpeed,
  } = useCSSAnimationStore();
  const { result, loading, error } = useCodeGen(config, selectedFramework);
  const { progress, seek } = useCSSAnimation(config, { speed: playbackSpeed });

  const [showResponsive, setShowResponsive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const properties = config.tracks.filter((t) => t.enabled).map((t) => t.property);
  const gpuOnly = isGpuOnlyAnimation(properties);

  const setEasing = (easing: any) =>
    useCSSAnimationStore.setState((s) => ({ config: { ...s.config, timing: { ...s.config.timing, easing } } }));

  const setTiming = (patch: Partial<typeof config.timing>) =>
    useCSSAnimationStore.setState((s) => ({ config: { ...s.config, timing: { ...s.config.timing, ...patch } } }));

  const moveKeyframe = (trackId: string, index: number, offset: number) => {
    const track = config.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const keyframes = track.keyframes.map((kf, i) => (i === index ? { ...kf, offset } : kf));
    updateTrack(trackId, { keyframes });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'ui-sans-serif, system-ui', color: '#e6e6ea' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 420px', gap: 16 }}>
        {/* --- Left: property tracks + easing --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={undo} style={pill}>Undo</button>
            <button onClick={redo} style={pill}>Redo</button>
          </div>

          <PropertySelector
            tracks={config.tracks}
            onAdd={addTrack}
            onRemove={removeTrack}
            onToggle={(id, enabled) => updateTrack(id, { enabled })}
          />

          <div>
            <div style={label}>Easing</div>
            <EasingEditor value={config.timing.easing} onChange={setEasing} />
          </div>

          <div style={{ fontSize: 12, padding: 8, borderRadius: 6, background: gpuOnly ? 'rgba(90,200,120,0.12)' : 'rgba(255,180,80,0.12)' }}>
            {gpuOnly
              ? '✓ GPU-accelerated (transform/opacity only)'
              : `⚠ Includes layout-affecting properties. Consider will-change: ${recommendWillChange(properties)}`}
          </div>
        </div>

        {/* --- Center: preview + timeline + timing --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={label}>Preview</div>
            <button onClick={() => setShowResponsive((v) => !v)} style={pill}>
              {showResponsive ? 'Single view' : 'Responsive view'}
            </button>
          </div>

          {showResponsive ? (
            <ResponsivePreview config={config} speed={playbackSpeed} />
          ) : (
            <LivePreview config={config} speed={playbackSpeed} showBoundingBox />
          )}

          <TimelineEditor
            tracks={config.tracks}
            durationMs={config.timing.durationMs}
            progress={progress}
            onKeyframeMove={moveKeyframe}
            onScrub={seek}
          />

          <div>
            <div style={label}>Speed: {playbackSpeed.toFixed(1)}x</div>
            <input type="range" min={0.1} max={2} step={0.1} value={playbackSpeed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            <label>
              Duration (ms)
              <input type="number" value={config.timing.durationMs} onChange={(e) => setTiming({ durationMs: Number(e.target.value) })} style={input} />
            </label>
            <label>
              Delay (ms)
              <input type="number" value={config.timing.delayMs} onChange={(e) => setTiming({ delayMs: Number(e.target.value) })} style={input} />
            </label>
          </div>
        </div>

        {/* --- Right: framework selector + generated code --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FrameworkSelector selected={selectedFramework} onSelect={(fw: ExportFramework) => setFramework(fw)} />
          <GeneratedCodePreview result={result} loading={loading} error={error} onOpenExportDialog={() => setExportOpen(true)} />
        </div>
      </div>

      <ExportDialog result={result} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

const pill: React.CSSProperties = { fontSize: 12, padding: '5px 10px', borderRadius: 999, border: '1px solid #2a2a30', background: 'transparent', color: 'inherit', cursor: 'pointer' };
const label: React.CSSProperties = { fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 };
const input: React.CSSProperties = { width: '100%', background: '#0d0d10', color: 'inherit', border: '1px solid #2a2a30', borderRadius: 6, padding: '4px 6px', marginTop: 2 };
