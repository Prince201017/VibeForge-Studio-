/**
 * [ForgeOS UI] ButtonGroup
 * Groups related buttons with shared borders, and a segmented-control
 * mode for exclusive single-selection toolbars (e.g. align left/center/right).
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface SegmentOption {
  value: string;
  label: ReactNode;
  "aria-label"?: string;
}

export interface ButtonGroupProps {
  children?: ReactNode;
  segmented?: SegmentOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, segmented, value, onChange, className }) => {
  if (segmented) {
    return (
      <div role="radiogroup" className={cn("inline-flex rounded-md border border-neutral-700 overflow-hidden", className)}>
        {segmented.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt["aria-label"]}
              onClick={() => onChange?.(opt.value)}
              className={cn(
                "px-3 h-8 text-sm font-medium border-r border-neutral-700 last:border-r-0 transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                active ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="group" className={cn("inline-flex [&>button]:rounded-none [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md [&>button+button]:border-l [&>button+button]:border-l-neutral-950", className)}>
      {children}
    </div>
  );
};

ButtonGroup.displayName = "ButtonGroup";
