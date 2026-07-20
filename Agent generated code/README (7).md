# Geometry Engine [Claude.A2]

Built from INDEX.md bullet only ("15+ procedural operations, 3500-4500 LOC") — the real
`02_CLAUDE_A2_GEOMETRY_ENGINE.md` spec was not provided, so scope/API here is my own
reasonable design, much smaller than the 3500-4500 LOC target (real target implies many
more primitives, UV mapping, LOD, and a proper CSG backend).

## Included
- Vec2/Vec3 math (`vec.ts`)
- Indexed mesh representation + normal computation (`mesh.ts`)
- Primitives: box, sphere, plane (`primitives.ts`)
- 10 procedural ops: extrude, bevel, mirror, scale, translate, rotate, merge, subdivide,
  plus boolean union/subtract/intersect (`operations.ts`)

## Deliberately not faked
Boolean CSG operations throw with a clear message rather than shipping incorrect geometry —
real polygon booleans need a maintained library (manifold-3d / three-bvh-csg), not a
from-scratch reimplementation.
