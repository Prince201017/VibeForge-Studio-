/**
 * [ForgeOS UI] TopNav
 * Horizontal application header: brand slot, centered/right-aligned
 * nav items, a user menu slot, and a hamburger toggle that appears
 * below the `md` breakpoint for a mobile nav drawer trigger.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface TopNavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface TopNavProps {
  brand: ReactNode;
  items?: TopNavItem[];
  activeId?: string;
  itemsAlign?: "center" | "right";
  userMenu?: ReactNode;
  onMobileMenuToggle?: () => void;
  className?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ brand, items = [], activeId, itemsAlign = "center", userMenu, onMobileMenuToggle, className }) => {
  return (
    <header className={cn("flex items-center gap-4 h-14 px-4 border-b border-neutral-800 bg-neutral-950", className)}>
      <div className="shrink-0">{brand}</div>

      <nav
        aria-label="Primary"
        className={cn("hidden md:flex items-center gap-1 flex-1", itemsAlign === "center" ? "justify-center" : "justify-end")}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-current={item.id === activeId ? "page" : undefined}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
              item.id === activeId ? "text-neutral-50 bg-neutral-800" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {itemsAlign === "center" && <div className="flex-1 md:hidden" />}

      <div className="shrink-0 flex items-center gap-2">
        {userMenu}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
};

TopNav.displayName = "TopNav";
