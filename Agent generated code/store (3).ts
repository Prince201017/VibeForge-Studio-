// [CSS.A10] store.ts
// Zustand store for the CSS Animation Editor. Mutations funnel through
// named actions only (per project STATE_CONTRACT) so history/undo-redo can
// snapshot cleanly.

import { create } from 'zustand';
import type { AnimationConfig, AnimationTrack, AnimatableProperty, ExportFramework } from './types';
import { DEFAULT_EASING } from './easing';

interface HistoryState {
  past: AnimationConfig[];
  future: AnimationConfig[];
}

interface CSSAnimationState {
  config: AnimationConfig;
  selectedFramework: ExportFramework;
  history: HistoryState;
  isPlaying: boolean;
  playbackSpeed: number; // 0.1 - 2

  setConfig: (config: AnimationConfig) => void;
  addTrack: (property: AnimatableProperty) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, patch: Partial<AnimationTrack>) => void;
  setFramework: (fw: ExportFramework) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  undo: () => void;
  redo: () => void;
}

function defaultConfig(): AnimationConfig {
  return {
    id: crypto.randomUUID(),
    name: 'fadeSlideIn',
    selector: '.element',
    tracks: [
      {
        id: crypto.randomUUID(),
        property: 'opacity',
        enabled: true,
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 1, value: 1 },
        ],
      },
      {
        id: crypto.randomUUID(),
        property: 'translateY',
        enabled: true,
        keyframes: [
          { offset: 0, value: 24, unit: 'px' },
          { offset: 1, value: 0, unit: 'px' },
        ],
      },
    ],
    timing: {
      durationMs: 600,
      delayMs: 0,
      iterationCount: 1,
      direction: 'normal',
      fillMode: 'both',
      playState: 'running',
      easing: DEFAULT_EASING,
    },
    trigger: 'load',
  };
}

function snapshot(config: AnimationConfig): AnimationConfig {
  return JSON.parse(JSON.stringify(config));
}

export const useCSSAnimationStore = create<CSSAnimationState>((set, get) => ({
  config: defaultConfig(),
  selectedFramework: 'css',
  history: { past: [], future: [] },
  isPlaying: true,
  playbackSpeed: 1,

  setConfig: (config) =>
    set((state) => ({
      config,
      history: { past: [...state.history.past, snapshot(state.config)], future: [] },
    })),

  addTrack: (property) =>
    set((state) => {
      const track: AnimationTrack = {
        id: crypto.randomUUID(),
        property,
        enabled: true,
        keyframes: [
          { offset: 0, value: 0 },
          { offset: 1, value: 1 },
        ],
      };
      const config = { ...state.config, tracks: [...state.config.tracks, track] };
      return { config, history: { past: [...state.history.past, snapshot(state.config)], future: [] } };
    }),

  removeTrack: (trackId) =>
    set((state) => {
      const config = { ...state.config, tracks: state.config.tracks.filter((t) => t.id !== trackId) };
      return { config, history: { past: [...state.history.past, snapshot(state.config)], future: [] } };
    }),

  updateTrack: (trackId, patch) =>
    set((state) => {
      const config = {
        ...state.config,
        tracks: state.config.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
      };
      return { config, history: { past: [...state.history.past, snapshot(state.config)], future: [] } };
    }),

  setFramework: (fw) => set({ selectedFramework: fw }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setSpeed: (speed) => set({ playbackSpeed: Math.max(0.1, Math.min(2, speed)) }),

  undo: () => {
    const { history, config } = get();
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    set({
      config: previous,
      history: { past: history.past.slice(0, -1), future: [snapshot(config), ...history.future] },
    });
  },

  redo: () => {
    const { history, config } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    set({
      config: next,
      history: { past: [...history.past, snapshot(config)], future: history.future.slice(1) },
    });
  },
}));
