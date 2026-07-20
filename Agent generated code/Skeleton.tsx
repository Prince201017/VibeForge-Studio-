/**
 * [ForgeOS UI] Skeleton
 * Animated loading placeholder. Use `lines` for a multi-row text
 * skeleton, or omit it for a single block sized by className.
 */
import React from "react";
import { cn } from "../utils/classNames";

export interface SkeletonProps {
  lines?: number;
  className?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ lines, className, circle = false }) => {
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 rounded bg-neutral-800 animate-pulse",
              i === lines - 1 ? "w-2/3" : "w-full",
              className
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("bg-neutral-800 animate-pulse", circle ? "rounded-full" : "rounded-md", className ?? "h-4 w-full")}
    />
  );
};

Skeleton.displayName = "Skeleton";
