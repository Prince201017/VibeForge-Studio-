/**
 * [ParticleEngine] Property-over-lifetime evaluation.
 *
 * Evaluates CurveKeyframe[] and ColorStop[] gradients at a normalized
 * lifetime `t` (0 = spawn, 1 = death), applying per-segment easing.
 */

import type { ColorStop, CurveKeyframe, EasingFunction, RGBA } from './types';

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

const EASINGS: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1) * (2 * Math.PI)) / p);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / p) + 1;
  },
  step: (t) => (t < 1 ? 0 : 1),
};

export function applyEasing(fn: EasingFunction | undefined, t: number): number {
  return EASINGS[fn ?? 'linear'](Math.min(1, Math.max(0, t)));
}

// ---------------------------------------------------------------------------
// Numeric curve evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a sparse set of keyframes at normalized life `t`, interpolating
 * between the two nearest keyframes using the easing declared on the
 * segment's end keyframe. Keyframes need not be pre-sorted.
 */
export function evaluateCurve(keyframes: CurveKeyframe[], t: number): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  const sorted = [...keyframes].sort((a, b) => a.t - b.t);
  t = Math.min(1, Math.max(0, t));

  if (t <= sorted[0].t) return sorted[0].value;
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].value;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1e-6;
      const localT = (t - a.t) / span;
      const eased = applyEasing(b.easing, localT);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return sorted[sorted.length - 1].value;
}

// ---------------------------------------------------------------------------
// Color gradient evaluation
// ---------------------------------------------------------------------------

export function evaluateColorGradient(stops: ColorStop[], t: number): RGBA {
  if (stops.length === 0) return { r: 255, g: 255, b: 255, a: 1 };
  if (stops.length === 1) return stops[0].color;

  const sorted = [...stops].sort((a, b) => a.t - b.t);
  t = Math.min(1, Math.max(0, t));

  if (t <= sorted[0].t) return sorted[0].color;
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].color;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1e-6;
      const localT = (t - a.t) / span;
      return {
        r: a.color.r + (b.color.r - a.color.r) * localT,
        g: a.color.g + (b.color.g - a.color.g) * localT,
        b: a.color.b + (b.color.b - a.color.b) * localT,
        a: a.color.a + (b.color.a - a.color.a) * localT,
      };
    }
  }
  return sorted[sorted.length - 1].color;
}

// ---------------------------------------------------------------------------
// Randomization helpers used at spawn time
// ---------------------------------------------------------------------------

/** Simple mulberry32 PRNG — deterministic per-seed for reproducible spawns. */
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function randomInCone(rand: () => number, direction: { x: number; y: number; z: number }, spreadRadians: number) {
  // Sample a random direction within `spreadRadians` of `direction`.
  const dLen = Math.hypot(direction.x, direction.y, direction.z) || 1;
  const dx = direction.x / dLen, dy = direction.y / dLen, dz = direction.z / dLen;

  const cosSpread = Math.cos(spreadRadians);
  const z = randomRange(rand, cosSpread, 1);
  const phi = randomRange(rand, 0, Math.PI * 2);
  const sinTheta = Math.sqrt(1 - z * z);
  const localX = sinTheta * Math.cos(phi);
  const localY = sinTheta * Math.sin(phi);

  // Build an orthonormal basis around the direction vector
  const up = Math.abs(dy) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const tx = up.y * dz - up.z * dy;
  const ty = up.z * dx - up.x * dz;
  const tz = up.x * dy - up.y * dx;
  const tLen = Math.hypot(tx, ty, tz) || 1;
  const nx = tx / tLen, ny = ty / tLen, nz = tz / tLen;
  const bx = dy * nz - dz * ny;
  const by = dz * nx - dx * nz;
  const bz = dx * ny - dy * nx;

  return {
    x: nx * localX + bx * localY + dx * z,
    y: ny * localX + by * localY + dy * z,
    z: nz * localX + bz * localY + dz * z,
  };
}
