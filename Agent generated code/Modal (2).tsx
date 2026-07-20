/**
 * [ForgeOS UI] Modal
 * Centered dialog with backdrop overlay, Escape-to-close, click-outside
 * dismiss, and a simple focus trap. Use Drawer for edge-anchored panels
 * and Dialog for a pre-composed confirm/cancel variant.
 */
import React, { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useKeyboard } from "../hooks/useKeyboard";
import { focusFirst } from "../utils/keyboard";
import type { BaseComponentProps, Size } from "../types";

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  closeOnBackdropClick?: boolean;
}

const sizeClass: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdropClick = true,
  className,
  id,
  "data-testid": testId,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useKeyboard("Escape", onClose, isOpen);

  useEffect(() => {
    if (isOpen) focusFirst(contentRef.current);
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        id={id}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id ?? "modal"}-title`}
        className={cn(
          "relative w-full rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl max-h-[85vh] flex flex-col",
          sizeClass[size],
          className
        )}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <h2 id={`${id ?? "modal"}-title`} className="text-base font-semibold text-neutral-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-200">{children}</div>
        {footer && <footer className="px-5 py-4 border-t border-neutral-800 shrink-0">{footer}</footer>}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
};

Modal.displayName = "Modal";
