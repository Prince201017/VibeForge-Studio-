/**
 * [ForgeOS UI] Panel
 * Resizable, collapsible container used for editor chrome (Layers,
 * Inspector, Assets, etc). Renders a header with title + collapse
 * toggle and a scrollable content region.
 */
import React, { useState, type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { BaseComponentProps } from "../types";

export interface PanelProps extends BaseComponentProps {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  actions?: ReactNode;
  /** Fixed pixel width; omit to let the panel fill its flex parent. */
  width?: number;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  onToggle,
  actions,
  width,
  className,
  id,
  "data-testid": testId,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onToggle?.(next);
  };

  return (
    <section
      id={id}
      data-testid={testId}
      aria-label={title}
      style={width ? { width } : undefined}
      className={cn(
        "flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-300 truncate">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {actions}
          {collapsible && (
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className={cn("transition-transform", collapsed && "-rotate-90")}
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </header>
      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 text-sm text-neutral-200">
          {children}
        </div>
      )}
    </section>
  );
};

Panel.displayName = "Panel";
