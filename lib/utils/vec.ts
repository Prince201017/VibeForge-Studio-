// [Claude.A2] Vector math core — 2D/3D ops used by every procedural operation below.
export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export const V2 = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  length: (a: Vec2): number => Math.hypot(a.x, a.y),
  normalize: (a: Vec2): Vec2 => {
    const len = V2.length(a) || 1;
    return { x: a.x / len, y: a.y / len };
  },
  lerp: (a: Vec2, b: Vec2, t: number): Vec2 => V2.add(a, V2.scale(V2.sub(b, a), t)),
  rotate: (a: Vec2, radians: number): Vec2 => ({
    x: a.x * Math.cos(radians) - a.y * Math.sin(radians),
    y: a.x * Math.sin(radians) + a.y * Math.cos(radians),
  }),
};

export const V3 = {
  add: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  cross: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  length: (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
  normalize: (a: Vec3): Vec3 => {
    const len = V3.length(a) || 1;
    return { x: a.x / len, y: a.y / len, z: a.z / len };
  },
};
