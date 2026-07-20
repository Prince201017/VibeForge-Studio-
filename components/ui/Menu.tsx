/**
 * [ForgeOS UI] Menu
 * Programmatically opened context menu (e.g. right-click on a canvas
 * object). Positions itself at arbitrary x/y coordinates rather than
 * relative to a trigger element, and closes on outside click, Escape,
 * or item selection.
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";
import { useKeyboard } from "../hooks/useKeyboard";

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separatorAfter?: boolean;
  onSelect?: () => void;
}

export interface MenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export const Menu: React.FC<MenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, onClose);
  useKeyboard("Escape", onClose);

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      style={{ position: "fixed", top: y, left: x, minWidth: 200 }}
      className="z-50 rounded-md border border-neutral-700 bg-neutral-900 shadow-xl py-1"
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left",
              item.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-neutral-800",
              item.danger ? "text-rose-400" : "text-neutral-200"
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <kbd className="text-[10px] text-neutral-500 font-mono">{item.shortcut}</kbd>}
          </button>
          {item.separatorAfter && <div className="my-1 h-px bg-neutral-800" />}
        </React.Fragment>
      ))}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(menu, document.body) : menu;
};

Menu.displayName = "Menu";
