/**
 * [ParticleEngine] Noise & turbulence functions.
 *
 * Implements Perlin, Simplex, Curl (derived from Perlin), fractal Brownian
 * motion, ridged multi-fractal, and Worley/cellular noise. All functions are
 * deterministic given a seed so simulations are reproducible.
 *
 * Performance note: these are hand-rolled (no external noise lib dependency)
 * to keep bundle size down and allow inlining in hot particle-update loops.
 */

import type { NoiseConfig, Vec2, Vec3 } from './types';

// ---------------------------------------------------------------------------
// Seeded permutation table (shared base for Perlin/Simplex/Curl)
// ---------------------------------------------------------------------------

function buildPermutationTable(seed: number): Uint8Array {
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;

  // xorshift32 PRNG seeded deterministically
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

const GRAD3: Vec3[] = [
  { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 },
];

function dot3(g: Vec3, x: number, y: number, z: number): number {
  return g.x * x + g.y * y + g.z * z;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// ---------------------------------------------------------------------------
// Perlin noise (3D, classic)
// ---------------------------------------------------------------------------

export class PerlinNoise {
  private perm: Uint8Array;

  constructor(seed = 1337) {
    this.perm = buildPermutationTable(seed);
  }

  /** Evaluate 3D Perlin noise in roughly [-1, 1]. */
  noise3(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const p = this.perm;

    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;

    const g = (hash: number, x: number, y: number, z: number) => dot3(GRAD3[hash % 12], x, y, z);

    return lerp(
      lerp(
        lerp(g(p[AA], x, y, z), g(p[BA], x - 1, y, z), u),
        lerp(g(p[AB], x, y - 1, z), g(p[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(g(p[AA + 1], x, y, z - 1), g(p[BA + 1], x - 1, y, z - 1), u),
        lerp(g(p[AB + 1], x, y - 1, z - 1), g(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  noise2(x: number, y: number): number {
    return this.noise3(x, y, 0);
  }
}

// ---------------------------------------------------------------------------
// Simplex noise (3D) — faster than classic Perlin at higher dimensions
// ---------------------------------------------------------------------------

const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

export class SimplexNoise {
  private perm: Uint8Array;

  constructor(seed = 1337) {
    this.perm = buildPermutationTable(seed);
  }

  noise3(xin: number, yin: number, zin: number): number {
    const perm = this.perm;
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    const gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
    const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
    const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot3(GRAD3[gi0], x0, y0, z0); }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot3(GRAD3[gi1], x1, y1, z1); }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot3(GRAD3[gi2], x2, y2, z2); }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * dot3(GRAD3[gi3], x3, y3, z3); }

    return 32 * (n0 + n1 + n2 + n3);
  }
}

// ---------------------------------------------------------------------------
// Curl noise — divergence-free vector field derived from a scalar potential.
// Produces smooth, incompressible "flow" ideal for smoke/fluid-like motion.
// ---------------------------------------------------------------------------

export class CurlNoise {
  private simplex: SimplexNoise;
  private eps = 0.0009;

  constructor(seed = 1337) {
    this.simplex = new SimplexNoise(seed);
  }

  private potential(x: number, y: number, z: number): Vec3 {
    return {
      x: this.simplex.noise3(x, y, z),
      y: this.simplex.noise3(x + 31.4, y + 17.1, z - 4.2),
      z: this.simplex.noise3(x - 6.6, y + 8.3, z + 22.9),
    };
  }

  /** Returns a divergence-free 3D velocity field sample at (x, y, z). */
  curl3(x: number, y: number, z: number): Vec3 {
    const e = this.eps;
    const p1 = this.potential(x, y + e, z);
    const p2 = this.potential(x, y - e, z);
    const p3 = this.potential(x, y, z + e);
    const p4 = this.potential(x, y, z - e);
    const p5 = this.potential(x + e, y, z);
    const p6 = this.potential(x - e, y, z);

    const dydz = (p1.z - p2.z) / (2 * e);
    const dzdy = (p3.y - p4.y) / (2 * e);
    const curlX = dydz - dzdy;

    const dzdx = (p3.x - p4.x) / (2 * e);
    const dxdz = (p5.z - p6.z) / (2 * e);
    const curlY = dzdx - dxdz;

    const dxdy = (p5.y - p6.y) / (2 * e);
    const dydx = (p1.x - p2.x) / (2 * e);
    const curlZ = dxdy - dydx;

    return { x: curlX, y: curlY, z: curlZ };
  }
}

// ---------------------------------------------------------------------------
// Fractal Brownian Motion / Ridged Multifractal (layered noise)
// ---------------------------------------------------------------------------

export function fbm(
  noise: PerlinNoise | SimplexNoise,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  persistence = 0.5
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise.noise3(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return total / maxValue;
}

export function ridgedMultifractal(
  noise: PerlinNoise | SimplexNoise,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  persistence = 0.5
): number {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let signal = noise.noise3(x * frequency, y * frequency, z * frequency);
    signal = 1 - Math.abs(signal);
    signal *= signal;
    signal *= weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    total += signal * amplitude;
    frequency *= lacunarity;
    amplitude *= persistence;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Worley / cellular noise
// ---------------------------------------------------------------------------

export class WorleyNoise {
  private seed: number;

  constructor(seed = 1337) {
    this.seed = seed;
  }

  private hash(ix: number, iy: number, iz: number): Vec3 {
    let h = ix * 374761393 + iy * 668265263 + iz * 2147483647 + this.seed * 3266489917;
    h = (h ^ (h >>> 13)) * 1274126177;
    h ^= h >>> 16;
    const rx = ((h & 0xffff) / 0xffff);
    const ry = (((h >>> 16) & 0xffff) / 0xffff);
    const rz = (((h * 2654435761) >>> 8) & 0xffff) / 0xffff;
    return { x: rx, y: ry, z: rz };
  }

  /** Returns distance to nearest feature point (F1) — classic cellular look. */
  worley3(x: number, y: number, z: number): number {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let minDist = Infinity;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cx = ix + dx, cy = iy + dy, cz = iz + dz;
          const feature = this.hash(cx, cy, cz);
          const fx = cx + feature.x, fy = cy + feature.y, fz = cz + feature.z;
          const dist = Math.hypot(x - fx, y - fy, z - fz);
          if (dist < minDist) minDist = dist;
        }
      }
    }
    return minDist;
  }
}

// ---------------------------------------------------------------------------
// Unified evaluator driven by NoiseConfig (used by physics.ts force fields)
// ---------------------------------------------------------------------------

export class NoiseField {
  private perlin: PerlinNoise;
  private simplex: SimplexNoise;
  private curl: CurlNoise;
  private worley: WorleyNoise;

  constructor(seed = 1337) {
    this.perlin = new PerlinNoise(seed);
    this.simplex = new SimplexNoise(seed);
    this.curl = new CurlNoise(seed);
    this.worley = new WorleyNoise(seed);
  }

  /** Scalar evaluation (used for density fields, spawn masks, etc). */
  evaluateScalar(config: NoiseConfig, x: number, y: number, z: number): number {
    const f = config.frequency;
    switch (config.type) {
      case 'perlin':
        return this.perlin.noise3(x * f, y * f, z * f) * config.amplitude;
      case 'simplex':
        return this.simplex.noise3(x * f, y * f, z * f) * config.amplitude;
      case 'fbm':
        return (
          fbm(this.simplex, x * f, y * f, z * f, config.octaves ?? 4, config.lacunarity ?? 2, config.persistence ?? 0.5) *
          config.amplitude
        );
      case 'ridged':
        return (
          ridgedMultifractal(
            this.simplex,
            x * f,
            y * f,
            z * f,
            config.octaves ?? 4,
            config.lacunarity ?? 2,
            config.persistence ?? 0.5
          ) * config.amplitude
        );
      case 'worley':
        return this.worley.worley3(x * f, y * f, z * f) * config.amplitude;
      default:
        return 0;
    }
  }

  /** Vector evaluation — only meaningful for 'curl', used as a velocity/force field. */
  evaluateVector(config: NoiseConfig, x: number, y: number, z: number): Vec3 {
    if (config.type !== 'curl') {
      const s = this.evaluateScalar(config, x, y, z);
      return { x: s, y: s, z: s };
    }
    const f = config.frequency;
    const c = this.curl.curl3(x * f, y * f, z * f);
    return { x: c.x * config.amplitude, y: c.y * config.amplitude, z: c.z * config.amplitude };
  }
}
