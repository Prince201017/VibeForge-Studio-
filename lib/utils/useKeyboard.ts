/**
 * [ForgeOS UI] Binds a single key to a handler, active while `enabled`.
 * Used for Escape-to-close in Modal/Drawer/Popover and shortcuts in
 * CommandPalette/Menu.
 */
import { useEffect } from "react";

export function useKeyboard(
  key: string,
  handler: (event: KeyboardEvent) => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === key) handler(event);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [key, handler, enabled]);
}
