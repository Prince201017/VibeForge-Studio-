// [Claude.A2] Core mesh representation: indexed vertex/face buffers.
import { Vec3 } from "./vec";

export interface Mesh {
  vertices: Float32Array; // xyz xyz xyz ...
  indices: Uint32Array;   // triangle list
  normals: Float32Array;
}

export function vertexCount(mesh: Mesh): number {
  return mesh.vertices.length / 3;
}

export function getVertex(mesh: Mesh, i: number): Vec3 {
  return { x: mesh.vertices[i * 3], y: mesh.vertices[i * 3 + 1], z: mesh.vertices[i * 3 + 2] };
}

export function computeFaceNormals(mesh: Mesh): Float32Array {
  const normals = new Float32Array(mesh.vertices.length);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = getVertex(mesh, mesh.indices[i]);
    const b = getVertex(mesh, mesh.indices[i + 1]);
    const c = getVertex(mesh, mesh.indices[i + 2]);
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const n = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x,
    };
    for (const idx of [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]]) {
      normals[idx * 3] += n.x;
      normals[idx * 3 + 1] += n.y;
      normals[idx * 3 + 2] += n.z;
    }
  }
  // normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
  }
  return normals;
}

export function emptyMesh(): Mesh {
  return { vertices: new Float32Array(0), indices: new Uint32Array(0), normals: new Float32Array(0) };
}
