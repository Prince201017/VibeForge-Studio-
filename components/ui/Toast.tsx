/**
 * [ForgeOS UI] Toast
 * Notification toast system: wrap the app in <ToastProvider>, then call
 * the useToast() hook's `show()` from anywhere to enqueue a toast.
 * Toasts auto-dismiss after `duration` ms (default 4s) unless an action
 * is present, and stack in the configured screen corner.
 */
import React, { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import type { Status } from "../types";

export interface ToastOptions {
  title: string;
  description?: string;
  status?: Exclude<Status, "default">;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const statusClass: Record<Exclude<Status, "default">, string> = {
  success: "border-emerald-500/40",
  error: "border-rose-500/40",
  warning: "border-amber-500/40",
  info: "border-sky-500/40",
};

export interface ToastProviderProps {
  children: ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

const positionClass: Record<NonNullable<ToastProviderProps["position"]>, string> = {
  "top-right": "top-4 right-4 items-end",
  "top-left": "top-4 left-4 items-start",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, position = "bottom-right" }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...options, id }]);
      const duration = options.duration ?? 4000;
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div aria-live="polite" className={cn("fixed z-[100] flex flex-col gap-2 pointer-events-none", positionClass[position])}>
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.status === "error" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto w-80 rounded-lg border bg-neutral-900 shadow-xl px-4 py-3",
                  statusClass[t.status ?? "info"]
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-xs text-neutral-400">{t.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="shrink-0 text-neutral-500 hover:text-neutral-200"
                  >
                    ✕
                  </button>
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = "ToastProvider";
