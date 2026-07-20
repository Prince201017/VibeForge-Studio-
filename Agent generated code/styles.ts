/**
 * lib/responsive/styles.ts
 *
 * Small style-computation helpers that don't belong in a component but
 * are reused across several (safe-area padding, touch target class
 * merging, responsive srcset builders).
 */

import type { SafeAreaInsets } from "./hooks";

/** CSS `max()` expressions for safe-area padding, with a sensible minimum floor. */
export function getSafeAreaPadding(minPx = 16) {
  return {
    paddingTop: `max(${minPx}px, env(safe-area-inset-top))`,
    paddingRight: `max(${minPx}px, env(safe-area-inset-right))`,
    paddingBottom: `max(${minPx}px, env(safe-area-inset-bottom))`,
    paddingLeft: `max(${minPx}px, env(safe-area-inset-left))`,
  } as const;
}

/** Turns measured SafeAreaInsets (from useSafeAreaInsets) into an inline style object. */
export function safeAreaInsetsToStyle(
  insets: SafeAreaInsets,
  extra: Partial<Record<"top" | "right" | "bottom" | "left", number>> = {},
) {
  return {
    paddingTop: insets.top + (extra.top ?? 0),
    paddingRight: insets.right + (extra.right ?? 0),
    paddingBottom: insets.bottom + (extra.bottom ?? 0),
    paddingLeft: insets.left + (extra.left ?? 0),
  };
}

/** Minimal className joiner so this package has no dependency on `clsx`. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Tailwind class fragment enforcing the 48x48px minimum touch target,
 * with 10-15px of tappable padding around visually smaller icons.
 */
export const TOUCH_TARGET_CLASS = "min-h-[48px] min-w-[48px] flex items-center justify-center";

/** Tailwind class fragment for the 44px minimum input/menu-item height. */
export const MIN_INPUT_CLASS = "min-h-[44px]";

export interface ResponsiveImageSource {
  src: string;
  widthPx: number;
}

/**
 * Builds `srcset` + `sizes` attributes for responsive images, per the
 * spec's mobile/tablet/desktop breakpoint table.
 */
export function buildResponsiveImageAttrs(sources: ResponsiveImageSource[]) {
  const sorted = [...sources].sort((a, b) => a.widthPx - b.widthPx);
  const srcSet = sorted.map((s) => `${s.src} ${s.widthPx}w`).join(", ");
  const sizes = "(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1280px";
  const fallback = sorted[sorted.length - 1]?.src ?? "";
  return { srcSet, sizes, src: fallback };
}

/** Clamp helper used by drag/resize/gesture math throughout the responsive layer. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
