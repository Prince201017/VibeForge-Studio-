// [Claude.A3] Curve/graph-editor helpers: convert a keyframe track into an editable
// bezier-handle curve, and back, for a visual animation graph editor.
import { Keyframe } from "./timeline";

export interface CurveHandle {
  keyframeIndex: number;
  inHandle: { dt: number; dv: number };  // relative offsets from keyframe
  outHandle: { dt: number; dv: number };
}

export function defaultHandles(keyframes: Keyframe<number>[]): CurveHandle[] {
  return keyframes.map((kf, i) => {
    const prev = keyframes[i - 1];
    const next = keyframes[i + 1];
    const dtIn = prev ? (kf.time - prev.time) / 3 : 0.1;
    const dtOut = next ? (next.time - kf.time) / 3 : 0.1;
    return {
      keyframeIndex: i,
      inHandle: { dt: -dtIn, dv: 0 },
      outHandle: { dt: dtOut, dv: 0 },
    };
  });
}

/** Snap a dragged handle to auto-mirror the opposite handle for a smooth curve. */
export function mirrorHandle(handle: CurveHandle, edited: "in" | "out"): CurveHandle {
  if (edited === "in") {
    return { ...handle, outHandle: { dt: -handle.inHandle.dt, dv: -handle.inHandle.dv } };
  }
  return { ...handle, inHandle: { dt: -handle.outHandle.dt, dv: -handle.outHandle.dv } };
}

export function curveToSvgPath(keyframes: Keyframe<number>[], handles: CurveHandle[], xScale: number, yScale: number): string {
  if (keyframes.length === 0) return "";
  let d = `M ${keyframes[0].time * xScale} ${keyframes[0].value * yScale}`;
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i], b = keyframes[i + 1];
    const ha = handles[i], hb = handles[i + 1];
    const c1x = (a.time + ha.outHandle.dt) * xScale, c1y = (a.value + ha.outHandle.dv) * yScale;
    const c2x = (b.time + hb.inHandle.dt) * xScale, c2y = (b.value + hb.inHandle.dv) * yScale;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.time * xScale} ${b.value * yScale}`;
  }
  return d;
}
