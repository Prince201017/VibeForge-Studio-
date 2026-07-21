/**
 * [V0.A1] Core type definitions for ForgeOS
 * Shared across frontend and serialized to backend
 */

// Project and Document
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  thumbnail?: string;
}

// Layer Hierarchy
export type LayerType =
  | 'group'
  | 'shape'
  | 'text'
  | 'image'
  | 'video'
  | 'component'
  | 'ai-generated';

export interface Layer {
  id: string;
  projectId: string;
  parentId?: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: string;
  zIndex: number;
  properties: Record<string, any>;
  children?: Layer[];
  createdAt: string;
  updatedAt: string;
}

// Transform and Geometry
export interface Transform {
  position: [number, number];
  rotation: number; // degrees
  scale: [number, number];
  skew?: [number, number];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeometryOperation {
  id: string;
  type: GeometryType;
  parameters: Record<string, any>;
  enabled: boolean;
  order: number;
}

export type GeometryType =
  | 'voronoi'
  | 'stripe'
  | 'polygon_slice'
  | 'hexagonal_grid'
  | 'triangulation'
  | 'glass_card'
  | 'wave'
  | 'ribbon'
  | 'mesh_gradient'
  | 'wireframe'
  | 'boolean_union'
  | 'boolean_subtract'
  | 'boolean_intersect'
  | 'clip_mask'
  | 'alpha_mask';

// Animation
export interface Keyframe {
  id: string;
  layerId: string;
  propertyName: string;
  time: number; // milliseconds
  value: any;
  easing: EasingType;
}

export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier'
  | 'spring'
  | 'elastic'
  | 'bounce';

export interface Animation {
  id: string;
  layerId: string;
  propertyName: string;
  keyframes: Keyframe[];
  duration: number;
  delay: number;
  loop: boolean;
  yoyo: boolean;
}

export interface Timeline {
  projectId: string;
  duration: number; // milliseconds
  fps: number;
  currentTime: number;
  playing: boolean;
  animations: Animation[];
}

// Particles
export interface ParticleEmitter {
  id: string;
  type: ParticleType;
  position: [number, number];
  rate: number; // particles per second
  lifetime: number; // milliseconds
  velocity: [number, number];
  acceleration: [number, number];
  properties: Record<string, any>;
}

export type ParticleType =
  | 'point'
  | 'sprite'
  | 'mesh'
  | 'text'
  | 'image'
  | 'trail'
  | 'attractor'
  | 'repulsor';

// History and Undo/Redo
export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  previousState: any;
  newState: any;
}

export interface History {
  entries: HistoryEntry[];
  currentIndex: number;
}

// Editor State
export interface EditorState {
  activeProjectId?: string;
  activeLayerId?: string;
  selectedLayerIds: string[];
  hoveredLayerId?: string;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  tool: EditorTool;
  mode: EditorMode;
}

export type EditorTool =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'pen'
  | 'text'
  | 'hand'
  | 'measure';

export type EditorMode =
  | 'edit'
  | 'preview'
  | 'export'
  | 'collaborate';

// Export
export interface ExportOptions {
  format: ExportFormat;
  quality: 'low' | 'medium' | 'high';
  scale: number;
  includeHidden: boolean;
  metadata: boolean;
}

export type ExportFormat =
  | 'png'
  | 'jpg'
  | 'webp'
  | 'svg'
  | 'pdf'
  | 'gif'
  | 'webm'
  | 'mp4'
  | 'apng'
  | 'lottie'
  | 'rive'
  | 'css'
  | 'html'
  | 'react'
  | 'gsap'
  | 'framer-motion';

// AI Capabilities
export interface AIPrompt {
  text: string;
  styleReferences?: string[];
  designType: DesignType;
  parameters?: Record<string, any>;
}

export type DesignType = 'logo' | 'poster' | 'ui' | 'animation' | '3d' | 'layout';

export interface AIGenerationResult {
  id: string;
  status: 'processing' | 'complete' | 'error';
  result?: any;
  error?: string;
  createdAt: string;
}
