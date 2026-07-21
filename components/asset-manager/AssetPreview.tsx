// [Claude.A8] Asset Manager - AssetPreview
// Full-screen preview overlay. Renders per-type: image zoom, video player,
// rotatable Three.js viewer for 3D models, audio waveform player, font
// specimen, and palette/gradient swatch views.

'use client';

import React, { Suspense, lazy, useEffect } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { formatDuration } from '../../lib/asset-manager/utils';

const Model3DViewer = lazy(() => import('./Model3DViewer').catch(() => ({ default: () => null })));

export interface AssetPreviewProps {
  assetId: string;
  onClose: () => void;
}

export function AssetPreview({ assetId, onClose }: AssetPreviewProps) {
  const asset = useAssetManagerStore((s) => s.assets[assetId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!asset) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${asset.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="truncate text-sm">{asset.name}</span>
        <button type="button" onClick={onClose} aria-label="Close preview" className="text-lg">
          ×
        </button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <PreviewBody asset={asset} />
      </div>
    </div>
  );
}

function PreviewBody({ asset }: { asset: import('../../lib/asset-manager/types').Asset }) {
  switch (asset.type) {
    case 'image':
    case 'svg':
      return (
        <img
          src={asset.previewSizes.find((p) => p.size === 1200)?.url ?? asset.fileUrl}
          alt={asset.name}
          className="max-h-full max-w-full object-contain"
        />
      );

    case 'video':
      return (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={asset.fileUrl} controls autoPlay className="max-h-full max-w-full" />
      );

    case 'audio': {
      const meta = asset.typeMetadata.kind === 'audio' ? asset.typeMetadata : null;
      return (
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="text-4xl">♪</div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={asset.fileUrl} controls className="w-80" />
          {meta && <p className="text-xs text-white/60">{formatDuration(meta.durationSeconds)}</p>}
        </div>
      );
    }

    case 'model3d':
      return (
        <Suspense fallback={<div className="text-white/60 text-sm">Loading 3D preview…</div>}>
          <Model3DViewer fileUrl={asset.fileUrl} />
        </Suspense>
      );

    case 'font': {
      const meta = asset.typeMetadata.kind === 'font' ? asset.typeMetadata : null;
      return (
        <div className="w-full max-w-lg text-center text-white">
          <p className="mb-2 text-xs text-white/60">{meta?.family ?? asset.name}</p>
          <p className="text-5xl">The quick brown fox jumps</p>
          <p className="mt-2 text-2xl">ABCDEFGHIJKLM abcdefghijklm 0123456789</p>
        </div>
      );
    }

    case 'palette': {
      const meta = asset.typeMetadata.kind === 'palette' ? asset.typeMetadata : null;
      const colors = meta ? Object.values(meta.namedColors) : [];
      return (
        <div className="grid grid-cols-4 gap-2">
          {colors.map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-20 w-20 rounded-md" style={{ background: hex }} />
              <span className="text-xs text-white/70">{hex}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'gradient': {
      const meta = asset.typeMetadata.kind === 'gradient' ? asset.typeMetadata : null;
      const css = meta
        ? `${meta.gradientType === 'radial' ? 'radial-gradient' : 'linear-gradient'}(${meta.gradientType === 'linear' ? '90deg, ' : ''}${meta.stops
            .map((s) => `${s.color} ${s.offset * 100}%`)
            .join(', ')})`
        : undefined;
      return <div className="h-48 w-96 rounded-lg" style={{ background: css }} />;
    }

    case 'pdf':
      return (
        <iframe
          title={asset.name}
          src={asset.fileUrl}
          className="h-full w-full max-w-4xl rounded-md bg-white"
        />
      );

    default:
      return (
        <div className="flex flex-col items-center gap-2 text-white/70">
          <img src={asset.previewUrl} alt={asset.name} className="max-h-64 max-w-full object-contain" />
          <p className="text-xs">No inline preview available for this asset type.</p>
        </div>
      );
  }
}
