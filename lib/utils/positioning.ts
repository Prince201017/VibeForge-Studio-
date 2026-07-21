/**
 * [ForgeOS UI] Minimal floating-element positioning helper.
 * Computes a top/left pixel position for a floating element (tooltip,
 * popover, dropdown, menu) relative to an anchor, with viewport-edge
 * flipping. Intentionally dependency-free (no @floating-ui/react) so the
 * bundle stays small; swap in a full library later if requirements grow.
 */

import type { Placement } from "../types";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ComputedPosition {
  top: number;
  left: number;
  placement: Placement;
}

const GAP = 8;

export function computePosition(
  anchor: Rect,
  floating: Rect,
  preferred: Placement = "bottom",
  viewport: { width: number; height: number } = {
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }
): ComputedPosition {
  const fits = (placement: Placement): boolean => {
    switch (placement) {
      case "top":
        return anchor.top - floating.height - GAP >= 0;
      case "bottom":
        return anchor.top + anchor.height + floating.height + GAP <= viewport.height;
      case "left":
        return anchor.left - floating.width - GAP >= 0;
      case "right":
        return anchor.left + anchor.width + floating.width + GAP <= viewport.width;
      default:
        return true;
    }
  };

  const fallbackOrder: Placement[] = ["bottom", "top", "right", "left"];
  const placement = fits(preferred)
    ? preferred
    : fallbackOrder.find(fits) ?? preferred;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = anchor.top - floating.height - GAP;
      left = anchor.left + anchor.width / 2 - floating.width / 2;
      break;
    case "bottom":
      top = anchor.top + anchor.height + GAP;
      left = anchor.left + anchor.width / 2 - floating.width / 2;
      break;
    case "left":
      top = anchor.top + anchor.height / 2 - floating.height / 2;
      left = anchor.left - floating.width - GAP;
      break;
    case "right":
      top = anchor.top + anchor.height / 2 - floating.height / 2;
      left = anchor.left + anchor.width + GAP;
      break;
  }

  // Clamp horizontally/vertically within viewport with a small margin.
  left = Math.max(GAP, Math.min(left, viewport.width - floating.width - GAP));
  top = Math.max(GAP, Math.min(top, viewport.height - floating.height - GAP));

  return { top, left, placement };
}
