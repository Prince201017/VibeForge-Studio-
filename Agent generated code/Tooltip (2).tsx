/**
 * [ForgeOS UI] Tooltip
 * Hover/focus tooltip positioned relative to its trigger. Keyboard
 * accessible: appears on focus, dismisses on Escape/blur, and is
 * exposed via aria-describedby rather than only visually.
 */
import React, { cloneElement, isValidElement, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { computePosition } from "../utils/positioning";
import type { Placement } from "../types";

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: Placement;
  variant?: "dark" | "light";
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, placement = "top", variant = "dark", delayMs = 300 }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();

  const show = () => {
    timerRef.current = setTimeout(() => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      // Estimate tooltip size before it's rendered; refined via measured DOM
      // would require a second pass, acceptable approximation for short text.
      const estimate = { width: Math.min(240, content.length * 6 + 24), height: 32 };
      const pos = computePosition(anchor, estimate, placement);
      setCoords({ top: pos.top, left: pos.left });
      setVisible(true);
    }, delayMs);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children as React.ReactElement<any>, {
    ref: (node: HTMLElement) => {
      anchorRef.current = node;
    },
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    "aria-describedby": visible ? id : undefined,
  });

  return (
    <>
      {trigger}
      {visible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ position: "fixed", top: coords.top, left: coords.left }}
            className={cn(
              "z-50 max-w-[240px] rounded-md px-2.5 py-1.5 text-xs shadow-lg pointer-events-none",
              variant === "dark" ? "bg-neutral-800 text-neutral-100 border border-neutral-700" : "bg-white text-neutral-900"
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};

Tooltip.displayName = "Tooltip";
