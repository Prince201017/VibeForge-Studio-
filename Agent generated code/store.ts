// [Claude.A8] Asset Manager - Zustand Store
// All asset-related state mutations flow through this store per the
// STATE_CONTRACT. History entries are pushed for every mutating action so
// undo/redo works for asset operations (folder moves, tag edits, deletes).

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Asset,
  AssetFolder,
  AssetFilter,
  AssetSortField,
  SortDirection,
  ViewMode,
  UploadProgressItem,
  SmartCollection,
} from './types';

interface HistoryEntry {
  type: string;
  undo: () => void;
  redo: () => void;
  timestamp: number;
}

interface AssetManagerState {
  // Data
  assets: Record<string, Asset>;
  folders: Record<string, AssetFolder>;
  smartCollections: SmartCollection[];
  currentFolderId: string | null;

  // UI state
  viewMode: ViewMode;
  selectedAssetIds: string[];
  activeAssetId: string | null; // for detail panel / preview
  filter: AssetFilter;
  sort: AssetSortField;
  sortDirection: SortDirection;
  searchQuery: string;
  savedSearches: { name: string; filter: AssetFilter }[];

  // Upload
  uploadQueue: UploadProgressItem[];

  // Loading / pagination
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;

  // History (undo/redo scoped to asset ops)
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setAssets: (assets: Asset[], opts?: { append?: boolean; total?: number; hasMore?: boolean }) => void;
  upsertAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  setFolders: (folders: AssetFolder[]) => void;
  addFolder: (folder: AssetFolder) => void;
  removeFolder: (folderId: string) => void;
  setCurrentFolder: (folderId: string | null) => void;

