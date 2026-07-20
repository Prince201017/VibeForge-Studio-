/**
 * lib/responsive/breakpoints.ts
 *
 * Central breakpoint constants for ForgeOS (14_MOBILE_RESPONSIVE_NEEDS.md).
 * These mirror the Tailwind config (md/lg/xl/2xl) so JS-driven layout
 * logic never drifts out of sync with the CSS breakpoints.
 *
 * The real breakpoint ladder starts at `tablet` (768px). `sm` (640px)
 * exists for completeness/third-party compatibility but does not drive
 * any layout decision on its own -- anything below `tablet` is "mobile".
 */

export const BREAKPOINTS = {
  mobile: 0,
  sm: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  xxl: 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export type DeviceClass = "mobile" | "tablet" | "desktop";

/**
 * Resolve a raw pixel width into a coarse device class used by
 * ResponsiveLayout and other high-level layout switches.
 *
 *   < 768px        -> mobile
 *   768px - 1023px -> tablet
 *   >= 1024px      -> desktop
 */
export function classifyWidth(widthPx: number): DeviceClass {
  if (widthPx >= BREAKPOINTS.desktop) return "desktop";
  if (widthPx >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export interface ViewportClassification {
  width: number;
  height: number;
  device: DeviceClass;
  orientation: "portrait" | "landscape";
}

export function classifyViewport(width: number, height: number): ViewportClassification {
  return {
    width,
    height,
    device: classifyWidth(width),
    orientation: height >= width ? "portrait" : "landscape",
  };
}

/** Minimum touch target size (px) enforced across all interactive controls. */
export const MIN_TOUCH_TARGET = 48;

/** Minimum height for text inputs / menu items per spec. */
export const MIN_INPUT_HEIGHT = 44;

/** Performance / UX SLA constants referenced by gesture + interaction code. */
export const PERFORMANCE_SLAS = {
  touchResponseMs: 100,
  gestureRecognitionMs: 200,
  targetFps: 60,
  maxCLS: 0.1,
  mobileLcpMs: 2500,
} as const;
