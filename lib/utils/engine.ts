/**
 * [ParticleEngine] Core engine — particle pool, lifecycle, and the CPU
 * simulation step. Particles are stored Struct-of-Arrays (SoA) style using
 * typed arrays so that (a) the update loop is cache-friendly, (b) the buffers
 * can be uploaded directly to the GPU without a marshalling pass, and (c) a
 * pool with recycling avoids GC churn at high particle counts.
 */

import type {
  CollisionConfig,
  ForceField,
  ParticleGeometry,
  ParticleSpawnOptions,
  PropertyCurves,
  RGBA,
} from './types';
import { evaluateColorGradient, evaluateCurve } from './animator';
import { evaluateForce, resolveCollisions } from './physics';
import { NoiseField } from './noise';

/** Hard ceiling matching the spec's 1M particle SLA. */
export const MAX_PARTICLES_HARD_LIMIT = 1_048_576;

// ---------------------------------------------------------------------------
// Particle pool (SoA)
// ---------------------------------------------------------------------------

export class ParticlePool {
  readonly capacity: number;

  // Core kinematics
  readonly positionX: Float32Array;
  readonly positionY: Float32Array;
  readonly positionZ: Float32Array;
  readonly velocityX: Float32Array;
  readonly velocityY: Float32Array;
  readonly velocityZ: Float32Array;
  readonly accelerationX: Float32Array;
  readonly accelerationY: Float32Array;
  readonly accelerationZ: Float32Array;

  // Rotation / scale
  readonly rotation: Float32Array;
  readonly angularVelocity: Float32Array;
  readonly scale: Float32Array;
  readonly baseScale: Float32Array;

  // Life
  readonly age: Float32Array;
  readonly lifetime: Float32Array;
  readonly alive: Uint8Array;

  // Appearance
  readonly colorR: Float32Array;
  readonly colorG: Float32Array;
  readonly colorB: Float32Array;
  readonly opacity: Float32Array;
  readonly baseColorR: Float32Array;
  readonly baseColorG: Float32Array;
  readonly baseColorB: Float32Array;
  readonly baseOpacity: Float32Array;
  readonly textureIndex: Uint16Array;
  readonly groupId: Uint16Array;
  readonly seed: Uint32Array;
  readonly mass: Float32Array;

  /** Free-list stack of recycled indices for O(1) allocation. */
  private freeList: Int32Array;
  private freeCount: number;
  /** Highest index ever allocated + 1 — bounds the active iteration range. */
  private highWaterMark = 0;

  constructor(capacity: number) {
    if (capacity > MAX_PARTICLES_HARD_LIMIT) {
      throw new Error(
        `[ParticleEngine] Requested capacity ${capacity} exceeds hard limit ${MAX_PARTICLES_HARD_LIMIT}`
      );
    }
    this.capacity = capacity;

    this.positionX = new Float32Array(capacity);
    this.positionY = new Float32Array(capacity);
    this.positionZ = new Float32Array(capacity);
    this.velocityX = new Float32Array(capacity);
    this.velocityY = new Float32Array(capacity);
    this.velocityZ = new Float32Array(capacity);
    this.accelerationX = new Float32Array(capacity);
    this.accelerationY = new Float32Array(capacity);
    this.accelerationZ = new Float32Array(capacity);

    this.rotation = new Float32Array(capacity);
    this.angularVelocity = new Float32Array(capacity);
    this.scale = new Float32Array(capacity);
    this.baseScale = new Float32Array(capacity);

    this.age = new Float32Array(capacity);
    this.lifetime = new Float32Array(capacity);
    this.alive = new Uint8Array(capacity);

    this.colorR = new Float32Array(capacity);
    this.colorG = new Float32Array(capacity);
    this.colorB = new Float32Array(capacity);
    this.opacity = new Float32Array(capacity);
    this.baseColorR = new Float32Array(capacity);
    this.baseColorG = new Float32Array(capacity);
    this.baseColorB = new Float32Array(capacity);
    this.baseOpacity = new Float32Array(capacity);
    this.textureIndex = new Uint16Array(capacity);
    this.groupId = new Uint16Array(capacity);
    this.seed = new Uint32Array(capacity);
    this.mass = new Float32Array(capacity);

    this.freeList = new Int32Array(capacity);
    this.freeCount = 0;
  }

