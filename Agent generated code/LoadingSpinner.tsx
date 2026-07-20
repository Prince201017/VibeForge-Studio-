/**
 * [ForgeOS UI] LoadingSpinner
 * Circular indeterminate spinner. Includes a screen-reader-only label
 * via role="status" so loading states are announced.
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Size } from "../types";

export interface LoadingSpinnerProps {
  size?: Size;
  color?: "indigo" | "neutral" | "white";
  label?: string;
  className?: string;
}

const dimension: Record<Size, number> = { sm: 14, md: 20, lg: 28 };
const colorClass = { indigo: "text-indigo-500", neutral: "text-neutral-400", white: "text-white" } as const;

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "md", color = "indigo", label = "Loading", className }) => {
  const d = dimension[size];
  return (
    <span role="status" className={cn("inline-flex items-center", colorClass[color], className)}>
      <svg width={d} height={d} viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
};

LoadingSpinner.displayName = "LoadingSpinner";
