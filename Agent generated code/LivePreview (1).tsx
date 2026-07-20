// [CSS.A10] LivePreview.tsx
import { useMemo } from 'react';
import type { AnimationConfig } from '../../lib/css-animation/types';
import { PROPERTY_REGISTRY } from '../../lib/css-animation/properties';
import { evaluateEasing } from '../../lib/css-animation/easing';
import { useCSSAnimation } from '../../lib/css-animation/hooks';

interface LivePreviewProps {
  config: AnimationConfig;
  speed: number;
  showBoundingBox?: boolean;
  showPath?: boolean;
}

function interpolate(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function LivePreview({ config, speed, showBoundingBox, showPath }: LivePreviewProps) {
  const { progress, playing, play, pause, restart, seek } = useCSSAnimation(config, { speed, autoplay: true });

  const style = useMemo<React.CSSProperties>(() => {
    const transformParts: string[] = [];
    const filterParts: string[] = [];
    const out: React.CSSProperties = {};

    for (const track of config.tracks.filter((t) => t.enabled)) {
      const meta = PROPERTY_REGISTRY[track.property];
      const kfs = [...track.keyframes].sort((a, b) => a.offset - b.offset);
      let segStart = kfs[0];
      let segEnd = kfs[kfs.length - 1];
      for (let i = 0; i < kfs.length - 1; i++) {
        if (progress >= kfs[i].offset && progress <= kfs[i + 1].offset) {
          segStart = kfs[i];
          segEnd = kfs[i + 1];
          break;
        }
      }
      const span = segEnd.offset - segStart.offset || 1;
      const localT = Math.min(1, Math.max(0, (progress - segStart.offset) / span));
      const eased = evaluateEasing(segEnd.easing ?? config.timing.easing, localT);

      let value: number | string;
      if (typeof segStart.value === 'number' && typeof segEnd.value === 'number') {
        value = interpolate(segStart.value, segEnd.value, eased);
      } else {
        value = eased < 1 ? segStart.value : segEnd.value;
      }
      const unit = segEnd.unit ?? meta.defaultUnit;
      const formatted = typeof value === 'number' ? `${value}${unit}` : String(value);

      if (meta.cssProperty === 'transform' && meta.transformFn) {
        transformParts.push(`${meta.transformFn}(${formatted})`);
      } else if (meta.cssProperty === 'filter' && meta.filterFn) {
        filterParts.push(`${meta.filterFn}(${formatted})`);
      } else {
        (out as Record<string, string>)[toCamel(meta.cssProperty)] = formatted;
      }
    }

    if (transformParts.length) out.transform = transformParts.join(' ');
    if (filterParts.length) out.filter = filterParts.join(' ');
    return out;
  }, [config, progress]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          position: 'relative',
          height: 200,
          borderRadius: 8,
          background: 'repeating-conic-gradient(#1a1a1e 0% 25%, #151518 0% 50%) 50% / 20px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {showBoundingBox && (
          <div style={{ position: 'absolute', inset: 24, border: '1px dashed rgba(124,156,255,0.4)', pointerEvents: 'none' }} />
        )}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #7c9cff, #b47cff)',
            ...style,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={playing ? pause : play} style={btnStyle}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={restart} style={btnStyle}>Restart</button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(parseFloat(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, opacity: 0.6, width: 40, textAlign: 'right' }}>
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #2a2a30)',
  background: 'transparent',
  cursor: 'pointer',
};

function toCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
