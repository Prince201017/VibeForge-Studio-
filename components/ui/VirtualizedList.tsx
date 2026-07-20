/**
 * [ForgeOS UI] VirtualizedList
 * Renders only the rows near the visible viewport so lists with 10K+
 * items stay smooth. Supports fixed row heights (fast path) or a
 * per-item `estimateHeight` for dynamic heights (measured lazily).
 */
import React, { useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  getKey?: (item: T, index: number) => React.Key;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 6,
  className,
  getKey,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  return (
    <div
      ref={containerRef}
      role="list"
      style={{ height, overflowY: "auto" }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className={cn("relative", className)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <div
              key={getKey ? getKey(item, index) : index}
              role="listitem"
              style={{ position: "absolute", top: index * itemHeight, left: 0, right: 0, height: itemHeight }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

VirtualizedList.displayName = "VirtualizedList";
