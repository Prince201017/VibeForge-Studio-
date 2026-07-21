/**
 * [ParticleEngine] usePhysics — manage the force-field list for a particle
 * system (gravity, wind, attractors, vortex, drag, curl noise, custom).
 */

import { useCallback, useMemo } from 'react';
import type { ForceField, ParticleSystemConfig } from '../types';

export interface UsePhysicsStore {
  particleSystems: Record<string, ParticleSystemConfig>;
  updateParticleSystem: (id: string, patch: Partial<ParticleSystemConfig>) => void;
  updateForceField: (systemId: string, forceId: string, patch: Partial<ForceField>) => void;
}

export interface UsePhysicsResult {
  forces: ForceField[];
  addForce: (force: ForceField) => void;
  removeForce: (id: string) => void;
  updateForce: (id: string, patch: Partial<ForceField>) => void;
  toggleForce: (id: string) => void;
  reorderForces: (fromIndex: number, toIndex: number) => void;
}

let localIdCounter = 0;
export function createDefaultForce(type: ForceField['type']): ForceField {
  localIdCounter += 1;
  const id = `force_${Date.now().toString(36)}_${localIdCounter}`;
  const base: ForceField = { id, type, enabled: true, strength: 1 };
  switch (type) {
    case 'gravity':
      return { ...base, direction: { x: 0, y: -1, z: 0 }, strength: 9.8 };
    case 'wind':
      return { ...base, direction: { x: 1, y: 0, z: 0 }, turbulence: 0.3, strength: 0.5 };
    case 'attractor':
    case 'repulsor':
      return { ...base, position: { x: 0, y: 0, z: 0 }, radius: 5, strength: 1 };
    case 'vortex':
      return { ...base, position: { x: 0, y: 0, z: 0 }, axis: { x: 0, y: 1, z: 0 }, radius: 5, strength: 1 };
    case 'drag':
      return { ...base, dragCoefficient: 0.3, strength: 0.3 };
    case 'curlNoise':
      return { ...base, strength: 0.5 };
    default:
      return base;
  }
}

export function usePhysics(
  useStore: <T>(selector: (s: UsePhysicsStore) => T) => T,
  systemId: string
): UsePhysicsResult {
  const forces = useStore((s) => s.particleSystems[systemId]?.forces ?? []);
  const updateSystem = useStore((s) => s.updateParticleSystem);
  const updateForceAction = useStore((s) => s.updateForceField);

  const addForce = useCallback(
    (force: ForceField) => updateSystem(systemId, { forces: [...forces, force] }),
    [forces, systemId, updateSystem]
  );

  const removeForce = useCallback(
    (id: string) => updateSystem(systemId, { forces: forces.filter((f) => f.id !== id) }),
    [forces, systemId, updateSystem]
  );

  const updateForce = useCallback(
    (id: string, patch: Partial<ForceField>) => updateForceAction(systemId, id, patch),
    [systemId, updateForceAction]
  );

  const toggleForce = useCallback(
    (id: string) => {
      const force = forces.find((f) => f.id === id);
      if (!force) return;
      updateForceAction(systemId, id, { enabled: !force.enabled });
    },
    [forces, systemId, updateForceAction]
  );

  const reorderForces = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...forces];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      updateSystem(systemId, { forces: next });
    },
    [forces, systemId, updateSystem]
  );

  return useMemo(
    () => ({ forces, addForce, removeForce, updateForce, toggleForce, reorderForces }),
    [forces, addForce, removeForce, updateForce, toggleForce, reorderForces]
  );
}