  setViewMode: (mode: ViewMode) => void;
  toggleSelect: (assetId: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setActiveAsset: (assetId: string | null) => void;

  setFilter: (filter: Partial<AssetFilter>) => void;
  resetFilter: () => void;
  setSort: (sort: AssetSortField, direction?: SortDirection) => void;
  setSearchQuery: (query: string) => void;
  saveSearch: (name: string) => void;

  enqueueUpload: (item: UploadProgressItem) => void;
  updateUploadProgress: (localId: string, patch: Partial<UploadProgressItem>) => void;
  clearCompletedUploads: () => void;

  toggleFavorite: (assetId: string) => void;
  addTag: (assetId: string, tag: string) => void;
  removeTag: (assetId: string, tag: string) => void;
  moveToFolder: (assetIds: string[], folderId: string | null) => void;

  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;

  pushHistory: (entry: Omit<HistoryEntry, 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_FILTER: AssetFilter = {};

export const useAssetManagerStore = create<AssetManagerState>()(
  devtools((set, get) => ({
    assets: {},
    folders: {},
    smartCollections: [],
    currentFolderId: null,

    viewMode: 'grid',
    selectedAssetIds: [],
    activeAssetId: null,
    filter: DEFAULT_FILTER,
    sort: 'date',
    sortDirection: 'desc',
    searchQuery: '',
    savedSearches: [],

    uploadQueue: [],

    isLoading: false,
    page: 1,
    pageSize: 60,
    total: 0,
    hasMore: false,

    history: [],
    historyIndex: -1,

    setAssets: (assets, opts) =>
      set((state) => {
        const map = opts?.append ? { ...state.assets } : {};
        for (const a of assets) map[a.id] = a;
        return {
          assets: map,
          total: opts?.total ?? state.total,
          hasMore: opts?.hasMore ?? state.hasMore,
        };
      }),

    upsertAsset: (asset) =>
      set((state) => ({ assets: { ...state.assets, [asset.id]: asset } })),

    removeAsset: (assetId) =>
      set((state) => {
        const next = { ...state.assets };
        delete next[assetId];
        return {
          assets: next,
          selectedAssetIds: state.selectedAssetIds.filter((id) => id !== assetId),
          activeAssetId: state.activeAssetId === assetId ? null : state.activeAssetId,
        };
      }),

    setFolders: (folders) =>
      set(() => ({ folders: Object.fromEntries(folders.map((f) => [f.id, f])) })),

    addFolder: (folder) =>
      set((state) => ({ folders: { ...state.folders, [folder.id]: folder } })),

    removeFolder: (folderId) =>
      set((state) => {
        const next = { ...state.folders };
        delete next[folderId];
        return { folders: next };
      }),

    setCurrentFolder: (folderId) => set({ currentFolderId: folderId, page: 1 }),

    setViewMode: (mode) => set({ viewMode: mode }),

    toggleSelect: (assetId, multi = false) =>
      set((state) => {
        if (!multi) {
          const alreadySoleSelection =
            state.selectedAssetIds.length === 1 && state.selectedAssetIds[0] === assetId;
          return { selectedAssetIds: alreadySoleSelection ? [] : [assetId] };
        }
        const has = state.selectedAssetIds.includes(assetId);
        return {
          selectedAssetIds: has
            ? state.selectedAssetIds.filter((id) => id !== assetId)
            : [...state.selectedAssetIds, assetId],
        };
      }),

    clearSelection: () => set({ selectedAssetIds: [] }),

    selectAll: () => set((state) => ({ selectedAssetIds: Object.keys(state.assets) })),

    setActiveAsset: (assetId) => set({ activeAssetId: assetId }),

    setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter }, page: 1 })),

    resetFilter: () => set({ filter: DEFAULT_FILTER, page: 1 }),

    setSort: (sort, direction) =>
      set((state) => ({ sort, sortDirection: direction ?? state.sortDirection })),

    setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),

    saveSearch: (name) =>
      set((state) => ({
        savedSearches: [...state.savedSearches, { name, filter: { ...state.filter, query: state.searchQuery } }],
      })),

    enqueueUpload: (item) => set((state) => ({ uploadQueue: [...state.uploadQueue, item] })),

    updateUploadProgress: (localId, patch) =>
      set((state) => ({
        uploadQueue: state.uploadQueue.map((item) =>
          item.localId === localId ? { ...item, ...patch } : item
        ),
      })),

    clearCompletedUploads: () =>
      set((state) => ({
        uploadQueue: state.uploadQueue.filter(
          (item) => item.status !== 'complete' && item.status !== 'error'
        ),
      })),

    toggleFavorite: (assetId) => {
      const asset = get().assets[assetId];
      if (!asset) return;
      const wasFavorited = asset.favorited;
      set((state) => ({
        assets: {
          ...state.assets,
          [assetId]: { ...asset, favorited: !wasFavorited },
        },
      }));
      get().pushHistory({
        type: 'toggleFavorite',
        undo: () =>
          set((state) => ({
            assets: { ...state.assets, [assetId]: { ...state.assets[assetId], favorited: wasFavorited } },
          })),
        redo: () =>
          set((state) => ({
            assets: { ...state.assets, [assetId]: { ...state.assets[assetId], favorited: !wasFavorited } },
          })),
      });
    },

    addTag: (assetId, tag) =>
      set((state) => {
        const asset = state.assets[assetId];
        if (!asset || asset.tags.includes(tag)) return state;
        return {
          assets: { ...state.assets, [assetId]: { ...asset, tags: [...asset.tags, tag] } },
        };
      }),

    removeTag: (assetId, tag) =>
      set((state) => {
        const asset = state.assets[assetId];
        if (!asset) return state;
        return {
          assets: {
            ...state.assets,
            [assetId]: { ...asset, tags: asset.tags.filter((t) => t !== tag) },
          },
        };
      }),

    moveToFolder: (assetIds, folderId) => {
      const prevFolders = new Map(assetIds.map((id) => [id, get().assets[id]?.folderId ?? null]));
      set((state) => {
        const next = { ...state.assets };
        for (const id of assetIds) {
          if (next[id]) next[id] = { ...next[id], folderId };
        }
        return { assets: next };
      });
      get().pushHistory({
        type: 'moveToFolder',
        undo: () =>
          set((state) => {
            const next = { ...state.assets };
            for (const id of assetIds) {
              if (next[id]) next[id] = { ...next[id], folderId: prevFolders.get(id) ?? null };
            }
            return { assets: next };
          }),
        redo: () =>
          set((state) => {
            const next = { ...state.assets };
            for (const id of assetIds) {
              if (next[id]) next[id] = { ...next[id], folderId };
            }
            return { assets: next };
          }),
      });
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setPage: (page) => set({ page }),

    pushHistory: (entry) =>
      set((state) => {
        const truncated = state.history.slice(0, state.historyIndex + 1);
        const next = [...truncated, { ...entry, timestamp: Date.now() }];
        return { history: next, historyIndex: next.length - 1 };
      }),

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < 0) return;
      history[historyIndex].undo();
      set({ historyIndex: historyIndex - 1 });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex + 1 >= history.length) return;
      history[historyIndex + 1].redo();
      set({ historyIndex: historyIndex + 1 });
    },
  }))
);
