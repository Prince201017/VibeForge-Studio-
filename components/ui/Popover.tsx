/**
 * [ForgeOS UI] Popover
 * Click-to-open floating content container (property inspectors,
 * small forms, help text). Distinct from Tooltip (hover, text-only)
 * and Dropdown (menu semantics with roving item focus).
 */
import React, { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";
import { useKeyboard } from "../hooks/useKeyboard";
import { computePosition } from "../utils/positioning";
import type { Placement } from "../types";

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  placement?: Placement;
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({ trigger, children, placement = "bottom", className }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, () => setOpen(false), open);
  useKeyboard("Escape", () => setOpen(false), open);

  const handleOpen = () => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const pos = computePosition(anchor, { top: 0, left: 0, width: 280, height: 160 }, placement);
    setCoords(pos);
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            style={{ position: "fixed", top: coords.top, left: coords.left, maxWidth: 280 }}
            className={cn("z-50 rounded-md border border-neutral-700 bg-neutral-900 shadow-xl p-3", className)}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
};

Popover.displayName = "Popover";
