// [Claude.A8] Asset Manager - FilterSidebar
// Left-rail navigation: type categories, folders, favorites, smart
// collections, and tag cloud filtering — all bound to the shared AssetFilter.

'use client';

import React, { useMemo } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { ASSET_TYPE_LABELS } from '../../lib/asset-manager/utils';
import type { AssetType } from '../../lib/asset-manager/types';
import { CollectionView } from './CollectionView';

const TYPE_GROUPS: { label: string; types: AssetType[] }[] = [
  { label: 'Visual', types: ['image', 'svg', 'video', 'pattern'] },
  { label: '3D & Motion', types: ['model3d', 'animation_clip', 'particle_preset'] },
  { label: 'Design', types: ['palette', 'gradient', 'brush', 'font'] },
  { label: 'Media & Docs', types: ['audio', 'pdf', 'plugin'] },
];

export function FilterSidebar() {
  const filter = useAssetManagerStore((s) => s.filter);
  const setFilter = useAssetManagerStore((s) => s.setFilter);
  const resetFilter = useAssetManagerStore((s) => s.resetFilter);
  const assets = useAssetManagerStore((s) => s.assets);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of Object.values(assets)) {
      for (const tag of asset.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [assets]);

  const toggleType = (type: AssetType) => {
    const current = filter.types ?? [];
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    setFilter({ types: next.length ? next : undefined });
  };

  const toggleTag = (tag: string) => {
    const current = filter.tags ?? [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    setFilter({ tags: next.length ? next : undefined });
  };

  const isFilterActive =
    (filter.types?.length ?? 0) > 0 ||
    (filter.tags?.length ?? 0) > 0 ||
    filter.favoritedOnly ||
    filter.color;

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-[var(--am-border)] p-3">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Library</h2>
        {isFilterActive && (
          <button type="button" onClick={resetFilter} className="text-xs text-[var(--am-accent)]">
            Clear
          </button>
        )}
      </div>

      <nav className="mb-4 flex flex-col gap-0.5" aria-label="Quick filters">
        <SidebarButton
          label="All Assets"
          active={!filter.types && !filter.favoritedOnly}
          onClick={() => setFilter({ types: undefined, favoritedOnly: undefined })}
        />
        <SidebarButton
          label="★ Favorites"
          active={!!filter.favoritedOnly}
          onClick={() => setFilter({ favoritedOnly: !filter.favoritedOnly })}
        />
      </nav>

      <CollectionView />

      {TYPE_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">
            {group.label}
          </h3>
          <div className="flex flex-col gap-0.5">
            {group.types.map((type) => (
              <SidebarButton
                key={type}
                label={ASSET_TYPE_LABELS[type]}
                active={!!filter.types?.includes(type)}
                onClick={() => toggleType(type)}
              />
            ))}
          </div>
        </div>
      ))}

      {allTags.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {allTags.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={filter.tags?.includes(tag)}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  filter.tags?.includes(tag)
                    ? 'border-[var(--am-accent)] bg-[var(--am-accent)]/10 text-[var(--am-accent)]'
                    : 'border-[var(--am-border)] text-[var(--am-muted)]'
                }`}
              >
                {tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2 py-1 text-left text-sm ${
        active ? 'bg-[var(--am-accent)]/10 text-[var(--am-accent)]' : 'text-[var(--am-fg)] hover:bg-[var(--am-surface-hover)]'
      }`}
    >
      {label}
    </button>
  );
}
