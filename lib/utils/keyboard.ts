/**
 * [ForgeOS UI] Keyboard constants + helpers shared by menus, selects,
 * tabs, and dialogs to keep key handling consistent across components.
 */

export const Keys = {
  Enter: "Enter",
  Space: " ",
  Escape: "Escape",
  Tab: "Tab",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
} as const;

export function isActivationKey(key: string): boolean {
  return key === Keys.Enter || key === Keys.Space;
}

/** Move focus/selection index within a bounded, optionally looping list. */
export function nextIndex(current: number, length: number, delta: number, loop = true): number {
  if (length === 0) return -1;
  let next = current + delta;
  if (loop) {
    next = ((next % length) + length) % length;
  } else {
    next = Math.max(0, Math.min(length - 1, next));
  }
  return next;
}

/** Focuses the first focusable descendant of a container, if any. */
export function focusFirst(container: HTMLElement | null): void {
  if (!container) return;
  const focusable = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus();
}
