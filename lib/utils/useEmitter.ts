/**
 * [ParticleEngine] useEmitter — convenience hook for reading/patching a
 * single emitter's config inside a particle system, wired to the Zustand
 * store's `updateEmitter` action.
 */

import { useCallback, useMemo } from 'react';
import type { EmitterConfig } from '../types';

export interface UseEmitterStore {
  particleSystems: Record<string, { emitters: EmitterConfig[] }>;
  updateEmitter: (systemId: string, emitterId: string, patch: Partial<EmitterConfig>) => void;
}

export interface UseEmitterResult {
  emitter: EmitterConfig | undefined;
  setPosition: (position: EmitterConfig['position']) => void;
  setRateOverTime: (rate: EmitterConfig['rateOverTime']) => void;
  addBurst: (burst: EmitterConfig['bursts'][number]) => void;
  removeBurst: (index: number) => void;
  setSpawnRange: <K extends 'lifetime' | 'speed' | 'scale' | 'rotation' | 'angularVelocity'>(
    key: K,
    range: [number, number]
  ) => void;
  toggleEnabled: () => void;
  patch: (partial: Partial<EmitterConfig>) => void;
}

export function useEmitter(
  useStore: <T>(selector: (s: UseEmitterStore) => T) => T,
  systemId: string,
  emitterId: string
): UseEmitterResult {
  const emitter = useStore((s) => s.particleSystems[systemId]?.emitters.find((e) => e.id === emitterId));
  const updateEmitterAction = useStore((s) => s.updateEmitter);

  const patch = useCallback(
    (partial: Partial<EmitterConfig>) => updateEmitterAction(systemId, emitterId, partial),
    [updateEmitterAction, systemId, emitterId]
  );

  const setPosition = useCallback((position: EmitterConfig['position']) => patch({ position }), [patch]);
  const setRateOverTime = useCallback(
    (rateOverTime: EmitterConfig['rateOverTime']) => patch({ rateOverTime }),
    [patch]
  );

  const addBurst = useCallback(
    (burst: EmitterConfig['bursts'][number]) => {
      if (!emitter) return;
      patch({ bursts: [...emitter.bursts, burst] });
    },
    [emitter, patch]
  );

  const removeBurst = useCallback(
    (index: number) => {
      if (!emitter) return;
      patch({ bursts: emitter.bursts.filter((_, i) => i !== index) });
    },
    [emitter, patch]
  );

  const setSpawnRange = useCallback(
    <K extends 'lifetime' | 'speed' | 'scale' | 'rotation' | 'angularVelocity'>(key: K, range: [number, number]) => {
      if (!emitter) return;
      patch({ spawn: { ...emitter.spawn, [key]: range } });
    },
    [emitter, patch]
  );

  const toggleEnabled = useCallback(() => {
    if (!emitter) return;
    patch({ enabled: !emitter.enabled });
  }, [emitter, patch]);

  return useMemo(
    () => ({ emitter, setPosition, setRateOverTime, addBurst, removeBurst, setSpawnRange, toggleEnabled, patch }),
    [emitter, setPosition, setRateOverTime, addBurst, removeBurst, setSpawnRange, toggleEnabled, patch]
  );
}
