/**
 * [ForgeOS UI] Separator
 * Horizontal or vertical divider line with an optional centered label
 * (e.g. "OR" between two form sections).
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Orientation } from "../types";

export interface SeparatorProps {
  orientation?: Orientation;
  label?: string;
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ orientation = "horizontal", label, className }) => {
  if (orientation === "vertical") {
    return <div role="separator" aria-orientation="vertical" className={cn("w-px self-stretch bg-neutral-800", className)} />;
  }

  if (label) {
    return (
      <div role="separator" className={cn("flex items-center gap-3", className)}>
        <div className="h-px flex-1 bg-neutral-800" />
        <span className="text-xs text-neutral-500">{label}</span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>
    );
  }

  return <div role="separator" aria-orientation="horizontal" className={cn("h-px w-full bg-neutral-800", className)} />;
};

Separator.displayName = "Separator";
