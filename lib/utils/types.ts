// [Claude.A8] Asset Manager - Core Types
// Defines every asset shape, metadata contract, and UI state type used across
// the asset manager subsystem. Keep this file the single source of truth for
// asset-related types — components/hooks/api all import from here.

export type AssetType =
  | 'image'
  | 'video'
  | 'svg'
  | 'model3d'
  | 'pdf'
  | 'audio'
  | 'palette'
  | 'gradient'
  | 'pattern'
  | 'font'
  | 'brush'
  | 'particle_preset'
  | 'animation_clip'
  | 'plugin';

export type AssetSortField = 'date' | 'size' | 'name' | 'popularity';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetColorInfo {
  dominantColor: string; // hex
  palette: string[]; // hex[]
}

export interface ImageMetadata {
  dimensions: AssetDimensions;
  colorSpace?: string;
  dpi?: number;
  iccProfile?: string;
}

export interface VideoMetadata {
  dimensions: AssetDimensions;
  durationSeconds: number;
  frameRate: number;
  codec: string;
  bitrateKbps: number;
}

export interface Model3DMetadata {
  polygonCount: number;
  materialCount: number;
  animationCount: number;
}

export interface SvgMetadata {
  dimensions: AssetDimensions;
  viewBox: string;
  pathCount: number;
}

export interface FontMetadata {
  family: string;
  weights: number[];
  styles: string[];
}

export interface PaletteMetadata {
  colorCount: number;
  namedColors: Record<string, string>;
}

export interface GradientMetadata {
  gradientType: 'linear' | 'radial' | 'conic';
  stops: { offset: number; color: string }[];
}

export interface AudioMetadata {
  durationSeconds: number;
  bitrateKbps: number;
  channels: number;
}

export type AssetTypeMetadata =
  | ({ kind: 'image' } & ImageMetadata)
  | ({ kind: 'video' } & VideoMetadata)
  | ({ kind: 'model3d' } & Model3DMetadata)
  | ({ kind: 'svg' } & SvgMetadata)
  | ({ kind: 'font' } & FontMetadata)
  | ({ kind: 'palette' } & PaletteMetadata)
  | ({ kind: 'gradient' } & GradientMetadata)
  | ({ kind: 'audio' } & AudioMetadata)
  | { kind: 'generic' };

export interface AssetLicense {
  type: string; // e.g. 'CC0', 'CC-BY', 'proprietary'
  attribution?: string;
  usageRights?: string;
}

export interface AssetVersion {
  versionId: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  fileUrl: string;
}

export interface Asset {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  description?: string;
  type: AssetType;
  fileUrl: string;
  previewUrl: string;
  previewSizes: { size: 200 | 400 | 1200; url: string }[];
  sizeBytes: number;
  mimeType: string;
  tags: string[];
  autoTags: string[];
  collections: string[];
  colorInfo?: AssetColorInfo;
  typeMetadata: AssetTypeMetadata;
  license?: AssetLicense;
  creator?: string;
  usageCount: number;
  favorited: boolean;
  locked: boolean;
  versions: AssetVersion[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface AssetFolder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  createdAt: string;
}

export interface SmartCollection {
  id: string;
  name: string;
  rule: AssetFilter; // auto-populated via filter
}

export interface AssetFilter {
  types?: AssetType[];
  tags?: string[];
  folderId?: string | null;
  color?: string; // hex, for visual color search
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  dateFrom?: string;
  dateTo?: string;
  favoritedOnly?: boolean;
  query?: string;
}

export interface AssetSearchParams extends AssetFilter {
  sort?: AssetSortField;
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAssets {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UploadProgressItem {
  localId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  assetId?: string;
}

export interface AssetPermission {
  userId: string;
  role: 'view' | 'edit' | 'admin';
}

export interface AssetComment {
  id: string;
  assetId: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  assetId: string;
  userId: string;
  action: 'view' | 'edit' | 'delete' | 'download' | 'restore' | 'upload';
  timestamp: string;
}

export const ASSET_TYPE_EXTENSIONS: Record<AssetType, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'avif', 'webp', 'gif'],
  video: ['mp4', 'webm', 'mov', 'mkv'],
  svg: ['svg'],
  model3d: ['gltf', 'glb', 'obj', 'fbx', 'usd', 'usdz'],
  pdf: ['pdf'],
  audio: ['mp3', 'wav', 'ogg'],
  palette: ['json', 'json5'],
  gradient: ['json'],
  pattern: ['svg'],
  font: ['woff2', 'ttf', 'otf'],
  brush: ['json'],
  particle_preset: ['json'],
  animation_clip: ['json', 'lottie', 'rive'],
  plugin: ['zip'],
};

export function inferAssetTypeFromExtension(fileName: string): AssetType | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  for (const [type, exts] of Object.entries(ASSET_TYPE_EXTENSIONS)) {
    if (exts.includes(ext)) return type as AssetType;
  }
  return null;
}

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
export const MAX_ASSETS_PER_PROJECT = 100_000;
export const PREVIEW_GENERATION_TIMEOUT_MS = 10_000;
