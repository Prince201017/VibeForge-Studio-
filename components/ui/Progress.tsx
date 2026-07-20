/**
 * [ForgeOS UI] Progress
 * Horizontal progress bar with percentage label, indeterminate mode
 * (unknown duration tasks), and status color variants.
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Status } from "../types";

export interface ProgressProps {
  value?: number; // 0-100, omit for indeterminate
  status?: Exclude<Status, "default">;
  showLabel?: boolean;
  className?: string;
}

const colorClass: Record<Exclude<Status, "default">, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  info: "bg-indigo-500",
};

export const Progress: React.FC<ProgressProps> = ({ value, status = "info", showLabel = false, className }) => {
  const indeterminate = value === undefined;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-800"
      >
        <div
          className={cn("h-full rounded-full transition-all", colorClass[status], indeterminate && "animate-[indeterminate_1.4s_ease-in-out_infinite] w-1/3")}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && !indeterminate && <span className="text-xs text-neutral-400 tabular-nums w-9 text-right">{Math.round(value)}%</span>}
    </div>
  );
};

Progress.displayName = "Progress";

/*
  Companion keyframes (add once globally):
  @keyframes indeterminate {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
*/
