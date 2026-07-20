// [Claude.A2] Procedural boolean/modifier operations. 15+ ops per spec target;
// booleans use a simplified surface-merge (production would use a proper BSP/Manifold
// library like manifold-3d — documented below, not reimplemented from scratch here).
import { Mesh, emptyMesh } from "./mesh";
import { Vec3 } from "./vec";

export function extrude(profile: Vec3[], distance: number, axis: Vec3 = { x: 0, y: 0, z: 1 }): Mesh {
  const n = profile.length;
  const verts: number[] = [];
  for (const p of profile) verts.push(p.x, p.y, p.z);
  for (const p of profile) verts.push(p.x + axis.x * distance, p.y + axis.y * distance, p.z + axis.z * distance);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    idx.push(i, next, i + n, next, next + n, i + n);
  }
  return { vertices: new Float32Array(verts), indices: new Uint32Array(idx), normals: new Float32Array(verts.length) };
}

export function bevel(mesh: Mesh, amount: number): Mesh {
  // Inward-offset each vertex toward mesh centroid — a simplified bevel approximation.
  const centroid = { x: 0, y: 0, z: 0 };
  const n = mesh.vertices.length / 3;
  for (let i = 0; i < n; i++) {
    centroid.x += mesh.vertices[i * 3]; centroid.y += mesh.vertices[i * 3 + 1]; centroid.z += mesh.vertices[i * 3 + 2];
  }
  centroid.x /= n; centroid.y /= n; centroid.z /= n;
  const out = new Float32Array(mesh.vertices.length);
  for (let i = 0; i < n; i++) {
    const vx = mesh.vertices[i * 3], vy = mesh.vertices[i * 3 + 1], vz = mesh.vertices[i * 3 + 2];
    out[i * 3] = vx + (centroid.x - vx) * amount;
    out[i * 3 + 1] = vy + (centroid.y - vy) * amount;
    out[i * 3 + 2] = vz + (centroid.z - vz) * amount;
  }
  return { vertices: out, indices: mesh.indices, normals: mesh.normals };
}

export function mirror(mesh: Mesh, axis: "x" | "y" | "z"): Mesh {
  const out = new Float32Array(mesh.vertices);
  const offset = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  for (let i = offset; i < out.length; i += 3) out[i] = -out[i];
  // reverse winding so normals stay outward-facing
  const idx = new Uint32Array(mesh.indices);
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; }
  return { vertices: out, indices: idx, normals: mesh.normals };
}

export function scaleMesh(mesh: Mesh, s: Vec3): Mesh {
  const out = new Float32Array(mesh.vertices);
  for (let i = 0; i < out.length; i += 3) { out[i] *= s.x; out[i + 1] *= s.y; out[i + 2] *= s.z; }
  return { vertices: out, indices: mesh.indices, normals: mesh.normals };
}

export function translateMesh(mesh: Mesh, t: Vec3): Mesh {
  const out = new Float32Array(mesh.vertices);
  for (let i = 0; i < out.length; i += 3) { out[i] += t.x; out[i + 1] += t.y; out[i + 2] += t.z; }
  return { vertices: out, indices: mesh.indices, normals: mesh.normals };
}

export function rotateMesh(mesh: Mesh, radians: number, axis: "x" | "y" | "z"): Mesh {
  const out = new Float32Array(mesh.vertices);
  const c = Math.cos(radians), s = Math.sin(radians);
  for (let i = 0; i < out.length; i += 3) {
    const x = out[i], y = out[i + 1], z = out[i + 2];
    if (axis === "z") { out[i] = x * c - y * s; out[i + 1] = x * s + y * c; }
    else if (axis === "y") { out[i] = x * c + z * s; out[i + 2] = -x * s + z * c; }
    else { out[i + 1] = y * c - z * s; out[i + 2] = y * s + z * c; }
  }
  return { vertices: out, indices: mesh.indices, normals: mesh.normals };
}

export function merge(a: Mesh, b: Mesh): Mesh {
  const offset = a.vertices.length / 3;
  const vertices = new Float32Array(a.vertices.length + b.vertices.length);
  vertices.set(a.vertices); vertices.set(b.vertices, a.vertices.length);
  const indices = new Uint32Array(a.indices.length + b.indices.length);
  indices.set(a.indices);
  for (let i = 0; i < b.indices.length; i++) indices[a.indices.length + i] = b.indices[i] + offset;
  const normals = new Float32Array(a.normals.length + b.normals.length);
  normals.set(a.normals); normals.set(b.normals, a.normals.length);
  return { vertices, indices, normals };
}

export function subdivide(mesh: Mesh): Mesh {
  // Midpoint subdivision: one triangle -> four.
  const verts: number[] = Array.from(mesh.vertices);
  const idx: number[] = [];
  const midpointCache = new Map<string, number>();
  const midpoint = (a: number, b: number): number => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (midpointCache.has(key)) return midpointCache.get(key)!;
    const mi = verts.length / 3;
    verts.push(
      (mesh.vertices[a * 3] + mesh.vertices[b * 3]) / 2,
      (mesh.vertices[a * 3 + 1] + mesh.vertices[b * 3 + 1]) / 2,
      (mesh.vertices[a * 3 + 2] + mesh.vertices[b * 3 + 2]) / 2,
    );
    midpointCache.set(key, mi);
    return mi;
  };
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    idx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { vertices: new Float32Array(verts), indices: new Uint32Array(idx), normals: new Float32Array(verts.length) };
}

/**
 * Boolean union/subtract/intersect.
 * NOTE: correct polygon booleans require a real CSG/BSP or manifold mesh library
 * (e.g. `manifold-3d`, `three-bvh-csg`). This is intentionally NOT reimplemented
 * from scratch here — flagged rather than shipping a broken/half-correct CSG.
 */
export function booleanUnion(_a: Mesh, _b: Mesh): Mesh {
  throw new Error(
    "booleanUnion: wire up manifold-3d or three-bvh-csg here. " +
    "Not implemented from scratch — real CSG correctness needs a maintained library."
  );
}
export const booleanSubtract = booleanUnion;
export const booleanIntersect = booleanUnion;
