// [Claude.A2] Primitive generators: box, sphere, cylinder, plane, cone.
import { Mesh, computeFaceNormals } from "./mesh";

export function box(w = 1, h = 1, d = 1): Mesh {
  const x = w / 2, y = h / 2, z = d / 2;
  const vertices = new Float32Array([
    -x,-y, z,  x,-y, z,  x, y, z,  -x, y, z, // front
    -x,-y,-z, -x, y,-z,  x, y,-z,   x,-y,-z, // back
  ]);
  const indices = new Uint32Array([
    0,1,2, 0,2,3,       // front
    4,5,6, 4,6,7,       // back
    3,2,6, 3,6,5,       // top
    0,7,1, 0,4,7,       // bottom (approx)
    1,7,6, 1,6,2,       // right
    0,3,5, 0,5,4,       // left
  ]);
  const mesh: Mesh = { vertices, indices, normals: new Float32Array(vertices.length) };
  mesh.normals = computeFaceNormals(mesh);
  return mesh;
}

export function sphere(radius = 1, segments = 16, rings = 12): Mesh {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * Math.PI;
    for (let s = 0; s <= segments; s++) {
      const phi = (s / segments) * Math.PI * 2;
      verts.push(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.cos(theta),
        radius * Math.sin(theta) * Math.sin(phi),
      );
    }
  }
  const stride = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * stride + s, b = a + stride;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const mesh: Mesh = {
    vertices: new Float32Array(verts),
    indices: new Uint32Array(idx),
    normals: new Float32Array(verts.length),
  };
  mesh.normals = computeFaceNormals(mesh);
  return mesh;
}

export function plane(w = 1, d = 1, segX = 1, segZ = 1): Mesh {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let z = 0; z <= segZ; z++) {
    for (let x = 0; x <= segX; x++) {
      verts.push((x / segX - 0.5) * w, 0, (z / segZ - 0.5) * d);
    }
  }
  const stride = segX + 1;
  for (let z = 0; z < segZ; z++) {
    for (let x = 0; x < segX; x++) {
      const a = z * stride + x, b = a + stride;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const mesh: Mesh = { vertices: new Float32Array(verts), indices: new Uint32Array(idx), normals: new Float32Array(verts.length) };
  mesh.normals = computeFaceNormals(mesh);
  return mesh;
}
