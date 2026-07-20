/**
 * [ForgeOS UI] Badge
 * Small status/label chip. Supports color variants, sizes, an icon
 * slot, and an optional dismiss button.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Size, Status } from "../types";

export interface BadgeProps {
  children: ReactNode;
  status?: Status;
  size?: Size;
  icon?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const statusClass: Record<Status, string> = {
  default: "bg-neutral-800 text-neutral-300 border-neutral-700",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  error: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const sizeClass: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1",
  lg: "text-sm px-2.5 py-1 gap-1.5",
};

export const Badge: React.FC<BadgeProps> = ({ children, status = "default", size = "md", icon, onDismiss, className }) => {
  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", statusClass[status], sizeClass[size], className)}>
      {icon}
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Remove"
          className="ml-0.5 -mr-0.5 rounded-full hover:bg-white/10 p-0.5"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
};

Badge.displayName = "Badge";
