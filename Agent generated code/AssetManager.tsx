// [Claude.A8] Asset Manager - Root Component
// Composes search, filters, grid/list, detail panel, and upload area into
// the full asset manager experience. Drop this into a route or panel.

'use client';

import React, { useState } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { useAssets } from '../../lib/asset-manager/hooks';
import { SearchBar } from './SearchBar';
import { FilterSidebar } from './FilterSidebar';
import { AssetGrid } from './AssetGrid';
import { AssetList } from './AssetList';
import { DetailPanel } from './DetailPanel';
import { UploadArea } from './UploadArea';
import { AssetPreview } from './AssetPreview';

export interface AssetManagerProps {
  projectId: string;
  onAssetDragToCanvas?: (assetId: string) => void;
  className?: string;
}

export function AssetManager({ projectId, onAssetDragToCanvas, className }: AssetManagerProps) {
  const viewMode = useAssetManagerStore((s) => s.viewMode);
  const setViewMode = useAssetManagerStore((s) => s.setViewMode);
  const selectedAssetIds = useAssetManagerStore((s) => s.selectedAssetIds);
  const activeAssetId = useAssetManagerStore((s) => s.activeAssetId);
  const { assets, isLoading, total, hasMore, loadMore } = useAssets();
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className={`asset-manager flex h-full w-full overflow-hidden ${className ?? ''}`}>
      <FilterSidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-[var(--am-border)] px-4 py-3">
          <SearchBar />

          <div className="flex items-center gap-1 rounded-md border border-[var(--am-border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`px-2 py-1 text-sm rounded ${
                viewMode === 'grid' ? 'bg-[var(--am-accent)] text-white' : 'text-[var(--am-muted)]'
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`px-2 py-1 text-sm rounded ${
                viewMode === 'list' ? 'bg-[var(--am-accent)] text-white' : 'text-[var(--am-muted)]'
              }`}
            >
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="ml-auto rounded-md bg-[var(--am-accent)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Upload
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && assets.length === 0 ? (
            <AssetManagerSkeleton />
          ) : assets.length === 0 ? (
            <EmptyState onUploadClick={() => setShowUpload(true)} />
          ) : viewMode === 'grid' ? (
            <AssetGrid
              assets={assets}
              onOpenPreview={setPreviewAssetId}
              onDragToCanvas={onAssetDragToCanvas}
            />
          ) : (
            <AssetList assets={assets} onOpenPreview={setPreviewAssetId} />
          )}

          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoading}
                className="rounded-md border border-[var(--am-border)] px-4 py-2 text-sm disabled:opacity-50"
              >
                {isLoading ? 'Loading…' : `Load more (${assets.length} of ${total})`}
              </button>
            </div>
          )}
        </div>

        {selectedAssetIds.length > 0 && (
          <div className="border-t border-[var(--am-border)] px-4 py-2 text-sm text-[var(--am-muted)]">
            {selectedAssetIds.length} selected
          </div>
        )}
      </div>

      {activeAssetId && <DetailPanel />}

      {showUpload && (
        <UploadArea projectId={projectId} onClose={() => setShowUpload(false)} />
      )}

      {previewAssetId && (
        <AssetPreview assetId={previewAssetId} onClose={() => setPreviewAssetId(null)} />
      )}
    </div>
  );
}

function AssetManagerSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3" aria-busy="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg bg-[var(--am-surface-hover)]" />
      ))}
    </div>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[var(--am-muted)]">
      <p className="text-sm">No assets found.</p>
      <button
        type="button"
        onClick={onUploadClick}
        className="rounded-md bg-[var(--am-accent)] px-4 py-2 text-sm font-medium text-white"
      >
        Upload your first asset
      </button>
    </div>
  );
}
