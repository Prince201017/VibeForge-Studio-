/**
 * [ParticleEngine] Emitter system — computes spawn positions/directions for
 * every supported emitter shape, and drives emission rate over time
 * (continuous curve + discrete burst events).
 */

import type {
  EmitterConfig,
  ParticleSpawnOptions,
  RGBA,
  Vec3,
} from './types';
import {
  createSeededRandom,
  randomInCone,
  randomRange,
} from './animator';
import type { ParticlePool } from './engine';

// ---------------------------------------------------------------------------
// Shape sampling — returns a local-space emission point + surface normal
// ---------------------------------------------------------------------------

interface SamplePoint {
  position: Vec3;
  normal: Vec3;
}

function samplePoint(): SamplePoint {
  return { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
}

function sampleLine(rand: () => number, start: Vec3, end: Vec3): SamplePoint {
  const t = rand();
  return {
    position: {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
      z: start.z + (end.z - start.z) * t,
    },
    normal: { x: 0, y: 1, z: 0 },
  };
}

function sampleBox(rand: () => number, size: Vec3): SamplePoint {
  return {
    position: {
      x: randomRange(rand, -size.x / 2, size.x / 2),
      y: randomRange(rand, -size.y / 2, size.y / 2),
      z: randomRange(rand, -size.z / 2, size.z / 2),
    },
    normal: { x: 0, y: 1, z: 0 },
  };
}

function sampleSphere(rand: () => number, radius: number, surfaceOnly: boolean): SamplePoint {
  // Uniform sampling on/in a sphere via Marsaglia-style normalization.
  let x = 0, y = 0, z = 0, lenSq = 1;
  do {
    x = randomRange(rand, -1, 1);
    y = randomRange(rand, -1, 1);
    z = randomRange(rand, -1, 1);
    lenSq = x * x + y * y + z * z;
  } while (lenSq > 1 || lenSq === 0);
  const len = Math.sqrt(lenSq);
  const nx = x / len, ny = y / len, nz = z / len;
  const r = surfaceOnly ? radius : radius * Math.cbrt(rand());
  return {
    position: { x: nx * r, y: ny * r, z: nz * r },
    normal: { x: nx, y: ny, z: nz },
  };
}

function sampleCylinder(rand: () => number, radius: number, height: number): SamplePoint {
  const theta = randomRange(rand, 0, Math.PI * 2);
  const r = radius * Math.sqrt(rand());
  return {
    position: {
      x: Math.cos(theta) * r,
      y: randomRange(rand, -height / 2, height / 2),
      z: Math.sin(theta) * r,
    },
    normal: { x: Math.cos(theta), y: 0, z: Math.sin(theta) },
  };
}

/**
 * Very small SVG path point sampler — supports M/L/C commands with uniform
 * arc-length-agnostic sampling (approximate; adequate for particle emission
 * where perfect arc-length parametrization is not perceptually necessary).
 */
function sampleSvgPath(rand: () => number, d: string): SamplePoint {
  const commands = d.match(/[MLC][^MLC]*/gi) ?? [];
  if (commands.length === 0) return samplePoint();
  const cmd = commands[Math.floor(rand() * commands.length)];
  const nums = cmd
    .slice(1)
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  const x = nums[0] ?? 0;
  const y = nums[1] ?? 0;
  return { position: { x, y, z: 0 }, normal: { x: 0, y: 0, z: 1 } };
}

/** Emits from pixels above an alpha threshold in a pre-decoded ImageData-like buffer. */
export function sampleImageAlpha(
  rand: () => number,
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  alphaThreshold: number
): SamplePoint {
  const { data, width, height } = imageData;
  // Rejection sampling — bounded attempts to avoid infinite loop on blank images.
  for (let attempt = 0; attempt < 64; attempt++) {
    const px = Math.floor(rand() * width);
    const py = Math.floor(rand() * height);
    const idx = (py * width + px) * 4;
    const alpha = data[idx + 3] / 255;
    if (alpha >= alphaThreshold) {
      return {
        position: { x: px - width / 2, y: height / 2 - py, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
      };
    }
  }
  return samplePoint();
}

function sampleMesh(rand: () => number, vertices: Float32Array, indices: Uint32Array): SamplePoint {
  const triCount = indices.length / 3;
  if (triCount === 0) return samplePoint();
  const tri = Math.floor(rand() * triCount);
  const i0 = indices[tri * 3] * 3;
  const i1 = indices[tri * 3 + 1] * 3;
  const i2 = indices[tri * 3 + 2] * 3;

  const v0: Vec3 = { x: vertices[i0], y: vertices[i0 + 1], z: vertices[i0 + 2] };
  const v1: Vec3 = { x: vertices[i1], y: vertices[i1 + 1], z: vertices[i1 + 2] };
  const v2: Vec3 = { x: vertices[i2], y: vertices[i2 + 1], z: vertices[i2 + 2] };

  // Uniform barycentric sampling
  let u = rand(), v = rand();
  if (u + v > 1) {
    u = 1 - u;
    v = 1 - v;
  }
  const w = 1 - u - v;
  const position: Vec3 = {
    x: v0.x * w + v1.x * u + v2.x * v,
    y: v0.y * w + v1.y * u + v2.y * v,
    z: v0.z * w + v1.z * u + v2.z * v,
  };

  const e1: Vec3 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
  const e2: Vec3 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
  const normal: Vec3 = {
    x: e1.y * e2.z - e1.z * e2.y,
    y: e1.z * e2.x - e1.x * e2.z,
    z: e1.x * e2.y - e1.y * e2.x,
  };
  const nLen = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return {
    position,
    normal: { x: normal.x / nLen, y: normal.y / nLen, z: normal.z / nLen },
  };
}

function sampleShapeByShape(emitter: EmitterConfig, rand: () => number): SamplePoint {
  switch (emitter.shape) {
    case 'point':
      return samplePoint();
    case 'line':
      return emitter.line
        ? sampleLine(rand, emitter.line.start, emitter.line.end)
        : samplePoint();
    case 'box':
      return emitter.box ? sampleBox(rand, emitter.box.size) : samplePoint();
    case 'sphere':
      return emitter.sphere
        ? sampleSphere(rand, emitter.sphere.radius, !!emitter.sphere.surfaceOnly)
        : samplePoint();
    case 'cylinder':
      return emitter.cylinder
        ? sampleCylinder(rand, emitter.cylinder.radius, emitter.cylinder.height)
        : samplePoint();
    case 'svgPath':
      return emitter.svgPath ? sampleSvgPath(rand, emitter.svgPath.d) : samplePoint();
    case 'mesh':
      return emitter.meshEmission
        ? sampleMesh(rand, emitter.meshEmission.vertices, emitter.meshEmission.indices)
        : samplePoint();
    case 'image':
    case 'shape':
    default:
      return samplePoint();
  }
}

// ---------------------------------------------------------------------------
// Emission rate driver — continuous curve + burst scheduling
// ---------------------------------------------------------------------------

export class EmitterDriver {
  private emitter: EmitterConfig;
  private rand: () => number;
  private elapsed = 0;
  private spawnAccumulator = 0;
  private firedBursts: Set<string> = new Set();

  constructor(emitter: EmitterConfig, seed = 1) {
    this.emitter = emitter;
    this.rand = createSeededRandom(seed);
  }

  private rateAt(t: number): number {
    const curve = this.emitter.rateOverTime;
    if (curve.length === 0) return 0;
    if (curve.length === 1) return curve[0].rate;
    const sorted = [...curve].sort((a, b) => a.t - b.t);
    const loopT = this.emitter.looping ? t % 1 : Math.min(1, t);
    if (loopT <= sorted[0].t) return sorted[0].rate;
    if (loopT >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].rate;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (loopT >= a.t && loopT <= b.t) {
        const span = b.t - a.t || 1e-6;
        const localT = (loopT - a.t) / span;
        return a.rate + (b.rate - a.rate) * localT;
      }
    }
    return sorted[sorted.length - 1].rate;
  }

  private dueBursts(dt: number): number {
    let count = 0;
    for (const burst of this.emitter.bursts) {
      const cycles = burst.cycles ?? 1;
      const interval = burst.interval ?? 0;
      for (let c = 0; c < cycles; c++) {
        const fireTime = burst.time + c * interval;
        const key = `${burst.time}-${c}`;
        if (
          !this.firedBursts.has(key) &&
          this.elapsed >= fireTime &&
          this.elapsed - dt < fireTime
        ) {
          if (burst.probability === undefined || this.rand() <= burst.probability) {
            count += burst.count;
          }
          this.firedBursts.add(key);
        }
      }
    }
    return count;
  }

  /** Returns how many particles should spawn this frame, respecting the per-frame cap. */
  tick(dt: number): number {
    this.elapsed += dt;
    if (!this.emitter.enabled) return 0;
    if (!this.emitter.looping && this.elapsed > this.emitter.duration) return 0;

    const normalizedT = this.emitter.looping
      ? this.elapsed / Math.max(this.emitter.duration, 0.0001)
      : this.elapsed / Math.max(this.emitter.duration, 0.0001);

    const rate = this.rateAt(normalizedT);
    this.spawnAccumulator += rate * dt;
    let toSpawn = Math.floor(this.spawnAccumulator);
    this.spawnAccumulator -= toSpawn;

    toSpawn += this.dueBursts(dt);

    return Math.min(toSpawn, this.emitter.maxParticlesPerFrame);
  }

  /** Builds a fully-randomized spawn options object for one particle. */
  buildSpawnOptions(): ParticleSpawnOptions {
    const { spawn } = this.emitter;
    const sample = sampleShapeByShape(this.emitter, this.rand);

    const worldPos: Vec3 = {
      x: this.emitter.position.x + sample.position.x,
      y: this.emitter.position.y + sample.position.y,
      z: this.emitter.position.z + sample.position.z,
    };

    const speed = randomRange(this.rand, spawn.speed[0], spawn.speed[1]);
    const dir = randomInCone(this.rand, spawn.direction, spawn.directionSpread);
    const velocity: Vec3 = { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed };

    const scale = randomRange(this.rand, spawn.scale[0], spawn.scale[1]);
    const rotation = randomRange(this.rand, spawn.rotation[0], spawn.rotation[1]);
    const angularVelocity = randomRange(this.rand, spawn.angularVelocity[0], spawn.angularVelocity[1]);
    const lifetime = randomRange(this.rand, spawn.lifetime[0], spawn.lifetime[1]);

    let color: RGBA = { ...spawn.colorStart };
    if (spawn.colorVariance) {
      const jitter = () => (this.rand() * 2 - 1) * spawn.colorVariance! * 255;
      color = {
        r: clamp255(color.r + jitter()),
        g: clamp255(color.g + jitter()),
        b: clamp255(color.b + jitter()),
        a: color.a,
      };
    }

    return {
      position: worldPos,
      velocity,
      scale,
      rotation,
      angularVelocity,
      lifetime,
      color,
      opacity: color.a,
      seed: Math.floor(this.rand() * 0xffffffff),
    };
  }
}

function clamp255(v: number): number {
  return Math.min(255, Math.max(0, v));
}

/** Convenience: ticks an emitter and spawns the resulting particles into a pool. */
export function updateEmitter(driver: EmitterDriver, pool: ParticlePool, dt: number): number {
  const count = driver.tick(dt);
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    const opts = driver.buildSpawnOptions();
    if (pool.spawn(opts) !== null) spawned++;
    else break; // pool exhausted
  }
  return spawned;
}
