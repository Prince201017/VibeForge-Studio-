// [CSS.A10] css-generator.ts
// Lightweight, dependency-free CSS generator that runs entirely in the
// browser so LivePreview can render at 60fps without a network round trip.
// The authoritative/export version of this logic lives in
// backend/services/css_generator.py — the two must stay in sync; the Python
// service is the source of truth for final downloads (adds vendor prefixes,
// minification, source maps).

import type { AnimationConfig, AnimationTrack, PropertyKeyframe } from './types';
import { PROPERTY_REGISTRY } from './properties';
import { easingToCSS } from './easing';

function formatValue(track: AnimationTrack, kf: PropertyKeyframe): string {
  const meta = PROPERTY_REGISTRY[track.property];
  const unit = kf.unit ?? meta.defaultUnit;
  const raw = typeof kf.value === 'number' ? `${kf.value}${unit}` : String(kf.value);

  if (meta.cssProperty === 'transform' && meta.transformFn) {
    return `${meta.transformFn}(${raw})`;
  }
  if (meta.cssProperty === 'filter' && meta.filterFn) {
    return `${meta.filterFn}(${raw})`;
  }
  return raw;
}

/** Groups tracks that share the same host CSS property (transform, filter) into one value per offset. */
function buildOffsetMap(tracks: AnimationTrack[]): Map<number, Record<string, string[]>> {
  const offsets = new Map<number, Record<string, string[]>>();
  for (const track of tracks.filter((t) => t.enabled)) {
    const meta = PROPERTY_REGISTRY[track.property];
    for (const kf of track.keyframes) {
      const bucket = offsets.get(kf.offset) ?? {};
      const groupKey = meta.cssProperty === 'transform' ? 'transform'
        : meta.cssProperty === 'filter' ? 'filter'
        : meta.cssProperty;
      bucket[groupKey] = bucket[groupKey] ?? [];
      bucket[groupKey].push(formatValue(track, kf));
      offsets.set(kf.offset, bucket);
    }
  }
  return offsets;
}

export function generateKeyframesCSS(config: AnimationConfig): string {
  const offsets = buildOffsetMap(config.tracks);
  const sorted = Array.from(offsets.keys()).sort((a, b) => a - b);

  const body = sorted
    .map((offset) => {
      const props = offsets.get(offset)!;
      const decls = Object.entries(props)
        .map(([cssProp, values]) => `    ${cssProp}: ${values.join(' ')};`)
        .join('\n');
      const pct = `${Math.round(offset * 100)}%`;
      return `  ${pct} {\n${decls}\n  }`;
    })
    .join('\n');

  return `@keyframes ${config.name} {\n${body}\n}`;
}

export function generateAnimationShorthand(config: AnimationConfig): string {
  const { timing } = config;
  const dur = `${timing.durationMs}ms`;
  const delay = `${timing.delayMs}ms`;
  const iter = timing.iterationCount === 'infinite' ? 'infinite' : String(timing.iterationCount);
  const easing = easingToCSS(timing.easing);
  return `animation: ${config.name} ${dur} ${easing} ${delay} ${iter} ${timing.direction} ${timing.fillMode};`;
}

export function generateFullCSS(config: AnimationConfig, opts: { vendorPrefixes?: boolean } = {}): string {
  const keyframes = generateKeyframesCSS(config);
  const shorthand = generateAnimationShorthand(config);
  const prefixed = opts.vendorPrefixes
    ? ['-webkit-', '-moz-'].map((p) => `  ${p}${shorthand}`).join('\n') + '\n'
    : '';

  const trigger = config.trigger === 'hover' ? `:hover` : '';
  const selector = trigger ? `${config.selector}${trigger}` : config.selector;

  return [
    keyframes,
    '',
    `${selector} {`,
    prefixed,
    `  ${shorthand}`,
    `}`,
  ].join('\n');
}

/** Rough size estimate for the "Generated code size" bundle-size warning (Performance Optimization). */
export function estimateCSSByteSize(css: string): number {
  return new TextEncoder().encode(css).length;
}
