// [Claude.A8] Asset Manager - AssetCard
// Single asset tile used by both grid and list views. Handles selection,
// drag-to-canvas, favoriting, and the metadata overlay.

'use client';

import React, { useState } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { formatBytes, formatRelativeDate, ASSET_TYPE_ICONS } from '../../lib/asset-manager/utils';
import type { Asset } from '../../lib/asset-manager/types';
import { AssetContextMenu } from './AssetContextMenu';

export interface AssetCardProps {
  asset: Asset;
  layout?: 'grid' | 'list';
  onOpenPreview: (assetId: string) => void;
  onDragToCanvas?: (assetId: string) => void;
}

export function AssetCard({ asset, layout = 'grid', onOpenPreview, onDragToCanvas }: AssetCardProps) {
  const isSelected = useAssetManagerStore((s) => s.selectedAssetIds.includes(asset.id));
  const toggleSelect = useAssetManagerStore((s) => s.toggleSelect);
  const setActiveAsset = useAssetManagerStore((s) => s.setActiveAsset);
  const toggleFavorite = useAssetManagerStore((s) => s.toggleFavorite);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      toggleSelect(asset.id, true);
    } else {
      toggleSelect(asset.id, false);
      setActiveAsset(asset.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-asset-id', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
    onDragToCanvas?.(asset.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  if (layout === 'list') {
    return (
      <div
        role="row"
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        onDoubleClick={() => onOpenPreview(asset.id)}
        onContextMenu={handleContextMenu}
        className={`flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer border ${
          isSelected
            ? 'border-[var(--am-accent)] bg-[var(--am-accent)]/10'
            : 'border-transparent hover:bg-[var(--am-surface-hover)]'
        }`}
      >
        <img
          src={asset.previewSizes.find((p) => p.size === 200)?.url ?? asset.previewUrl}
          alt={asset.name}
          className="h-10 w-10 shrink-0 rounded object-cover bg-[var(--am-surface)]"
          loading="lazy"
        />
        <span className="flex-1 truncate text-sm">{asset.name}</span>
        <span className="w-24 text-xs text-[var(--am-muted)]">{ASSET_TYPE_ICONS[asset.type]}</span>
        <span className="w-20 text-right text-xs text-[var(--am-muted)]">{formatBytes(asset.sizeBytes)}</span>
        <span className="w-24 text-right text-xs text-[var(--am-muted)]">{formatRelativeDate(asset.updatedAt)}</span>
        <FavoriteButton favorited={asset.favorited} onClick={() => toggleFavorite(asset.id)} />

        {contextMenuPos && (
          <AssetContextMenu
            asset={asset}
            position={contextMenuPos}
            onClose={() => setContextMenuPos(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onDoubleClick={() => onOpenPreview(asset.id)}
      onContextMenu={handleContextMenu}
      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border transition-colors ${
        isSelected ? 'border-[var(--am-accent)] ring-2 ring-[var(--am-accent)]' : 'border-[var(--am-border)]'
      }`}
    >
      <img
        src={asset.previewSizes.find((p) => p.size === 400)?.url ?? asset.previewUrl}
        alt={asset.name}
        className="h-full w-full object-cover bg-[var(--am-surface)]"
        loading="lazy"
      />

      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 transition-transform group-hover:translate-y-0">
        <p className="truncate text-xs font-medium text-white">{asset.name}</p>
        <p className="text-[10px] text-white/70">{formatBytes(asset.sizeBytes)}</p>
      </div>

      <FavoriteButton
        favorited={asset.favorited}
        onClick={(e) => {
          e?.stopPropagation();
          toggleFavorite(asset.id);
        }}
        className="absolute right-1.5 top-1.5"
      />

      {contextMenuPos && (
        <AssetContextMenu asset={asset} position={contextMenuPos} onClose={() => setContextMenuPos(null)} />
      )}
    </div>
  );
}

function FavoriteButton({
  favorited,
  onClick,
  className,
}: {
  favorited: boolean;
  onClick: (e?: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={favorited}
      className={`rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 ${
        favorited ? 'opacity-100 text-yellow-400' : ''
      } ${className ?? ''}`}
    >
      {favorited ? '★' : '☆'}
    </button>
  );
}
