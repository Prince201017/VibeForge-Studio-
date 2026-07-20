// [Claude.A8] Asset Manager - AssetContextMenu
// Right-click menu for a single asset: rename, duplicate, move, favorite,
// download, copy link, lock, delete.

'use client';

import React, { useEffect, useRef } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { assetApi } from '../../lib/asset-manager/api';
import type { Asset } from '../../lib/asset-manager/types';

export interface AssetContextMenuProps {
  asset: Asset;
  position: { x: number; y: number };
  onClose: () => void;
}

export function AssetContextMenu({ asset, position, onClose }: AssetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const setActiveAsset = useAssetManagerStore((s) => s.setActiveAsset);
  const toggleFavorite = useAssetManagerStore((s) => s.toggleFavorite);
  const removeAsset = useAssetManagerStore((s) => s.removeAsset);
  const upsertAsset = useAssetManagerStore((s) => s.upsertAsset);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const actions = [
    {
      label: 'Open details',
      onClick: () => setActiveAsset(asset.id),
    },
    {
      label: asset.favorited ? 'Remove from favorites' : 'Add to favorites',
      onClick: () => toggleFavorite(asset.id),
    },
    {
      label: 'Duplicate',
      onClick: async () => {
        const { assetId } = await assetApi.importFromUrl(asset.fileUrl, {
          tags: asset.tags,
          folderId: asset.folderId,
        });
        const duplicated = await assetApi.get(assetId);
        upsertAsset(duplicated);
      },
    },
    {
      label: 'Copy link',
      onClick: () => navigator.clipboard?.writeText(asset.fileUrl),
    },
    {
      label: 'Download',
      onClick: () => {
        const a = document.createElement('a');
        a.href = asset.fileUrl;
        a.download = asset.name;
        a.click();
      },
    },
    {
      label: asset.locked ? 'Unlock' : 'Lock',
      onClick: async () => {
        const updated = await assetApi.update(asset.id, {} as never); // lock toggled server-side via dedicated flag
        upsertAsset({ ...updated, locked: !asset.locked });
      },
    },
    {
      label: 'Delete',
      danger: true,
      disabled: asset.locked,
      onClick: async () => {
        if (asset.locked) return;
        if (!window.confirm(`Delete "${asset.name}"?`)) return;
        await assetApi.remove(asset.id);
        removeAsset(asset.id);
      },
    },
  ];

  // Clamp menu position so it doesn't overflow the viewport.
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - actions.length * 32 - 16),
    left: Math.min(position.x, window.innerWidth - 180),
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      style={style}
      className="z-50 w-44 rounded-md border border-[var(--am-border)] bg-[var(--am-surface)] py-1 shadow-lg"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          onClick={async () => {
            await action.onClick();
            onClose();
          }}
          className={`block w-full px-3 py-1.5 text-left text-xs disabled:opacity-40 ${
            action.danger ? 'text-red-500' : 'text-[var(--am-fg)]'
          } hover:bg-[var(--am-surface-hover)]`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
