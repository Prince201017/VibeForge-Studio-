// [Claude.A8] Asset Manager - Hooks
// Composable hooks that connect the Zustand store to the API layer.
// Components should use these instead of calling assetApi / the store directly.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAssetManagerStore } from './store';
import { assetApi } from './api';
import { inferAssetTypeFromExtension, MAX_FILE_SIZE_BYTES } from './types';
import type { Asset, AssetSearchParams } from './types';

/**
 * Loads and paginates the asset list for the current filter/sort/folder,
 * refetching whenever those change.
 */
export function useAssets() {
  const {
    filter,
    sort,
    sortDirection,
    searchQuery,
    currentFolderId,
    page,
    pageSize,
    setAssets,
    setLoading,
    isLoading,
    total,
    hasMore,
    assets,
    setPage,
  } = useAssetManagerStore((s) => ({
    filter: s.filter,
    sort: s.sort,
    sortDirection: s.sortDirection,
    searchQuery: s.searchQuery,
    currentFolderId: s.currentFolderId,
    page: s.page,
    pageSize: s.pageSize,
    setAssets: s.setAssets,
    setLoading: s.setLoading,
    isLoading: s.isLoading,
    total: s.total,
    hasMore: s.hasMore,
    assets: s.assets,
    setPage: s.setPage,
  }));

  const requestId = useRef(0);

  const fetchAssets = useCallback(
    async (append = false) => {
      const thisRequest = ++requestId.current;
      setLoading(true);
      try {
        const params: AssetSearchParams = {
          ...filter,
          folderId: currentFolderId,
          query: searchQuery || undefined,
          sort,
          direction: sortDirection,
          page,
          pageSize,
        };
        const result = await assetApi.list(params);
        if (thisRequest !== requestId.current) return; // stale response, ignore
        setAssets(result.assets, { append, total: result.total, hasMore: result.hasMore });
      } finally {
        if (thisRequest === requestId.current) setLoading(false);
      }
    },
    [filter, sort, sortDirection, searchQuery, currentFolderId, page, pageSize, setAssets, setLoading]
  );

  useEffect(() => {
    fetchAssets(page > 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, sortDirection, searchQuery, currentFolderId, page]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) setPage(page + 1);
  }, [isLoading, hasMore, page, setPage]);

  const assetList = useMemo(() => Object.values(assets), [assets]);

  return { assets: assetList, isLoading, total, hasMore, loadMore, refetch: () => fetchAssets(false) };
}

/**
 * Debounced full-text + filtered search, separate from the default list
 * fetch so the search bar can be wired independently of folder browsing.
 */
export function useAssetSearch(debounceMs = 250) {
  const setSearchQuery = useAssetManagerStore((s) => s.setSearchQuery);
  const searchQuery = useAssetManagerStore((s) => s.searchQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(
    (query: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSearchQuery(query), debounceMs);
    },
    [debounceMs, setSearchQuery]
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return { query: searchQuery, search };
}

interface UploadOptions {
  tags?: string[];
  folderId?: string | null;
  description?: string;
}

/**
 * Drives the upload queue: validates files client-side, tracks per-file
 * progress in the store, and upserts the resulting Asset once processed.
 */
export function useUpload() {
  const enqueueUpload = useAssetManagerStore((s) => s.enqueueUpload);
  const updateUploadProgress = useAssetManagerStore((s) => s.updateUploadProgress);
  const upsertAsset = useAssetManagerStore((s) => s.upsertAsset);
  const uploadQueue = useAssetManagerStore((s) => s.uploadQueue);
  const clearCompletedUploads = useAssetManagerStore((s) => s.clearCompletedUploads);

  const uploadFile = useCallback(
    async (file: File, options: UploadOptions = {}) => {
      const localId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        enqueueUpload({
          localId,
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: 'File exceeds 2GB limit',
        });
        return;
      }
      if (!inferAssetTypeFromExtension(file.name)) {
        enqueueUpload({
          localId,
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: 'Unsupported file type',
        });
        return;
      }

      enqueueUpload({ localId, fileName: file.name, progress: 0, status: 'uploading' });

      try {
        const { assetId } = await assetApi.upload(
          file,
          { tags: options.tags, description: options.description, folderId: options.folderId },
          (pct) => updateUploadProgress(localId, { progress: pct })
        );
        updateUploadProgress(localId, { status: 'processing', progress: 100 });
        const asset: Asset = await assetApi.get(assetId);
        upsertAsset(asset);
        updateUploadProgress(localId, { status: 'complete', assetId });
      } catch (err) {
        updateUploadProgress(localId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [enqueueUpload, updateUploadProgress, upsertAsset]
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[], options: UploadOptions = {}) => {
      await Promise.all(Array.from(files).map((file) => uploadFile(file, options)));
    },
    [uploadFile]
  );

  return { uploadFile, uploadFiles, uploadQueue, clearCompletedUploads };
}

/** Convenience hook for the currently active (detail-panel / preview) asset. */
export function useActiveAsset() {
  const activeAssetId = useAssetManagerStore((s) => s.activeAssetId);
  const asset = useAssetManagerStore((s) => (activeAssetId ? s.assets[activeAssetId] : null));
  const setActiveAsset = useAssetManagerStore((s) => s.setActiveAsset);
  return { asset, setActiveAsset };
}
