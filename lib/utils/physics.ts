/**
 * [ParticleEngine] Physics engine — force field evaluation and collision
 * resolution. Pure functions operating on the SoA particle pool for
 * cache-friendly, allocation-free per-frame updates.
 */

import type {
  CollisionBox,
  CollisionConfig,
  CollisionPlane,
  CollisionSphere,
  ForceField,
  NoiseConfig,
  Vec3,
} from './types';
import { NoiseField } from './noise';

// ---------------------------------------------------------------------------
// Spatial hash grid — used for O(n) broad-phase collision & neighbor queries
// ---------------------------------------------------------------------------

export class SpatialHashGrid {
  private cellSize: number;
  private buckets: Map<string, number[]> = new Map();

  constructor(cellSize = 1.0) {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(index: number, x: number, y: number, z: number): void {
    const k = this.key(x, y, z);
    let arr = this.buckets.get(k);
    if (!arr) {
      arr = [];
      this.buckets.set(k, arr);
    }
    arr.push(index);
  }

  /** Returns particle indices in the 3x3x3 neighborhood of a point. */
  query(x: number, y: number, z: number): number[] {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const arr = this.buckets.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (arr) result.push(...arr);
        }
      }
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Force field evaluation
// ---------------------------------------------------------------------------

const _acc: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Accumulates the acceleration contributed by a single force field for a
 * particle at (px,py,pz) moving with velocity (vx,vy,vz) at simulation time t.
 * Returns the acceleration vector (reused scratch object — copy out if needed
 * across calls). This function is intentionally allocation-free in the hot
 * path aside from the vortex/attractor branches, which are comparatively rare.
 */
export function evaluateForce(
  field: ForceField,
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  t: number,
  noiseField: NoiseField
): Vec3 {
  _acc.x = 0;
  _acc.y = 0;
  _acc.z = 0;
  if (!field.enabled) return _acc;

  switch (field.type) {
    case 'gravity': {
      const dir = field.direction ?? { x: 0, y: -1, z: 0 };
      _acc.x = dir.x * field.strength;
      _acc.y = dir.y * field.strength;
      _acc.z = dir.z * field.strength;
      return _acc;
    }
    case 'wind': {
      const dir = field.direction ?? { x: 1, y: 0, z: 0 };
      const turb = field.turbulence ?? 0;
      let jx = 0, jy = 0, jz = 0;
      if (turb > 0) {
        const n: NoiseConfig = { type: 'simplex', frequency: 0.15, amplitude: turb };
        jx = noiseField.evaluateScalar(n, px, py, pz + t);
        jy = noiseField.evaluateScalar(n, px + 91.3, py, pz + t);
        jz = noiseField.evaluateScalar(n, px, py + 47.7, pz + t);
      }
      _acc.x = dir.x * field.strength + jx;
      _acc.y = dir.y * field.strength + jy;
      _acc.z = dir.z * field.strength + jz;
      return _acc;
    }
    case 'attractor':
    case 'repulsor': {
      const center = field.position ?? { x: 0, y: 0, z: 0 };
      const dx = center.x - px, dy = center.y - py, dz = center.z - pz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq) || 0.0001;
      const radius = field.radius ?? 0;
      if (radius > 0 && dist > radius) return _acc;
      const falloff = radius > 0 ? 1 - dist / radius : 1 / (1 + distSq * 0.01);
      const sign = field.type === 'attractor' ? 1 : -1;
      const mag = (sign * field.strength * falloff) / dist;
      _acc.x = dx * mag;
      _acc.y = dy * mag;
      _acc.z = dz * mag;
      return _acc;
    }
    case 'vortex': {
      const center = field.position ?? { x: 0, y: 0, z: 0 };
      const axis = normalize(field.axis ?? { x: 0, y: 1, z: 0 });
      const rel: Vec3 = { x: px - center.x, y: py - center.y, z: pz - center.z };
      // tangential = axis x rel
      const tangent: Vec3 = cross(axis, rel);
      const tLen = Math.hypot(tangent.x, tangent.y, tangent.z) || 0.0001;
      const radius = field.radius ?? 0;
      const dist = Math.hypot(rel.x, rel.y, rel.z);
      const falloff = radius > 0 ? Math.max(0, 1 - dist / radius) : 1;
      const mag = (field.strength * falloff) / tLen;
      _acc.x = tangent.x * mag;
      _acc.y = tangent.y * mag;
      _acc.z = tangent.z * mag;
      return _acc;
    }
    case 'drag': {
      const c = field.dragCoefficient ?? field.strength;
      _acc.x = -vx * c;
      _acc.y = -vy * c;
      _acc.z = -vz * c;
      return _acc;
    }
    case 'curlNoise': {
      const cfg: NoiseConfig = { type: 'curl', frequency: 0.1, amplitude: field.strength };
      const v = noiseField.evaluateVector(cfg, px, py, pz + t * 0.05);
      _acc.x = v.x;
      _acc.y = v.y;
      _acc.z = v.z;
      return _acc;
    }
    case 'custom': {
      if (field.customFn) {
        const v = field.customFn({ x: px, y: py, z: pz }, { x: vx, y: vy, z: vz }, t);
        _acc.x = v.x;
        _acc.y = v.y;
        _acc.z = v.z;
      }
      return _acc;
    }
    default:
      return _acc;
  }
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ---------------------------------------------------------------------------
// Collision resolution
// ---------------------------------------------------------------------------

export interface CollisionResult {
  collided: boolean;
  position: Vec3;
  velocity: Vec3;
  killed: boolean;
}

const _collisionResult: CollisionResult = {
  collided: false,
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  killed: false,
};

function resolvePlane(
  plane: CollisionPlane,
  px: number, py: number, pz: number,
  vx: number, vy: number, vz: number
): boolean {
  const n = plane.normal;
  const toPoint = { x: px - plane.point.x, y: py - plane.point.y, z: pz - plane.point.z };
  const dist = toPoint.x * n.x + toPoint.y * n.y + toPoint.z * n.z;
  return dist < 0;
}

/**
 * Resolves all collision primitives against a particle. Mutates and returns
 * the shared `_collisionResult` scratch object — copy fields immediately.
 */
export function resolveCollisions(
  config: CollisionConfig,
  px: number, py: number, pz: number,
  vx: number, vy: number, vz: number
): CollisionResult {
  _collisionResult.collided = false;
  _collisionResult.killed = false;
  _collisionResult.position.x = px;
  _collisionResult.position.y = py;
  _collisionResult.position.z = pz;
  _collisionResult.velocity.x = vx;
  _collisionResult.velocity.y = vy;
  _collisionResult.velocity.z = vz;

  for (const plane of config.planes) {
    if (resolvePlane(plane, px, py, pz, vx, vy, vz)) {
      _collisionResult.collided = true;
      if (config.killOnCollide) {
        _collisionResult.killed = true;
        return _collisionResult;
      }
      const n = plane.normal;
      const vn = vx * n.x + vy * n.y + vz * n.z;
      if (config.stickOnCollide) {
        _collisionResult.velocity.x = 0;
        _collisionResult.velocity.y = 0;
        _collisionResult.velocity.z = 0;
      } else {
        _collisionResult.velocity.x = (vx - 2 * vn * n.x) * plane.bounce * (1 - plane.friction);
        _collisionResult.velocity.y = (vy - 2 * vn * n.y) * plane.bounce * (1 - plane.friction);
        _collisionResult.velocity.z = (vz - 2 * vn * n.z) * plane.bounce * (1 - plane.friction);
      }
      // push particle back to the plane surface
      _collisionResult.position.x = px - n.x * vn * 0.01;
      _collisionResult.position.y = py - n.y * vn * 0.01;
      _collisionResult.position.z = pz - n.z * vn * 0.01;
    }
  }

  for (const sphere of config.spheres) {
    const dx = px - sphere.center.x, dy = py - sphere.center.y, dz = pz - sphere.center.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < sphere.radius) {
      _collisionResult.collided = true;
      if (config.killOnCollide) {
        _collisionResult.killed = true;
        return _collisionResult;
      }
      const nx = dx / (dist || 0.0001), ny = dy / (dist || 0.0001), nz = dz / (dist || 0.0001);
      const vn = vx * nx + vy * ny + vz * nz;
      _collisionResult.velocity.x = (vx - 2 * vn * nx) * sphere.bounce * (1 - sphere.friction);
      _collisionResult.velocity.y = (vy - 2 * vn * ny) * sphere.bounce * (1 - sphere.friction);
      _collisionResult.velocity.z = (vz - 2 * vn * nz) * sphere.bounce * (1 - sphere.friction);
      _collisionResult.position.x = sphere.center.x + nx * sphere.radius;
      _collisionResult.position.y = sphere.center.y + ny * sphere.radius;
      _collisionResult.position.z = sphere.center.z + nz * sphere.radius;
    }
  }

  for (const box of config.boxes) {
    if (
      px >= box.min.x && px <= box.max.x &&
      py >= box.min.y && py <= box.max.y &&
      pz >= box.min.z && pz <= box.max.z
    ) {
      _collisionResult.collided = true;
      if (config.killOnCollide) {
        _collisionResult.killed = true;
        return _collisionResult;
      }
      // Determine nearest face and reflect on that axis (simple AABB response)
      const distances = [
        px - box.min.x, box.max.x - px,
        py - box.min.y, box.max.y - py,
        pz - box.min.z, box.max.z - pz,
      ];
      const minIdx = distances.indexOf(Math.min(...distances));
      const vel = { x: vx, y: vy, z: vz };
      if (minIdx === 0 || minIdx === 1) vel.x = -vx * box.bounce * (1 - box.friction);
      if (minIdx === 2 || minIdx === 3) vel.y = -vy * box.bounce * (1 - box.friction);
      if (minIdx === 4 || minIdx === 5) vel.z = -vz * box.bounce * (1 - box.friction);
      _collisionResult.velocity.x = vel.x;
      _collisionResult.velocity.y = vel.y;
      _collisionResult.velocity.z = vel.z;
    }
  }

  return _collisionResult;
}
