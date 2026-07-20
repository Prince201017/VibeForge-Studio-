// [CSS.A10] TimelineEditor.tsx
import { useRef, useState } from 'react';
import type { AnimationTrack, PropertyKeyframe } from '../../lib/css-animation/types';
import { PROPERTY_REGISTRY } from '../../lib/css-animation/properties';

interface TimelineEditorProps {
  tracks: AnimationTrack[];
  durationMs: number;
  progress: number; // 0..1, drives the playhead
  onKeyframeMove: (trackId: string, keyframeIndex: number, offset: number) => void;
  onScrub: (offset: number) => void;
}

const ROW_HEIGHT = 32;
const TRACK_LABEL_WIDTH = 120;

export default function TimelineEditor({ tracks, durationMs, progress, onKeyframeMove, onScrub }: TimelineEditorProps) {
  const trackAreaRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{ trackId: string; index: number } | null>(null);

  const offsetFromEvent = (clientX: number): number => {
    if (!trackAreaRef.current) return 0;
    const rect = trackAreaRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onKeyframeMove(dragging.trackId, dragging.index, offsetFromEvent(e.clientX));
  };

  const handleRulerClick = (e: React.MouseEvent) => {
    onScrub(offsetFromEvent(e.clientX));
  };

  const enabledTracks = tracks.filter((t) => t.enabled);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerLeave={() => setDragging(null)}
      style={{ userSelect: 'none' }}
    >
      {/* Ruler */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        <div style={{ width: TRACK_LABEL_WIDTH, flexShrink: 0 }} />
        <div
          onClick={handleRulerClick}
          style={{
            flex: 1,
            height: 20,
            position: 'relative',
            borderBottom: '1px solid #2a2a30',
            cursor: 'pointer',
          }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} style={{ position: 'absolute', left: `${t * 100}%`, top: 0, fontSize: 10, opacity: 0.5, transform: 'translateX(-50%)' }}>
              {Math.round(t * durationMs)}ms
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div style={{ position: 'relative' }}>
        {enabledTracks.map((track) => (
          <div key={track.id} style={{ display: 'flex', height: ROW_HEIGHT, alignItems: 'center' }}>
            <div style={{ width: TRACK_LABEL_WIDTH, flexShrink: 0, fontSize: 12, opacity: 0.8, paddingRight: 8 }}>
              {PROPERTY_REGISTRY[track.property].label}
            </div>
            <div ref={track === enabledTracks[0] ? trackAreaRef : undefined} style={{ flex: 1, position: 'relative', height: '100%', background: '#111114', borderRadius: 4 }}>
              {/* connecting line */}
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#2a2a30' }} />
              {[...track.keyframes]
                .sort((a, b) => a.offset - b.offset)
                .map((kf: PropertyKeyframe, i: number) => (
                  <div
                    key={i}
                    onPointerDown={() => setDragging({ trackId: track.id, index: i })}
                    title={`${kf.offset.toFixed(2)} → ${kf.value}${kf.unit ?? ''}`}
                    style={{
                      position: 'absolute',
                      left: `${kf.offset * 100}%`,
                      top: '50%',
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: 'var(--accent, #7c9cff)',
                      transform: 'translate(-50%, -50%) rotate(45deg)',
                      cursor: 'grab',
                      boxShadow: '0 0 0 2px #0d0d10',
                    }}
                  />
                ))}
            </div>
          </div>
        ))}

        {/* Playhead, spans all tracks */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: TRACK_LABEL_WIDTH + progress * (100 - 0),
            width: 1,
            background: '#ff5c7a',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
