// [Claude.A8] Asset Manager - AssetGrid
// Grid view with lightweight windowed rendering so libraries of 10K+ assets
// stay smooth. Uses a row-based virtualizer rather than pulling in a heavy
// dependency, keeping this self-contained per the LOC budget.

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '../../lib/asset-manager/types';
import { AssetCard } from './AssetCard';

export interface AssetGridProps {
  assets: Asset[];
  onOpenPreview: (assetId: string) => void;
  onDragToCanvas?: (assetId: string) => void;
  minCardWidth?: number;
  gap?: number;
}

const OVERSCAN_ROWS = 3;

export function AssetGrid({
  assets,
  onOpenPreview,
  onDragToCanvas,
  minCardWidth = 160,
  gap = 12,
}: AssetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setContainerWidth(entry.contentRect.width);
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
  const cardWidth = columns > 0 ? (containerWidth - gap * (columns - 1)) / columns : minCardWidth;
  const rowHeight = cardWidth + gap;
  const totalRows = Math.ceil(assets.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Skip virtualization below the threshold where it doesn't matter — keeps
  // simple cases (small folders) simple and avoids layout jank.
  const shouldVirtualize = assets.length > 200 && containerWidth > 0;

  const { startRow, endRow } = useMemo(() => {
    if (!shouldVirtualize) return { startRow: 0, endRow: totalRows };
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
    const visibleRows = Math.ceil(viewportHeight / rowHeight) + OVERSCAN_ROWS * 2;
    const end = Math.min(totalRows, start + visibleRows);
    return { startRow: start, endRow: end };
  }, [shouldVirtualize, scrollTop, rowHeight, viewportHeight, totalRows]);

  const visibleAssets = useMemo(() => {
    if (!shouldVirtualize) return assets;
    return assets.slice(startRow * columns, endRow * columns);
  }, [assets, shouldVirtualize, startRow, endRow, columns]);

  if (!shouldVirtualize) {
    return (
      <div
        role="grid"
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns || 1}, minmax(${minCardWidth}px, 1fr))` }}
      >
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            layout="grid"
            onOpenPreview={onOpenPreview}
            onDragToCanvas={onDragToCanvas}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className="relative h-full overflow-y-auto"
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          role="grid"
          className="grid gap-3 absolute inset-x-0"
          style={{
            top: startRow * rowHeight,
            gridTemplateColumns: `repeat(${columns}, minmax(${minCardWidth}px, 1fr))`,
          }}
        >
          {visibleAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              layout="grid"
              onOpenPreview={onOpenPreview}
              onDragToCanvas={onDragToCanvas}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
