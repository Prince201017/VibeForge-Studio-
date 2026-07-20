// [V0.A13] Touch gesture handling for viewport pan/zoom/rotate on mobile/tablet —
// feeds camera updates into 05-viewport-renderer's Camera type.
import { useRef, useCallback } from "react";

export interface GestureState {
  scale: number;
  translateX: number;
  translateY: number;
}

function distance(t1: Touch, t2: Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function midpoint(t1: Touch, t2: Touch): { x: number; y: number } {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

export function usePinchPan(onChange: (state: GestureState) => void) {
  const lastDistance = useRef<number | null>(null);
  const lastMidpoint = useRef<{ x: number; y: number } | null>(null);
  const state = useRef<GestureState>({ scale: 1, translateX: 0, translateY: 0 });

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = distance(e.touches[0], e.touches[1]);
      lastMidpoint.current = midpoint(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1) {
      lastMidpoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null && lastMidpoint.current) {
      const newDist = distance(e.touches[0], e.touches[1]);
      const newMid = midpoint(e.touches[0], e.touches[1]);
      const scaleFactor = newDist / lastDistance.current;
      state.current = {
        scale: state.current.scale * scaleFactor,
        translateX: state.current.translateX + (newMid.x - lastMidpoint.current.x),
        translateY: state.current.translateY + (newMid.y - lastMidpoint.current.y),
      };
      lastDistance.current = newDist;
      lastMidpoint.current = newMid;
      onChange(state.current);
    } else if (e.touches.length === 1 && lastMidpoint.current) {
      const t = e.touches[0];
      state.current = {
        ...state.current,
        translateX: state.current.translateX + (t.clientX - lastMidpoint.current.x),
        translateY: state.current.translateY + (t.clientY - lastMidpoint.current.y),
      };
      lastMidpoint.current = { x: t.clientX, y: t.clientY };
      onChange(state.current);
    }
  }, [onChange]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) lastDistance.current = null;
    if (e.touches.length === 0) lastMidpoint.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/** Simple tap-vs-drag disambiguation, needed since touchstart/touchend alone can't tell. */
export function useTapDetector(onTap: (x: number, y: number) => void, maxMoveDistance = 10) {
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    startPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (!startPos.current || !t) return;
    const moved = Math.hypot(t.clientX - startPos.current.x, t.clientY - startPos.current.y);
    if (moved < maxMoveDistance) onTap(t.clientX, t.clientY);
    startPos.current = null;
  }, [onTap, maxMoveDistance]);

  return { onTouchStart, onTouchEnd };
}
