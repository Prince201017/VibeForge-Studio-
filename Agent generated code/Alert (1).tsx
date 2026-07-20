/**
 * [ForgeOS UI] Alert
 * Inline alert banner for success/error/warning/info messaging.
 * Uses role="alert" for errors/warnings so assistive tech announces
 * them immediately, and role="status" for calmer success/info variants.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Status } from "../types";

export interface AlertProps {
  status: Exclude<Status, "default">;
  title: string;
  description?: string;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const config: Record<Exclude<Status, "default">, { classes: string; icon: ReactNode }> = {
  success: {
    classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 10l3 3 5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" /></svg>
    ),
  },
  error: {
    classes: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" /></svg>
    ),
  },
  warning: {
    classes: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 7v4M10 14h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M8.6 3.5L1.9 15a1.5 1.5 0 001.3 2.2h13.6a1.5 1.5 0 001.3-2.2L11.4 3.5a1.5 1.5 0 00-2.8 0z" stroke="currentColor" strokeWidth="1.3" /></svg>
    ),
  },
  info: {
    classes: "bg-sky-500/10 border-sky-500/30 text-sky-300",
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 9v5M10 6.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.3" /></svg>
    ),
  },
};

export const Alert: React.FC<AlertProps> = ({ status, title, description, action, onDismiss, className }) => {
  const { classes, icon } = config[status];
  return (
    <div
      role={status === "error" || status === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3", classes, className)}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-sm opacity-90">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss alert" className="shrink-0 h-fit p-1 rounded hover:bg-white/10">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
};

Alert.displayName = "Alert";
