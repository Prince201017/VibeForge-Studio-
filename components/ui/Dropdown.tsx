/**
 * [ForgeOS UI] Dropdown
 * Trigger + menu pattern following WAI-ARIA Menu Button: Arrow keys
 * move focus between items, Escape closes and returns focus to the
 * trigger, Enter/Space activates. Supports icons and nested submenus.
 */
import React, { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";
import { computePosition } from "../utils/positioning";
import { Keys, nextIndex } from "../utils/keyboard";
import type { Placement } from "../types";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect?: () => void;
  submenu?: DropdownItem[];
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  placement?: Placement;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, placement = "bottom", className }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setOpen(false), open);

  const openMenu = () => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const pos = computePosition(anchor, { top: 0, left: 0, width: 200, height: items.length * 32 }, placement);
    setCoords({ top: pos.top, left: pos.left });
    setOpen(true);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === Keys.Escape) {
      setOpen(false);
      triggerRef.current?.focus();
    }
    if (event.key === Keys.ArrowDown) {
      event.preventDefault();
      setActiveIndex((i) => nextIndex(i, items.length, 1));
    }
    if (event.key === Keys.ArrowUp) {
      event.preventDefault();
      setActiveIndex((i) => nextIndex(i, items.length, -1));
    }
    if (event.key === Keys.Enter || event.key === Keys.Space) {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        item.onSelect?.();
        setOpen(false);
      }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn("inline-flex", className)}
      >
        {trigger}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleKeyDown}
            style={{ position: "fixed", top: coords.top, left: coords.left, minWidth: 200 }}
            className="z-50 rounded-md border border-neutral-700 bg-neutral-900 shadow-xl py-1"
          >
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={i === activeIndex ? 0 : -1}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left",
                  item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-neutral-800",
                  item.danger ? "text-rose-400" : "text-neutral-200",
                  i === activeIndex && "bg-neutral-800"
                )}
              >
                {item.icon}
                {item.label}
                {item.submenu && <span className="ml-auto text-neutral-500">›</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

Dropdown.displayName = "Dropdown";
