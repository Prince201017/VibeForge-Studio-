// [CSS.A10] EasingEditor.tsx
// Visual Bézier curve editor. Renders a draggable SVG control-point graph
// and a live curve preview; also exposes preset buttons for named/spring/
// power/back/elastic/bounce easings that don't map to a simple 2-point curve.

import { useCallback, useRef, useState } from 'react';
import type { Easing, EasingName, CubicBezier } from '../../lib/css-animation/types';
import { BEZIER_PRESETS, evaluateEasing } from '../../lib/css-animation/easing';

const SIZE = 200;
const PAD = 20;

interface EasingEditorProps {
  value: Easing;
  onChange: (easing: Easing) => void;
}

const PRESET_GROUPS: { label: string; names: EasingName[] }[] = [
  { label: 'Standard', names: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] },
  { label: 'Power', names: ['power1', 'power2', 'power3', 'power4'] },
  { label: 'Back', names: ['back-in', 'back-out', 'back-in-out'] },
  { label: 'Elastic', names: ['elastic-in', 'elastic-out', 'elastic-in-out'] },
  { label: 'Bounce', names: ['bounce-in', 'bounce-out', 'bounce-in-out'] },
];

function toSvg(px: number, py: number) {
  return { x: PAD + px * (SIZE - PAD * 2), y: SIZE - PAD - py * (SIZE - PAD * 2) };
}
function fromSvg(sx: number, sy: number) {
  return {
    x: (sx - PAD) / (SIZE - PAD * 2),
    y: (SIZE - PAD - sy) / (SIZE - PAD * 2),
  };
}

export default function EasingEditor({ value, onChange }: EasingEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const bezier: CubicBezier = value.bezier ?? BEZIER_PRESETS[value.name] ?? BEZIER_PRESETS.ease;

  const updateBezier = (patch: Partial<CubicBezier>) => {
    onChange({ ...value, name: 'custom-bezier', bezier: { ...bezier, ...patch } });
  };

  const handleDrag = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x, y } = fromSvg(sx, sy);
      const clampedX = Math.max(0, Math.min(1, x));
      if (dragging === 'p1') updateBezier({ x1: clampedX, y1: y });
      else updateBezier({ x2: clampedX, y2: y });
    },
    [dragging, bezier]
  );

  const p0 = toSvg(0, 0);
  const p1 = toSvg(bezier.x1, bezier.y1);
  const p2 = toSvg(bezier.x2, bezier.y2);
  const p3 = toSvg(1, 1);

  // Sample the curve for the preview dot animation reference line.
  const samples = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const y = evaluateEasing({ ...value, bezier }, t);
    return toSvg(t, y);
  });
  const pathD = samples.map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        onPointerMove={handleDrag}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
        style={{ background: 'var(--surface-2, #16161a)', borderRadius: 8, touchAction: 'none' }}
      >
        {/* grid */}
        {[0.25, 0.5, 0.75].map((g) => (
          <g key={g}>
            <line x1={PAD} x2={SIZE - PAD} y1={toSvg(0, g).y} y2={toSvg(0, g).y} stroke="var(--border, #2a2a30)" strokeWidth={1} />
            <line x1={toSvg(g, 0).x} x2={toSvg(g, 0).x} y1={PAD} y2={SIZE - PAD} stroke="var(--border, #2a2a30)" strokeWidth={1} />
          </g>
        ))}
        {/* curve */}
        <path d={pathD} fill="none" stroke="var(--accent, #7c9cff)" strokeWidth={2} />
        {/* control-point handles */}
        <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="var(--accent, #7c9cff)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
        <line x1={p3.x} y1={p3.y} x2={p2.x} y2={p2.y} stroke="var(--accent, #7c9cff)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
        <circle cx={p1.x} cy={p1.y} r={6} fill="#fff" stroke="var(--accent, #7c9cff)" strokeWidth={2}
          onPointerDown={() => setDragging('p1')} style={{ cursor: 'grab' }} />
        <circle cx={p2.x} cy={p2.y} r={6} fill="#fff" stroke="var(--accent, #7c9cff)" strokeWidth={2}
          onPointerDown={() => setDragging('p2')} style={{ cursor: 'grab' }} />
      </svg>

      <code style={{ fontSize: 12, opacity: 0.7 }}>
        cubic-bezier({bezier.x1.toFixed(2)}, {bezier.y1.toFixed(2)}, {bezier.x2.toFixed(2)}, {bezier.y2.toFixed(2)})
      </code>

      {PRESET_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{group.label}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {group.names.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ name: n })}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--border, #2a2a30)',
                  background: value.name === n ? 'var(--accent, #7c9cff)' : 'transparent',
                  color: value.name === n ? '#000' : 'inherit',
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Steps</div>
        <button
          onClick={() => onChange({ name: 'steps', steps: 4, stepPosition: 'jump-end' })}
          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border, #2a2a30)', cursor: 'pointer' }}
        >
          steps(4)
        </button>
      </div>
    </div>
  );
}