  get activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.highWaterMark; i++) if (this.alive[i]) count++;
    return count;
  }

  /** Allocates a slot, recycling a dead particle's index when possible. */
  private allocate(): number | null {
    if (this.freeCount > 0) {
      return this.freeList[--this.freeCount];
    }
    if (this.highWaterMark < this.capacity) {
      return this.highWaterMark++;
    }
    return null; // pool exhausted
  }

  spawn(opts: ParticleSpawnOptions): number | null {
    const i = this.allocate();
    if (i === null) return null;

    this.positionX[i] = opts.position.x;
    this.positionY[i] = opts.position.y;
    this.positionZ[i] = opts.position.z;
    this.velocityX[i] = opts.velocity.x;
    this.velocityY[i] = opts.velocity.y;
    this.velocityZ[i] = opts.velocity.z;
    this.accelerationX[i] = opts.acceleration?.x ?? 0;
    this.accelerationY[i] = opts.acceleration?.y ?? 0;
    this.accelerationZ[i] = opts.acceleration?.z ?? 0;

    this.rotation[i] = opts.rotation ?? 0;
    this.angularVelocity[i] = opts.angularVelocity ?? 0;
    this.scale[i] = opts.scale ?? 1;
    this.baseScale[i] = opts.scale ?? 1;

    this.age[i] = 0;
    this.lifetime[i] = Math.max(opts.lifetime, 0.0001);
    this.alive[i] = 1;

    const c = opts.color ?? { r: 255, g: 255, b: 255, a: 1 };
    this.colorR[i] = c.r;
    this.colorG[i] = c.g;
    this.colorB[i] = c.b;
    this.opacity[i] = opts.opacity ?? c.a ?? 1;
    this.baseColorR[i] = c.r;
    this.baseColorG[i] = c.g;
    this.baseColorB[i] = c.b;
    this.baseOpacity[i] = opts.opacity ?? c.a ?? 1;

    this.textureIndex[i] = opts.textureIndex ?? 0;
    this.groupId[i] = opts.groupId ?? 0;
    this.seed[i] = opts.seed ?? (Math.random() * 0xffffffff) >>> 0;
    this.mass[i] = opts.mass ?? 1;

    return i;
  }

  kill(i: number): void {
    if (this.alive[i]) {
      this.alive[i] = 0;
      this.freeList[this.freeCount++] = i;
    }
  }

  /** Iterates only slots that have ever been allocated (bounded by high-water mark). */
  get iterationBound(): number {
    return this.highWaterMark;
  }

  reset(): void {
    this.alive.fill(0);
    this.freeCount = 0;
    this.highWaterMark = 0;
  }
}

// ---------------------------------------------------------------------------
// Simulation step
// ---------------------------------------------------------------------------

export interface SimulationContext {
  forces: ForceField[];
  collisions: CollisionConfig;
  propertyCurves: PropertyCurves;
  noiseField: NoiseField;
  simulationTime: number; // seconds since sim start
}

/**
 * Advances the entire pool by `dt` seconds. This is the hottest function in
 * the engine — kept branch-light and free of per-particle allocations aside
 * from unavoidable object literals inside evaluateForce (reused scratch).
 */
