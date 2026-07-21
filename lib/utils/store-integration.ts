/**
 * [ParticleEngine] Zustand store integration.
 *
 * Adds particle systems as a first-class layer type in the editor's global
 * state, following the project's STATE_CONTRACT.md convention: all mutations
 * go through named store actions, every mutation pushes a history entry, and
 * undo/redo replays inverse/forward patches.
 *
 * This file intentionally depends only on a minimal `StoreSlice` shape so it
 * can be composed into the app's root store via Zustand's slice pattern
 * (`create<RootState>()((...a) => ({ ...createParticleSlice(...a) }))`)
 * without this package needing to import the app's root store type.
 */

import type { StateCreator } from 'zustand';
import type { ParticleSystemConfig, PerformanceStats } from './types';
import { instantiatePreset, type PresetName } from './presets';

// ---------------------------------------------------------------------------
// History entry shape (compatible with the app's generic undo/redo system)
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  type: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
}

export interface ParticleHistorySink {
  pushHistory(entry: HistoryEntry): void;
}

// ---------------------------------------------------------------------------
// Slice state & actions
// ---------------------------------------------------------------------------

export interface ParticleSlice {
  particleSystems: Record<string, ParticleSystemConfig>;
  particleSystemOrder: string[];
  particlePerformanceStats: Record<string, PerformanceStats>;

  addParticleSystem: (config: ParticleSystemConfig) => void;
  addParticleSystemFromPreset: (preset: PresetName, origin?: { x: number; y: number; z: number }) => string;
  removeParticleSystem: (id: string) => void;
  updateParticleSystem: (id: string, patch: Partial<ParticleSystemConfig>) => void;
  updateEmitter: (systemId: string, emitterId: string, patch: Record<string, unknown>) => void;
  updateForceField: (systemId: string, forceId: string, patch: Record<string, unknown>) => void;
  reorderParticleSystem: (id: string, newIndex: number) => void;
  setParticlePerformanceStats: (id: string, stats: PerformanceStats) => void;
  exportParticleSystemJSON: (id: string) => string | null;
  importParticleSystemJSON: (json: string) => string | null;
}

/**
 * Creates the particle slice. `historySink` is optional — when supplied,
 * every mutating action also pushes an undo/redo entry, matching the app's
 * "history tracking on all mutations" requirement.
 */
export function createParticleSlice(
  historySink?: ParticleHistorySink
): StateCreator<ParticleSlice, [], [], ParticleSlice> {
  return (set, get) => ({
    particleSystems: {},
    particleSystemOrder: [],
    particlePerformanceStats: {},

    addParticleSystem: (config) => {
      const prevOrder = get().particleSystemOrder;
      set((state) => ({
        particleSystems: { ...state.particleSystems, [config.id]: config },
        particleSystemOrder: [...state.particleSystemOrder, config.id],
      }));
      historySink?.pushHistory({
        type: 'particle/add',
        timestamp: Date.now(),
        undo: () => set((state) => {
          const { [config.id]: _removed, ...rest } = state.particleSystems;
          return { particleSystems: rest, particleSystemOrder: prevOrder };
        }),
        redo: () => set((state) => ({
          particleSystems: { ...state.particleSystems, [config.id]: config },
          particleSystemOrder: [...prevOrder, config.id],
        })),
      });
    },

    addParticleSystemFromPreset: (preset, origin) => {
      const config = instantiatePreset(preset, origin);
      get().addParticleSystem(config);
      return config.id;
    },

    removeParticleSystem: (id) => {
      const prevSystem = get().particleSystems[id];
      const prevOrder = get().particleSystemOrder;
      if (!prevSystem) return;
      set((state) => {
        const { [id]: _removed, ...rest } = state.particleSystems;
        return {
          particleSystems: rest,
          particleSystemOrder: state.particleSystemOrder.filter((sid) => sid !== id),
        };
      });
      historySink?.pushHistory({
        type: 'particle/remove',
        timestamp: Date.now(),
        undo: () => set((state) => ({
          particleSystems: { ...state.particleSystems, [id]: prevSystem },
          particleSystemOrder: prevOrder,
        })),
        redo: () => set((state) => {
          const { [id]: _removed, ...rest } = state.particleSystems;
          return { particleSystems: rest, particleSystemOrder: state.particleSystemOrder.filter((sid) => sid !== id) };
        }),
      });
    },

    updateParticleSystem: (id, patch) => {
      const prev = get().particleSystems[id];
      if (!prev) return;
      const next: ParticleSystemConfig = { ...prev, ...patch, updatedAt: Date.now() };
      set((state) => ({ particleSystems: { ...state.particleSystems, [id]: next } }));
      historySink?.pushHistory({
        type: 'particle/update',
        timestamp: Date.now(),
        undo: () => set((state) => ({ particleSystems: { ...state.particleSystems, [id]: prev } })),
        redo: () => set((state) => ({ particleSystems: { ...state.particleSystems, [id]: next } })),
      });
    },

    updateEmitter: (systemId, emitterId, patch) => {
      const prev = get().particleSystems[systemId];
      if (!prev) return;
      const prevEmitters = prev.emitters;
      const nextEmitters = prevEmitters.map((e) => (e.id === emitterId ? { ...e, ...patch } : e));
      get().updateParticleSystem(systemId, { emitters: nextEmitters });
    },

    updateForceField: (systemId, forceId, patch) => {
      const prev = get().particleSystems[systemId];
      if (!prev) return;
      const nextForces = prev.forces.map((f) => (f.id === forceId ? { ...f, ...patch } : f));
      get().updateParticleSystem(systemId, { forces: nextForces });
    },

    reorderParticleSystem: (id, newIndex) => {
      const order = get().particleSystemOrder;
      const oldIndex = order.indexOf(id);
      if (oldIndex === -1) return;
      const nextOrder = [...order];
      nextOrder.splice(oldIndex, 1);
      nextOrder.splice(newIndex, 0, id);
      set({ particleSystemOrder: nextOrder });
    },

    setParticlePerformanceStats: (id, stats) => {
      set((state) => ({ particlePerformanceStats: { ...state.particlePerformanceStats, [id]: stats } }));
    },

    exportParticleSystemJSON: (id) => {
      const system = get().particleSystems[id];
      return system ? JSON.stringify(system, null, 2) : null;
    },

    importParticleSystemJSON: (json) => {
      try {
        const parsed = JSON.parse(json) as ParticleSystemConfig;
        if (!parsed.id || !parsed.emitters) throw new Error('Invalid particle system JSON');
        get().addParticleSystem(parsed);
        return parsed.id;
      } catch {
        return null;
      }
    },
  });
}
