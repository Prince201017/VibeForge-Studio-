/**
 * [ParticleEngine] ParticleVisualizer — SVG-based in-viewport gizmo overlay
 * for an emitter: shows position handle, shape outline (sphere/box/line/
 * cylinder radius), and a direction+spread cone. Designed to sit in an
 * absolutely-positioned overlay layer above the WebGL viewport, with the
 * host app responsible for projecting world -> screen coordinates.
 */

import React from 'react';
import type { EmitterConfig } from '../types';

export interface ParticleVisualizerProps {
  emitter: EmitterConfig;
  /** Projects a world-space point to screen-space {x, y} pixels. */
  project: (point: { x: number; y: number; z: number }) => { x: number; y: number };
  onDragPosition?: (next: { x: number; y: number; z: number }) => void;
  width: number;
  height: number;
}

export function ParticleVisualizer({ emitter, project, onDragPosition, width, height }: ParticleVisualizerProps) {
  const center = project(emitter.position);

  const handleDrag = (e: React.MouseEvent<SVGCircleElement>) => {
    if (!onDragPosition) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...emitter.position };

    const onMove = (ev: MouseEvent) => {
      // Simple screen-space drag mapped 1:1 to world XY; host app can
      // substitute a proper unproject function via a custom onDragPosition.
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onDragPosition({ x: startPos.x + dx * 0.01, y: startPos.y - dy * 0.01, z: startPos.z });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {/* Direction cone */}
      <DirectionCone emitter={emitter} project={project} />

      {/* Shape outline */}
      <ShapeOutline emitter={emitter} project={project} />

      {/* Position handle */}
      <circle
        cx={center.x}
        cy={center.y}
        r={7}
        fill="#7c8cff"
        stroke="#fff"
        strokeWidth={1.5}
        style={{ pointerEvents: 'auto', cursor: 'grab' }}
        onMouseDown={handleDrag}
      />
      <text x={center.x + 12} y={center.y - 10} fill="#7c8cff" fontSize={11}>
        {emitter.shape}
      </text>
    </svg>
  );
}

function DirectionCone({ emitter, project }: Pick<ParticleVisualizerProps, 'emitter' | 'project'>) {
  const center = project(emitter.position);
  const dir = emitter.spawn.direction;
  const len = 40;
  const tip = project({
    x: emitter.position.x + dir.x * 2,
    y: emitter.position.y + dir.y * 2,
    z: emitter.position.z + dir.z * 2,
  });
  const angle = Math.atan2(tip.y - center.y, tip.x - center.x);
  const spread = emitter.spawn.directionSpread;

  const leftAngle = angle - spread;
  const rightAngle = angle + spread;
  const leftPoint = { x: center.x + Math.cos(leftAngle) * len, y: center.y + Math.sin(leftAngle) * len };
  const rightPoint = { x: center.x + Math.cos(rightAngle) * len, y: center.y + Math.sin(rightAngle) * len };

  return (
    <g opacity={0.5}>
      <line x1={center.x} y1={center.y} x2={tip.x} y2={tip.y} stroke="#ffcc66" strokeWidth={1.5} />
      <path
        d={`M ${center.x} ${center.y} L ${leftPoint.x} ${leftPoint.y} A ${len} ${len} 0 0 1 ${rightPoint.x} ${rightPoint.y} Z`}
        fill="#ffcc66"
        fillOpacity={0.12}
        stroke="#ffcc66"
        strokeOpacity={0.4}
      />
    </g>
  );
}

function ShapeOutline({ emitter, project }: Pick<ParticleVisualizerProps, 'emitter' | 'project'>) {
  const center = project(emitter.position);

  if (emitter.shape === 'sphere' && emitter.sphere) {
    const edge = project({
      x: emitter.position.x + emitter.sphere.radius,
      y: emitter.position.y,
      z: emitter.position.z,
    });
    const r = Math.hypot(edge.x - center.x, edge.y - center.y);
    return <circle cx={center.x} cy={center.y} r={r} fill="none" stroke="#88ffcc" strokeDasharray="4 3" strokeWidth={1} />;
  }

  if (emitter.shape === 'box' && emitter.box) {
    const half = { x: emitter.box.size.x / 2, y: emitter.box.size.y / 2 };
    const topLeft = project({ x: emitter.position.x - half.x, y: emitter.position.y + half.y, z: emitter.position.z });
    const bottomRight = project({ x: emitter.position.x + half.x, y: emitter.position.y - half.y, z: emitter.position.z });
    return (
      <rect
        x={Math.min(topLeft.x, bottomRight.x)}
        y={Math.min(topLeft.y, bottomRight.y)}
        width={Math.abs(bottomRight.x - topLeft.x)}
        height={Math.abs(bottomRight.y - topLeft.y)}
        fill="none"
        stroke="#88ffcc"
        strokeDasharray="4 3"
        strokeWidth={1}
      />
    );
  }

  if (emitter.shape === 'line' && emitter.line) {
    const start = project(emitter.line.start);
    const end = project(emitter.line.end);
    return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#88ffcc" strokeWidth={2} />;
  }

  return null;
}
