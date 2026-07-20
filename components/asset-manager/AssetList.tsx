// [Claude.A8] Asset Manager - AssetList
// Dense table-style view. Reuses AssetCard's `list` layout for each row and
// adds sortable column headers wired to the store's sort state.

'use client';

import React from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import type { Asset, AssetSortField } from '../../lib/asset-manager/types';
import { AssetCard } from './AssetCard';

export interface AssetListProps {
  assets: Asset[];
  onOpenPreview: (assetId: string) => void;
}

const COLUMNS: { field: AssetSortField; label: string; width: string }[] = [
  { field: 'name', label: 'Name', width: 'flex-1' },
  { field: 'name', label: 'Type', width: 'w-24' },
  { field: 'size', label: 'Size', width: 'w-20 text-right' },
  { field: 'date', label: 'Modified', width: 'w-24 text-right' },
];

export function AssetList({ assets, onOpenPreview }: AssetListProps) {
  const sort = useAssetManagerStore((s) => s.sort);
  const sortDirection = useAssetManagerStore((s) => s.sortDirection);
  const setSort = useAssetManagerStore((s) => s.setSort);

  const handleHeaderClick = (field: AssetSortField) => {
    if (sort === field) {
      setSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field, 'asc');
    }
  };

  return (
    <div role="table" className="flex flex-col">
      <div role="row" className="flex items-center gap-3 border-b border-[var(--am-border)] px-2 pb-2 text-xs font-medium text-[var(--am-muted)]">
        <span className="w-10" />
        <button
          type="button"
          className={`flex-1 text-left ${sort === 'name' ? 'text-[var(--am-fg)]' : ''}`}
          onClick={() => handleHeaderClick('name')}
        >
          Name {sort === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <span className="w-24">Type</span>
        <button
          type="button"
          className={`w-20 text-right ${sort === 'size' ? 'text-[var(--am-fg)]' : ''}`}
          onClick={() => handleHeaderClick('size')}
        >
          Size {sort === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          type="button"
          className={`w-24 text-right ${sort === 'date' ? 'text-[var(--am-fg)]' : ''}`}
          onClick={() => handleHeaderClick('date')}
        >
          Modified {sort === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <span className="w-8" />
      </div>

      <div role="rowgroup" className="divide-y divide-[var(--am-border)]/50">
        {assets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} layout="list" onOpenPreview={onOpenPreview} />
        ))}
      </div>
    </div>
  );
}
