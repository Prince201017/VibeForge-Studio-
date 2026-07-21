/**
 * components/responsive/BottomSheet.tsx
 *
 * Swipeable bottom sheet (14_MOBILE_RESPONSIVE_NEEDS.md, section 5).
 * Supports half-screen / full-screen variants, drag-to-dismiss,
 * backdrop tap to close, and respects safe-area insets + reduced motion.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSafeAreaInsets, usePrefersReducedMotion } from "../../lib/responsive/hooks";
import { clamp, cx } from "../../lib/responsive/styles";

export type BottomSheetVariant = "half" | "full";

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: BottomSheetVariant;
  title?: string;
  className?: string;
  /** Drag distance (px) past which a downward swipe dismisses the sheet. Default 120. */
  dismissThresholdPx?: number;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  variant = "half",
  title,
  className,
  dismissThresholdPx = 120,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = usePrefersReducedMotion();
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientY;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStart.current == null) return;
    const delta = e.clientY - dragStart.current;
    setDragOffset(clamp(delta, 0, 600));
  }, []);

  const endDrag = useCallback(() => {
    if (dragOffset > dismissThresholdPx) {
      onClose();
    }
    setDragOffset(0);
    setDragging(false);
    dragStart.current = null;
  }, [dismissThresholdPx, dragOffset, onClose]);

  if (typeof document === "undefined") return null;
  if (!isOpen && dragOffset === 0) {
    // Still allow exit animation to play by not unmounting immediately
    // in a fuller implementation; kept simple here via conditional return.
    if (!isOpen) return null;
  }

  const heightClass = variant === "full" ? "h-[92vh]" : "h-[55vh]";
  const transitionClass = reducedMotion ? "" : "transition-transform duration-250 ease-out";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={cx(
          "absolute inset-0 bg-black/50",
          reducedMotion ? "" : "transition-opacity duration-250",
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cx(
          "relative w-full max-w-2xl rounded-t-2xl bg-[var(--surface,#1c1c1f)] shadow-2xl",
          heightClass,
          transitionClass,
          className,
        )}
        style={{
          transform: `translateY(${dragOffset}px)`,
          paddingBottom: insets.bottom > 16 ? insets.bottom : `max(1rem, env(safe-area-inset-bottom))`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 touch-none">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {title && (
          <div className="px-5 pb-3">
            <h2 className="text-lg font-semibold text-[var(--text,#f2f2f2)]">{title}</h2>
          </div>
        )}

        <div
          className={cx(
            "overflow-y-auto overscroll-contain px-5",
            variant === "full" ? "h-[calc(92vh-4rem)]" : "h-[calc(55vh-4rem)]",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default BottomSheet;
