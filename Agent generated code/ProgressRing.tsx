/**
 * [ForgeOS UI] ProgressRing
 * Circular progress indicator drawn with an SVG stroke-dasharray
 * trick. Used for compact status (e.g. export progress in a toolbar).
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Size, Status } from "../types";

export interface ProgressRingProps {
  value: number; // 0-100
  size?: Size;
  status?: Exclude<Status, "default">;
  showLabel?: boolean;
  className?: string;
}

const dimension: Record<Size, number> = { sm: 28, md: 40, lg: 56 };
const strokeWidth: Record<Size, number> = { sm: 3, md: 4, lg: 5 };
const colorClass: Record<Exclude<Status, "default">, string> = {
  success: "text-emerald-500", warning: "text-amber-500", error: "text-rose-500", info: "text-indigo-500",
};

export const ProgressRing: React.FC<ProgressRingProps> = ({ value, size = "md", status = "info", showLabel = true, className }) => {
  const d = dimension[size];
  const sw = strokeWidth[size];
  const radius = (d - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <svg width={d} height={d} className={cn("-rotate-90", colorClass[status])}>
        <circle cx={d / 2} cy={d / 2} r={radius} stroke="currentColor" strokeOpacity={0.15} strokeWidth={sw} fill="none" />
        <circle
          cx={d / 2}
          cy={d / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={sw}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && <span className="absolute text-[10px] font-medium text-neutral-300 tabular-nums">{Math.round(value)}%</span>}
    </div>
  );
};

ProgressRing.displayName = "ProgressRing";
