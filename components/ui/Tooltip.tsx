// [Claude.A12] Tooltip with hover/focus trigger and placement.
import React, { useState } from "react";

export interface TooltipProps {
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactElement;
}

const placementClasses: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
  left: "right-full top-1/2 -translate-y-1/2 mr-1",
  right: "left-full top-1/2 -translate-y-1/2 ml-1",
};

export function Tooltip({ content, placement = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span role="tooltip" className={`absolute z-50 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white ${placementClasses[placement]}`}>
          {content}
        </span>
      )}
    </span>
  );
}
