/**
 * components/responsive/FloatingActionButton.tsx
 *
 * Corner FAB with speed-dial expansion (section 6). Positions itself
 * within safe-area insets so it never sits under a notch or the home
 * indicator bar.
 */

import React, { useState } from "react";
import { useSafeAreaInsets } from "../../lib/responsive/hooks";
import { cx } from "../../lib/responsive/styles";

export interface FabAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** Optional keyboard shortcut hint, e.g. "V" or "⌘Z". */
  shortcutHint?: string;
}

export interface FloatingActionButtonProps {
  icon: React.ReactNode;
  actions: FabAction[];
  corner?: "bottom-right" | "bottom-left";
  label?: string;
}

export function FloatingActionButton({
  icon,
  actions,
  corner = "bottom-right",
  label = "Actions",
}: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const cornerClass = corner === "bottom-right" ? "right-4 items-end" : "left-4 items-start";

  return (
    <div
      className={cx("fixed z-40 flex flex-col gap-3", cornerClass)}
      style={{
        bottom: `max(1.5rem, ${insets.bottom}px)`,
      }}
    >
      {open && (
        <ul className="flex flex-col gap-3" role="menu" aria-label={label}>
          {actions.map((action) => (
            <li key={action.id} className="flex items-center gap-3" role="none">
              {corner === "bottom-right" && (
                <span className="rounded-md bg-black/70 px-2 py-1 text-xs text-white whitespace-nowrap">
                  {action.label}
                  {action.shortcutHint && (
                    <span className="ml-1 opacity-60 font-mono">{action.shortcutHint}</span>
                  )}
                </span>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  action.onSelect();
                  setOpen(false);
                }}
                className={cx(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  "bg-[var(--surface-2,#2a2a2e)] text-[var(--text,#f2f2f2)] shadow-lg",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
                )}
              >
                {action.icon}
              </button>
              {corner === "bottom-left" && (
                <span className="rounded-md bg-black/70 px-2 py-1 text-xs text-white whitespace-nowrap">
                  {action.label}
                  {action.shortcutHint && (
                    <span className="ml-1 opacity-60 font-mono">{action.shortcutHint}</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-[var(--accent,#5b8def)] text-white shadow-xl",
          "transition-transform duration-150 ease-out",
          open && "rotate-45",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        )}
      >
        {icon}
      </button>
    </div>
  );
}

export default FloatingActionButton;