export function stepSimulation(pool: ParticlePool, dt: number, ctx: SimulationContext): void {
  const bound = pool.iterationBound;
  const forces = ctx.forces;
  const forceCount = forces.length;

  for (let i = 0; i < bound; i++) {
    if (!pool.alive[i]) continue;

    // Age & death
    pool.age[i] += dt;
    if (pool.age[i] >= pool.lifetime[i]) {
      pool.kill(i);
      continue;
    }
    const lifeT = pool.age[i] / pool.lifetime[i];

    // Accumulate forces -> acceleration
    let ax = 0, ay = 0, az = 0;
    for (let f = 0; f < forceCount; f++) {
      const force = evaluateForce(
        forces[f],
        pool.positionX[i], pool.positionY[i], pool.positionZ[i],
        pool.velocityX[i], pool.velocityY[i], pool.velocityZ[i],
        ctx.simulationTime,
        ctx.noiseField
      );
      ax += force.x / pool.mass[i];
      ay += force.y / pool.mass[i];
      az += force.z / pool.mass[i];
    }
    pool.accelerationX[i] = ax;
    pool.accelerationY[i] = ay;
    pool.accelerationZ[i] = az;

    // Semi-implicit Euler integration
    pool.velocityX[i] += ax * dt;
    pool.velocityY[i] += ay * dt;
    pool.velocityZ[i] += az * dt;

    // Velocity damping curve
    if (ctx.propertyCurves.velocityDamping?.length) {
      const damping = evaluateCurve(ctx.propertyCurves.velocityDamping, lifeT);
      pool.velocityX[i] *= 1 - damping * dt;
      pool.velocityY[i] *= 1 - damping * dt;
      pool.velocityZ[i] *= 1 - damping * dt;
    }

    let newX = pool.positionX[i] + pool.velocityX[i] * dt;
    let newY = pool.positionY[i] + pool.velocityY[i] * dt;
    let newZ = pool.positionZ[i] + pool.velocityZ[i] * dt;

    // Collisions
    if (
      ctx.collisions.planes.length ||
      ctx.collisions.spheres.length ||
      ctx.collisions.boxes.length
    ) {
      const result = resolveCollisions(
        ctx.collisions,
        newX, newY, newZ,
        pool.velocityX[i], pool.velocityY[i], pool.velocityZ[i]
      );
      if (result.collided) {
        if (result.killed) {
          pool.kill(i);
          continue;
        }
        newX = result.position.x;
        newY = result.position.y;
        newZ = result.position.z;
        pool.velocityX[i] = result.velocity.x;
        pool.velocityY[i] = result.velocity.y;
        pool.velocityZ[i] = result.velocity.z;
      }
    }

    pool.positionX[i] = newX;
    pool.positionY[i] = newY;
    pool.positionZ[i] = newZ;

    // Rotation
    pool.rotation[i] += pool.angularVelocity[i] * dt;

    // Property-over-lifetime curves
    const speed = Math.hypot(pool.velocityX[i], pool.velocityY[i], pool.velocityZ[i]);

    if (ctx.propertyCurves.scaleOverLife?.length) {
      pool.scale[i] = pool.baseScale[i] * evaluateCurve(ctx.propertyCurves.scaleOverLife, lifeT);
    }
    if (ctx.propertyCurves.sizeByVelocity?.length) {
      pool.scale[i] *= evaluateCurve(ctx.propertyCurves.sizeByVelocity, Math.min(1, speed / 10));
    }
    if (ctx.propertyCurves.rotationByVelocity?.length) {
      pool.rotation[i] += evaluateCurve(ctx.propertyCurves.rotationByVelocity, Math.min(1, speed / 10)) * dt;
    }
    if (ctx.propertyCurves.opacityOverLife?.length) {
      pool.opacity[i] = pool.baseOpacity[i] * evaluateCurve(ctx.propertyCurves.opacityOverLife, lifeT);
    }
    if (ctx.propertyCurves.colorOverLife?.length) {
      const c = evaluateColorGradient(ctx.propertyCurves.colorOverLife, lifeT);
      pool.colorR[i] = c.r;
      pool.colorG[i] = c.g;
      pool.colorB[i] = c.b;
    }
    if (ctx.propertyCurves.colorByVelocity?.length) {
      const c = evaluateColorGradient(ctx.propertyCurves.colorByVelocity, Math.min(1, speed / 10));
      pool.colorR[i] = (pool.colorR[i] + c.r) * 0.5;
      pool.colorG[i] = (pool.colorG[i] + c.g) * 0.5;
      pool.colorB[i] = (pool.colorB[i] + c.b) * 0.5;
    }
  }
}

export function readParticleColor(pool: ParticlePool, i: number): RGBA {
  return { r: pool.colorR[i], g: pool.colorG[i], b: pool.colorB[i], a: pool.opacity[i] };
}

// ---------------------------------------------------------------------------
// Particle system orchestrator (ties pool + emitters + simulation together)
// ---------------------------------------------------------------------------

export interface ParticleSystemHandle {
  pool: ParticlePool;
  geometry: ParticleGeometry;
  stats: { activeParticles: number; spawnedThisFrame: number; killedThisFrame: number };
}

export function createParticleSystemHandle(
  capacity: number,
  geometry: ParticleGeometry = 'quad'
): ParticleSystemHandle {
  return {
    pool: new ParticlePool(capacity),
    geometry,
    stats: { activeParticles: 0, spawnedThisFrame: 0, killedThisFrame: 0 },
  };
}
