/**
 * [ForgeOS UI] Sidebar
 * Collapsible app navigation rail. Supports flat items and grouped
 * sub-navigation, active-state highlighting, and a collapse toggle
 * that shrinks to icon-only width.
 */
import React, { useState, type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  collapsible?: boolean;
  defaultWidth?: number;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, activeId, onSelect, collapsible = true, defaultWidth = 240, className }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderItem = (item: SidebarItem, depth = 0) => {
    const isActive = item.id === activeId;
    const hasChildren = !!item.children?.length;
    const isOpen = openGroups.has(item.id);

    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren) toggleGroup(item.id);
            else {
              item.onClick?.();
              onSelect?.(item.id);
            }
          }}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
            isActive ? "bg-indigo-500/15 text-indigo-300" : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
            depth > 0 && "pl-6"
          )}
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
          {!collapsed && hasChildren && (
            <span className={cn("transition-transform text-neutral-500", isOpen && "rotate-90")}>›</span>
          )}
        </button>
        {!collapsed && hasChildren && isOpen && (
          <ul className="mt-1 flex flex-col gap-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{ width: collapsed ? 56 : defaultWidth }}
      className={cn("flex flex-col gap-1 border-r border-neutral-800 bg-neutral-950 p-2 transition-all duration-200", className)}
    >
      <ul className="flex flex-col gap-0.5 flex-1">{items.map((item) => renderItem(item))}</ul>
      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-auto flex items-center justify-center rounded-md p-2 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={cn("transition-transform", collapsed && "rotate-180")}>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </nav>
  );
};

Sidebar.displayName = "Sidebar";
