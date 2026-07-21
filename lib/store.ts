/**
 * [V0.A1] Global state management for ForgeOS editor
 * Uses Zustand for lightweight, scalable state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  EditorState,
  Project,
  Layer,
  Timeline,
  History,
  HistoryEntry,
} from './types';

interface EditorStore {
  // Projects
  projects: Project[];
  activeProjectId?: string;

  // Layers
  layers: Map<string, Layer>;
  selectedLayerIds: string[];
  hoveredLayerId?: string;

  // Timeline
  timeline: Timeline | null;

  // History
  history: History;

  // Editor state
  editorState: EditorState;

  // UI State
  panels: {
    layers: boolean;
    properties: boolean;
    timeline: boolean;
    ai: boolean;
    console: boolean;
  };

  // Actions
  setActiveProject: (projectId: string) => void;
  addProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;

  selectLayers: (layerIds: string[]) => void;
  addToSelection: (layerId: string) => void;
  removeFromSelection: (layerId: string) => void;
  clearSelection: () => void;

  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  addLayer: (layer: Layer) => void;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  setActiveTool: (tool: EditorState['tool']) => void;

  togglePanel: (panel: keyof EditorStore['panels']) => void;

  pushHistory: (entry: HistoryEntry) => void;
  undo: () => void;
  redo: () => void;

  resetEditor: () => void;
}

const initialState = {
  projects: [],
  activeProjectId: undefined,
  layers: new Map(),
  selectedLayerIds: [],
  hoveredLayerId: undefined,
  timeline: null,
  history: {
    entries: [],
    currentIndex: -1,
  },
  editorState: {
    viewport: {
      zoom: 1,
      panX: 0,
      panY: 0,
    },
    tool: 'select' as const,
    mode: 'edit' as const,
    selectedLayerIds: [],
  },
  panels: {
    layers: true,
    properties: true,
    timeline: true,
    ai: true,
    console: false,
  },
};

// [V0.A1] Create global Zustand store with devtools
export const useEditorStore = create<EditorStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // [V0.A1] Project actions
      setActiveProject: (projectId: string) => {
        set({ activeProjectId: projectId });
      },

      addProject: (project: Project) => {
        set((state) => ({
          projects: [...state.projects, project],
        }));
      },

      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          activeProjectId:
            state.activeProjectId === projectId
              ? undefined
              : state.activeProjectId,
        }));
      },

      // [V0.A1] Layer selection
      selectLayers: (layerIds: string[]) => {
        set({ selectedLayerIds: layerIds });
      },

      addToSelection: (layerId: string) => {
        set((state) => {
          if (!state.selectedLayerIds.includes(layerId)) {
            return {
              selectedLayerIds: [...state.selectedLayerIds, layerId],
            };
          }
          return state;
        });
      },

      removeFromSelection: (layerId: string) => {
        set((state) => ({
          selectedLayerIds: state.selectedLayerIds.filter(
            (id) => id !== layerId
          ),
        }));
      },

      clearSelection: () => {
        set({ selectedLayerIds: [] });
      },

      // [V0.A1] Layer updates
      updateLayer: (layerId: string, updates: Partial<Layer>) => {
        set((state) => {
          const layer = state.layers.get(layerId);
          if (layer) {
            state.layers.set(layerId, { ...layer, ...updates });
          }
          return state;
        });
      },

      deleteLayer: (layerId: string) => {
        set((state) => {
          state.layers.delete(layerId);
          return {
            layers: new Map(state.layers),
            selectedLayerIds: state.selectedLayerIds.filter(
              (id) => id !== layerId
            ),
          };
        });
      },

      addLayer: (layer: Layer) => {
        set((state) => {
          state.layers.set(layer.id, layer);
          return { layers: new Map(state.layers) };
        });
      },

      // [V0.A1] Viewport
      setZoom: (zoom: number) => {
        set((state) => ({
          editorState: {
            ...state.editorState,
            viewport: {
              ...state.editorState.viewport,
              zoom: Math.max(0.1, Math.min(zoom, 5)),
            },
          },
        }));
      },

      setPan: (x: number, y: number) => {
        set((state) => ({
          editorState: {
            ...state.editorState,
            viewport: {
              ...state.editorState.viewport,
              panX: x,
              panY: y,
            },
          },
        }));
      },

      // [V0.A1] Tool selection
      setActiveTool: (tool: EditorState['tool']) => {
        set((state) => ({
          editorState: {
            ...state.editorState,
            tool,
          },
        }));
      },

      // [V0.A1] UI panels
      togglePanel: (panel: keyof EditorStore['panels']) => {
        set((state) => ({
          panels: {
            ...state.panels,
            [panel]: !state.panels[panel],
          },
        }));
      },

      // [V0.A1] History
      pushHistory: (entry: HistoryEntry) => {
        set((state) => {
          const newEntries = state.history.entries.slice(
            0,
            state.history.currentIndex + 1
          );
          newEntries.push(entry);
          return {
            history: {
              entries: newEntries,
              currentIndex: newEntries.length - 1,
            },
          };
        });
      },

      undo: () => {
        set((state) => ({
          history: {
            ...state.history,
            currentIndex: Math.max(0, state.history.currentIndex - 1),
          },
        }));
      },

      redo: () => {
        set((state) => ({
          history: {
            ...state.history,
            currentIndex: Math.min(
              state.history.entries.length - 1,
              state.history.currentIndex + 1
            ),
          },
        }));
      },

      // [V0.A1] Reset
      resetEditor: () => {
        set(initialState);
      },
    }),
    {
      name: 'forgeos-editor-store',
    }
  )
);
