// [Claude.A8] Asset Manager - Utilities
// Pure helper functions: format validation, display formatting, sorting,
// and lightweight client-side preview helpers. No side effects, no fetches.

import type { Asset, AssetSortField, AssetType, SortDirection } from './types';
import { ASSET_TYPE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${formatBytes(MAX_FILE_SIZE_BYTES)} limit` };
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allExtensions = Object.values(ASSET_TYPE_EXTENSIONS).flat();
  if (!ext || !allExtensions.includes(ext)) {
    return { valid: false, error: `Unsupported file type: .${ext ?? 'unknown'}` };
  }
  return { valid: true };
}

export function sortAssets(assets: Asset[], field: AssetSortField, direction: SortDirection): Asset[] {
  const sorted = [...assets].sort((a, b) => {
    switch (field) {
      case 'date':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'size':
        return a.sizeBytes - b.sizeBytes;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'popularity':
        return a.usageCount - b.usageCount;
      default:
        return 0;
    }
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
}

export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // simple subsequence fuzzy match fallback
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function filterAssetsClientSide(assets: Asset[], query: string): Asset[] {
  if (!query.trim()) return assets;
  return assets.filter(
    (a) =>
      fuzzyMatch(query, a.name) ||
      a.tags.some((tag) => fuzzyMatch(query, tag)) ||
      a.autoTags.some((tag) => fuzzyMatch(query, tag)) ||
      (a.description ? fuzzyMatch(query, a.description) : false)
  );
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  image: 'Image',
  video: 'Video',
  svg: 'Vector (SVG)',
  model3d: '3D Model',
  pdf: 'PDF',
  audio: 'Audio',
  palette: 'Color Palette',
  gradient: 'Gradient',
  pattern: 'Pattern',
  font: 'Font',
  brush: 'Brush',
  particle_preset: 'Particle Preset',
  animation_clip: 'Animation Clip',
  plugin: 'Plugin',
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  image: 'image',
  video: 'video',
  svg: 'shapes',
  model3d: 'box',
  pdf: 'file-text',
  audio: 'music',
  palette: 'palette',
  gradient: 'blend',
  pattern: 'grid',
  font: 'type',
  brush: 'brush',
  particle_preset: 'sparkles',
  animation_clip: 'film',
  plugin: 'puzzle',
};

/** Hex distance used for the "filter by color" visual search feature. */
export function colorDistance(hexA: string, hexB: string): number {
  const toRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = toRgb(hexA);
  const [r2, g2, b2] = toRgb(hexB);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function matchesColor(asset: Asset, hex: string, tolerance = 60): boolean {
  if (!asset.colorInfo) return false;
  return (
    colorDistance(asset.colorInfo.dominantColor, hex) <= tolerance ||
    asset.colorInfo.palette.some((c) => colorDistance(c, hex) <= tolerance)
  );
}
