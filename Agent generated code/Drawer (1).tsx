/**
 * [ForgeOS UI] Drawer
 * Edge-anchored sliding panel (left or right) for secondary workflows
 * that need more room than a Popover but shouldn't fully block the
 * canvas like a centered Modal (e.g. export settings, asset details).
 */
import React, { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useKeyboard } from "../hooks/useKeyboard";
import { focusFirst } from "../utils/keyboard";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  position?: "left" | "right";
  width?: number;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, position = "right", width = 380, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useKeyboard("Escape", onClose, isOpen);

  useEffect(() => {
    if (isOpen) focusFirst(contentRef.current);
  }, [isOpen]);

  if (!isOpen) return null;

  const drawer = (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{ width }}
        className={cn(
          "absolute top-0 bottom-0 flex flex-col bg-neutral-900 border-neutral-800 shadow-2xl animate-in duration-200",
          position === "right" ? "right-0 border-l" : "left-0 border-r",
          className
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
          <h2 id="drawer-title" className="text-sm font-semibold text-neutral-50">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-neutral-200">{children}</div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawer, document.body) : drawer;
};

Drawer.displayName = "Drawer";
