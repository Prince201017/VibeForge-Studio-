/**
 * components/responsive/MobileMenu.tsx
 *
 * Hamburger + slide-out drawer navigation (section 1). Touch-optimized
 * menu items (44px min height), swipe-to-close, and focus-based active
 * states instead of hover (touch devices have no hover).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSafeAreaInsets } from "../../lib/responsive/hooks";
import { useSwipe } from "../../lib/responsive/gestures";
import { cx, MIN_INPUT_CLASS } from "../../lib/responsive/styles";

export interface MobileMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  isActive?: boolean;
}

export interface MobileMenuProps {
  items: MobileMenuItem[];
  /** Optional footer content, e.g. account switcher. */
  footer?: React.ReactNode;
  side?: "left" | "right";
}

export function MobileMenu({ items, footer, side = "left" }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const drawerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const swipeHandlers = useSwipe((direction) => {
    if ((side === "left" && direction === "left") || (side === "right" && direction === "right")) {
      close();
    }
  });

  // Trap focus within the drawer while open.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previouslyFocused?.focus();
    };
  }, [close, open]);

  const drawerSideClass = side === "left" ? "left-0" : "right-0";
  const translateClosed = side === "left" ? "-translate-x-full" : "translate-x-full";

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cx(
          "flex h-12 w-12 items-center justify-center rounded-md",
          "text-[var(--text,#f2f2f2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
        )}
      >
        <HamburgerIcon />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/50 transition-opacity duration-200"
              onClick={close}
              aria-hidden
            />
            <div
              ref={drawerRef}
              tabIndex={-1}
              {...swipeHandlers}
              className={cx(
                "relative flex h-full w-[82vw] max-w-[320px] flex-col",
                "bg-[var(--surface,#1c1c1f)] shadow-2xl outline-none",
                "transition-transform duration-200 ease-out",
                drawerSideClass,
                open ? "translate-x-0" : translateClosed,
              )}
              style={{
                paddingTop: `max(1rem, ${insets.top}px)`,
                paddingBottom: `max(1rem, ${insets.bottom}px)`,
              }}
            >
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-sm font-semibold text-[var(--text,#f2f2f2)]">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--text,#f2f2f2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-2">
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          item.onSelect();
                          close();
                        }}
                        aria-current={item.isActive ? "page" : undefined}
                        className={cx(
                          MIN_INPUT_CLASS,
                          "flex w-full items-center gap-3 rounded-md px-3 text-left",
                          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
                          item.isActive
                            ? "bg-[var(--accent,#5b8def)]/15 text-[var(--accent,#5b8def)]"
                            : "text-[var(--text,#f2f2f2)]",
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {footer && <div className="border-t border-white/10 px-4 pt-3">{footer}</div>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default MobileMenu;

/**
 * BottomTabBar — alternative to the drawer for apps that prefer a
 * persistent bottom tab layout on mobile (spec section 1: "Bottom tab
 * navigation (alternative layout)"). Safe-area aware, 48px touch targets.
 */
export interface BottomTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  isActive?: boolean;
}

export function BottomTabBar({ items }: { items: BottomTabItem[] }) {
  const insets = useSafeAreaInsets();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[var(--surface,#1c1c1f)]"
      style={{ paddingBottom: `max(0.5rem, ${insets.bottom}px)` }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onSelect}
          aria-current={item.isActive ? "page" : undefined}
          className={cx(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2",
            "min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
            item.isActive ? "text-[var(--accent,#5b8def)]" : "text-[var(--text,#f2f2f2)]/70",
          )}
        >
          {item.icon}
          <span className="text-[11px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
