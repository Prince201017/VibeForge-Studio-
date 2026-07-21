/**
 * lib/responsive/gestures.ts
 *
 * Touch gesture primitives (14_MOBILE_RESPONSIVE_NEEDS.md, section 7).
 * Implemented directly on top of native Pointer Events rather than a
 * third-party gesture library, so ForgeOS has zero extra runtime
 * dependency for a fairly small, well-understood surface area:
 *
 *   - usePinchZoom     -> two-finger pinch to zoom (viewport)
 *   - useSwipe         -> swipe left/right/up/down
 *   - useLongPress     -> long-press for context menu
 *   - useDoubleTap     -> double-tap to focus
 *   - useTwoFingerTap  -> two-finger tap to undo
 *
 * All hooks return a `bind` object of event handlers to spread onto the
 * target element: `<div {...bind}>`. This keeps them framework-idiomatic
 * (no ref forwarding gymnastics) and composable (multiple gesture hooks
 * can be bound to the same element by merging their handler objects).
 */

import { useCallback, useRef } from "react";
import { PERFORMANCE_SLAS } from "./breakpoints";

type PointerHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
};

/* -------------------------------------------------------------------- */
/* Pinch to zoom                                                        */
/* -------------------------------------------------------------------- */

export interface PinchZoomOptions {
  /** Minimum scale factor allowed (default 1). */
  minScale?: number;
  /** Maximum scale factor allowed (default 5, matches viewport meta tag). */
  maxScale?: number;
}

/**
 * Two-finger pinch to zoom. Calls `onZoom(scale, center)` continuously
 * while both pointers are down, where `scale` is the delta multiplier
 * since the previous callback (not cumulative) and `center` is the
 * midpoint between the two touch points in client coordinates -- useful
 * for zooming around the pinch focus rather than the viewport origin.
 */
export function usePinchZoom(
  onZoom: (scale: number, center: { x: number; y: number }) => void,
  options: PinchZoomOptions = {},
): PointerHandlers {
  const { minScale = 1, maxScale = 5 } = options;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastDistance = useRef<number | null>(null);
  const cumulativeScale = useRef(1);

  const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      lastDistance.current = distanceBetween(a, b);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size !== 2 || lastDistance.current == null) return;

      const [a, b] = Array.from(pointers.current.values());
      const distance = distanceBetween(a, b);
      const rawScale = distance / lastDistance.current;

      const nextCumulative = Math.min(
        maxScale,
        Math.max(minScale, cumulativeScale.current * rawScale),
      );
      const clampedDelta = nextCumulative / cumulativeScale.current;
      cumulativeScale.current = nextCumulative;
      lastDistance.current = distance;

      onZoom(clampedDelta, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    },
    [maxScale, minScale, onZoom],
  );

  const release = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastDistance.current = null;
    }
    if (pointers.current.size === 0) {
      cumulativeScale.current = 1;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: release,
    onPointerCancel: release,
  };
}

/* -------------------------------------------------------------------- */
/* Swipe                                                                 */
/* -------------------------------------------------------------------- */

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface SwipeOptions {
  /** Minimum travel distance (px) before a gesture counts as a swipe. Default 50. */
  minDistance?: number;
  /** Maximum time (ms) the gesture may take. Default matches gesture recognition SLA. */
  maxDurationMs?: number;
}

/** Single-finger swipe detection in any of the four cardinal directions. */
export function useSwipe(
  onSwipe: (direction: SwipeDirection, distancePx: number) => void,
  options: SwipeOptions = {},
): PointerHandlers {
  const { minDistance = 50, maxDurationMs = PERFORMANCE_SLAS.gestureRecognitionMs * 5 } = options;
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, []);

  const onPointerMove = useCallback((_e: React.PointerEvent) => {
    // No-op: swipe is evaluated on release. Kept for symmetry with the
    // PointerHandlers shape and to allow future live-preview support.
  }, []);

  const finish = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const dt = performance.now() - start.current.t;
      start.current = null;

      if (dt > maxDurationMs) return;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const distance = Math.max(absX, absY);
      if (distance < minDistance) return;

      if (absX > absY) {
        onSwipe(dx > 0 ? "right" : "left", absX);
      } else {
        onSwipe(dy > 0 ? "down" : "up", absY);
      }
    },
    [maxDurationMs, minDistance, onSwipe],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

/* -------------------------------------------------------------------- */
/* Long press                                                            */
/* -------------------------------------------------------------------- */

export interface LongPressOptions {
  /** Duration (ms) pointer must remain down. Default 500. */
  durationMs?: number;
  /** Movement tolerance (px) before the press is cancelled. Default 10. */
  moveTolerancePx?: number;
}

/** Long-press for context menu. Cancels if the pointer moves beyond tolerance. */
export function useLongPress(
  onLongPress: (e: React.PointerEvent) => void,
  options: LongPressOptions = {},
): PointerHandlers {
  const { durationMs = 500, moveTolerancePx = 10 } = options;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        onLongPress(e);
        clear();
      }, durationMs);
    },
    [clear, durationMs, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!origin.current) return;
      const dist = Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y);
      if (dist > moveTolerancePx) clear();
    },
    [clear, moveTolerancePx],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
  };
}

/* -------------------------------------------------------------------- */
/* Double tap                                                            */
/* -------------------------------------------------------------------- */

export interface DoubleTapOptions {
  /** Maximum gap (ms) between taps. Default 300. */
  maxDelayMs?: number;
}

/** Double-tap to focus. Fires only on the second tap within the delay window. */
export function useDoubleTap(
  onDoubleTap: (e: React.PointerEvent) => void,
  options: DoubleTapOptions = {},
): { onPointerUp: (e: React.PointerEvent) => void } {
  const { maxDelayMs = 300 } = options;
  const lastTap = useRef<number>(0);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const now = performance.now();
      if (now - lastTap.current <= maxDelayMs) {
        onDoubleTap(e);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    },
    [maxDelayMs, onDoubleTap],
  );

  return { onPointerUp };
}

/* -------------------------------------------------------------------- */
/* Two-finger tap (undo)                                                 */
/* -------------------------------------------------------------------- */

export interface TwoFingerTapOptions {
  /** Maximum movement (px) allowed for either finger to still count as a tap. Default 12. */
  moveTolerancePx?: number;
  /** Maximum duration (ms) the two fingers may be down. Default 250. */
  maxDurationMs?: number;
}

/** Two-finger tap, used as the canonical "undo" gesture on canvas/viewport. */
export function useTwoFingerTap(
  onTwoFingerTap: () => void,
  options: TwoFingerTapOptions = {},
): PointerHandlers {
  const { moveTolerancePx = 12, maxDurationMs = 250 } = options;
  const pointers = useRef(new Map<number, { x: number; y: number; t: number }>());
  const moved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (pointers.current.size > 2) moved.current = true; // a third finger disqualifies the gesture
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      if (!p) return;
      const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (dist > moveTolerancePx) moved.current = true;
    },
    [moveTolerancePx],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const p = pointers.current.get(e.pointerId);
      const hadTwo = pointers.current.size === 2;
      pointers.current.delete(e.pointerId);

      if (hadTwo && p && !moved.current && performance.now() - p.t <= maxDurationMs) {
        onTwoFingerTap();
      }
      if (pointers.current.size === 0) moved.current = false;
    },
    [maxDurationMs, onTwoFingerTap],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) moved.current = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
