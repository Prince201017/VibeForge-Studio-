/**
 * [ForgeOS UI] TabGroup
 * Accessible tabs following the WAI-ARIA Tabs pattern: roving tabindex,
 * Arrow-key navigation, Home/End support. Panels lazy-mount on first
 * activation and stay mounted (hidden) afterward to preserve state.
 */
import React, { useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/classNames";
import { Keys, nextIndex } from "../utils/keyboard";
import type { BaseComponentProps, Orientation } from "../types";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabGroupProps extends BaseComponentProps {
  tabs: TabItem[];
  defaultActiveId?: string;
  orientation?: Orientation;
  onChange?: (id: string) => void;
}

export const TabGroup: React.FC<TabGroupProps> = ({
  tabs,
  defaultActiveId,
  orientation = "horizontal",
  onChange,
  className,
  id,
  "data-testid": testId,
}) => {
  const enabled = tabs.filter((t) => !t.disabled);
  const [activeId, setActiveId] = useState(defaultActiveId ?? enabled[0]?.id);
  const [mounted, setMounted] = useState<Set<string>>(new Set([defaultActiveId ?? enabled[0]?.id]));
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activate = (tabId: string) => {
    setActiveId(tabId);
    setMounted((prev) => new Set(prev).add(tabId));
    onChange?.(tabId);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeId);
    const isVertical = orientation === "vertical";
    const forward = isVertical ? Keys.ArrowDown : Keys.ArrowRight;
    const backward = isVertical ? Keys.ArrowUp : Keys.ArrowLeft;

    let targetIndex: number | null = null;
    if (event.key === forward) targetIndex = nextIndex(currentIndex, tabs.length, 1);
    if (event.key === backward) targetIndex = nextIndex(currentIndex, tabs.length, -1);
    if (event.key === Keys.Home) targetIndex = 0;
    if (event.key === Keys.End) targetIndex = tabs.length - 1;

    if (targetIndex !== null) {
      event.preventDefault();
      const target = tabs[targetIndex];
      if (target.disabled) return;
      activate(target.id);
      tabRefs.current[target.id]?.focus();
    }
  };

  return (
    <div
      id={id}
      data-testid={testId}
      className={cn("flex", orientation === "vertical" ? "flex-row" : "flex-col", className)}
    >
      <div
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex gap-1 border-neutral-800",
          orientation === "vertical" ? "flex-col border-r pr-2" : "flex-row border-b"
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => activate(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "text-neutral-50 border-b-2 border-indigo-500 bg-neutral-800/60"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-w-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={tab.id !== activeId}
            className="p-3"
          >
            {mounted.has(tab.id) ? tab.content : null}
          </div>
        ))}
      </div>
    </div>
  );
};

TabGroup.displayName = "TabGroup";
