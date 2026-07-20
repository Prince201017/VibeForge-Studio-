// [CSS.A10] easing.ts
// Easing curve library used by EasingEditor (visual Bézier editor) and every
// code generator. Two responsibilities:
//   1. Runtime evaluation (0..1 -> 0..1) for the LivePreview scrubber & canvas
//   2. Serialization to CSS `cubic-bezier()` / `steps()` strings and to the
//      per-framework ease token each export target expects.

import type { Easing, CubicBezier, EasingName } from './types';

// --- Named cubic-bezier presets (CSS spec + common design-tool curves) ----
export const BEZIER_PRESETS: Record<string, CubicBezier> = {
  linear:        { x1: 0,    y1: 0,    x2: 1,    y2: 1 },
  ease:          { x1: 0.25, y1: 0.1,  x2: 0.25, y2: 1 },
  'ease-in':     { x1: 0.42, y1: 0,    x2: 1,    y2: 1 },
  'ease-out':    { x1: 0,    y1: 0,    x2: 0.58, y2: 1 },
  'ease-in-out': { x1: 0.42, y1: 0,    x2: 0.58, y2: 1 },
  power1:        { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  power2:        { x1: 0.25, y1: 0.46, x2: 0.45, y2: 0.94 },
  power3:        { x1: 0.165,y1: 0.84, x2: 0.44, y2: 1 },
  power4:        { x1: 0.19, y1: 1,    x2: 0.22, y2: 1 },
  'back-in':     { x1: 0.36, y1: 0,    x2: 0.66, y2: -0.56 },
  'back-out':    { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
  'back-in-out': { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 },
};

/** Evaluate a cubic bezier at parametric t, returning progress y for input x (Newton-Raphson). */
export function evaluateBezier(bezier: CubicBezier, x: number): number {
  const { x1, y1, x2, y2 } = bezier;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = x;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleX(t) - x;
    const d = sampleDerivX(t);
    if (Math.abs(currentX) < 1e-6) break;
    if (Math.abs(d) < 1e-6) break;
    t -= currentX / d;
  }
  return sampleY(Math.max(0, Math.min(1, t)));
}

/** Elastic ease-out approximation, matches GSAP's default elastic feel. */
export function evaluateElastic(t: number, amplitude = 1, period = 0.3): number {
  if (t === 0 || t === 1) return t;
  const s = (period / (2 * Math.PI)) * Math.asin(1 / Math.max(amplitude, 1));
  return (
    Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1
  );
}

/** Standard bounce-out approximation. */
export function evaluateBounce(t: number): number {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1;
  return n1 * t * t + 0.984375;
}

export function evaluateSteps(t: number, steps: number, position: string = 'jump-end'): number {
  const stepped = Math.floor(t * steps);
  const clampFn = (v: number) => Math.max(0, Math.min(steps, v));
  switch (position) {
    case 'jump-start':
    case 'start':
      return clampFn(stepped + 1) / steps;
    case 'jump-both':
      return clampFn(stepped + 1) / (steps + 1);
    case 'jump-none':
      return clampFn(stepped) / (steps - 1);
    default: // jump-end / end
      return clampFn(stepped) / steps;
  }
}

/** Master evaluator: given an Easing descriptor and t in [0,1], return progress in [0,1]. */
export function evaluateEasing(easing: Easing, t: number): number {
  t = Math.max(0, Math.min(1, t));
  switch (easing.name) {
    case 'steps':
      return evaluateSteps(t, easing.steps ?? 4, easing.stepPosition ?? 'jump-end');
    case 'elastic-in':
      return 1 - evaluateElastic(1 - t, easing.amplitude, easing.period);
    case 'elastic-out':
      return evaluateElastic(t, easing.amplitude, easing.period);
    case 'elastic-in-out':
      return t < 0.5
        ? (1 - evaluateElastic(1 - 2 * t, easing.amplitude, easing.period)) / 2
        : (evaluateElastic(2 * t - 1, easing.amplitude, easing.period) + 1) / 2;
    case 'bounce-in':
      return 1 - evaluateBounce(1 - t);
    case 'bounce-out':
      return evaluateBounce(t);
    case 'bounce-in-out':
      return t < 0.5
        ? (1 - evaluateBounce(1 - 2 * t)) / 2
        : (evaluateBounce(2 * t - 1) + 1) / 2;
    case 'custom-bezier':
      return evaluateBezier(easing.bezier ?? BEZIER_PRESETS.ease, t);
    default:
      return evaluateBezier(BEZIER_PRESETS[easing.name] ?? BEZIER_PRESETS.ease, t);
  }
}

/** Serialize an Easing to a valid CSS `animation-timing-function` value. */
export function easingToCSS(easing: Easing): string {
  if (easing.name === 'steps') {
    return `steps(${easing.steps ?? 4}, ${easing.stepPosition ?? 'jump-end'})`;
  }
  if (easing.name === 'custom-bezier' && easing.bezier) {
    const { x1, y1, x2, y2 } = easing.bezier;
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  }
  // Curves with no native CSS keyword (elastic/bounce/power) get baked to
  // their closest cubic-bezier approximation for CSS export.
  const nonNativeCSS: EasingName[] = [
    'power1', 'power2', 'power3', 'power4',
    'back-in', 'back-out', 'back-in-out',
    'elastic-in', 'elastic-out', 'elastic-in-out',
    'bounce-in', 'bounce-out', 'bounce-in-out',
  ];
  if (nonNativeCSS.includes(easing.name)) {
    const b = BEZIER_PRESETS[easing.name] ?? BEZIER_PRESETS.ease;
    return `cubic-bezier(${b.x1}, ${b.y1}, ${b.x2}, ${b.y2})`;
  }
  return easing.name; // linear / ease / ease-in / ease-out / ease-in-out
}

/** Map an Easing to the string GSAP expects, e.g. "power2.inOut", "elastic.out(1, 0.3)". */
export function easingToGSAP(easing: Easing): string {
  const m: Partial<Record<EasingName, string>> = {
    linear: 'none',
    ease: 'power1.inOut',
    'ease-in': 'power1.in',
    'ease-out': 'power1.out',
    'ease-in-out': 'power1.inOut',
    power1: 'power1.inOut',
    power2: 'power2.inOut',
    power3: 'power3.inOut',
    power4: 'power4.inOut',
    'back-in': 'back.in(1.7)',
    'back-out': 'back.out(1.7)',
    'back-in-out': 'back.inOut(1.7)',
  };
  if (m[easing.name]) return m[easing.name]!;
  if (easing.name.startsWith('elastic')) {
    const dir = easing.name.split('-')[1] ?? 'out';
    return `elastic.${dir}(${easing.amplitude ?? 1}, ${easing.period ?? 0.3})`;
  }
  if (easing.name.startsWith('bounce')) {
    const dir = easing.name.split('-')[1] ?? 'out';
    return `bounce.${dir}`;
  }
  if (easing.name === 'steps') return `steps(${easing.steps ?? 4})`;
  if (easing.name === 'custom-bezier' && easing.bezier) {
    const b = easing.bezier;
    return `CustomEase.create("custom", "M0,0 C${b.x1},${b.y1} ${b.x2},${b.y2} 1,1")`;
  }
  return 'power1.inOut';
}

/** Map an Easing to a Framer Motion transition-friendly value. */
export function easingToFramerMotion(easing: Easing): string | number[] {
  if (easing.name === 'custom-bezier' && easing.bezier) {
    const { x1, y1, x2, y2 } = easing.bezier;
    return [x1, y1, x2, y2];
  }
  const named: Partial<Record<EasingName, string>> = {
    linear: 'linear',
    ease: 'easeInOut',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
    'back-in': 'backIn',
    'back-out': 'backOut',
    'back-in-out': 'backInOut',
    'elastic-in': 'anticipate',
    'elastic-out': 'anticipate',
  };
  return named[easing.name] ?? 'easeInOut';
}

export const DEFAULT_EASING: Easing = { name: 'ease-in-out' };
