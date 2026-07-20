// [Claude.A1] Shared geometry primitives used across geometry-engine, viewport-renderer,
// animation-system, and particle-engine. Single source of truth to avoid drift.

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler degrees
  scale: Vec3;
}

export type NodeId = string;
export type ProjectId = string;

export interface SceneNode {
  id: NodeId;
  type: "shape" | "group" | "particle-emitter" | "text" | "image";
  transform: Transform;
  visible: boolean;
  locked: boolean;
  children: NodeId[];
  parentId: NodeId | null;
  data: Record<string, unknown>;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export function identityTransform(): Transform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}
