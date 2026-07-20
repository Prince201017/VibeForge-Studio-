// [Claude.A8] Asset Manager - DetailPanel
// Right-hand panel showing full metadata, tags, version history, and
// license/attribution info for the active asset, with inline editing.

'use client';

import React, { useState } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { useActiveAsset } from '../../lib/asset-manager/hooks';
import { assetApi } from '../../lib/asset-manager/api';
import { formatBytes, formatRelativeDate, ASSET_TYPE_LABELS } from '../../lib/asset-manager/utils';

export function DetailPanel() {
  const { asset, setActiveAsset } = useActiveAsset();
  const upsertAsset = useAssetManagerStore((s) => s.upsertAsset);
  const removeAsset = useAssetManagerStore((s) => s.removeAsset);
  const addTag = useAssetManagerStore((s) => s.addTag);
  const removeTag = useAssetManagerStore((s) => s.removeTag);
  const [newTag, setNewTag] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  if (!asset) return null;

  const persistName = async () => {
    const updated = await assetApi.update(asset.id, { name: nameDraft });
    upsertAsset(updated);
    setEditingName(false);
  };

  const persistDescription = async () => {
    const updated = await assetApi.update(asset.id, { description: descDraft });
    upsertAsset(updated);
    setEditingDescription(false);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    addTag(asset.id, newTag.trim());
    const updated = await assetApi.update(asset.id, { tags: [...asset.tags, newTag.trim()] });
    upsertAsset(updated);
    setNewTag('');
  };

  const handleRemoveTag = async (tag: string) => {
    removeTag(asset.id, tag);
    await assetApi.update(asset.id, { tags: asset.tags.filter((t) => t !== tag) });
  };

  const handleDelete = async () => {
    if (asset.locked) return;
    if (!window.confirm(`Delete "${asset.name}"? This can't be undone.`)) return;
    await assetApi.remove(asset.id);
    removeAsset(asset.id);
  };

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-[var(--am-border)] p-4" aria-label="Asset details">
      <div className="mb-3 flex items-start justify-between">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={persistName}
            onKeyDown={(e) => e.key === 'Enter' && persistName()}
            className="flex-1 rounded border border-[var(--am-border)] bg-transparent px-1 text-sm font-semibold"
          />
        ) : (
          <h2
            onClick={() => {
              setNameDraft(asset.name);
              setEditingName(true);
            }}
            className="flex-1 cursor-text truncate text-sm font-semibold"
            title="Click to rename"
          >
            {asset.name}
          </h2>
        )}
        <button type="button" onClick={() => setActiveAsset(null)} aria-label="Close details" className="ml-2 text-[var(--am-muted)]">
          ×
        </button>
      </div>

      <img
        src={asset.previewSizes.find((p) => p.size === 400)?.url ?? asset.previewUrl}
        alt={asset.name}
        className="mb-3 w-full rounded-md bg-[var(--am-surface)]"
      />

      <dl className="mb-4 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <dt className="text-[var(--am-muted)]">Type</dt>
        <dd>{ASSET_TYPE_LABELS[asset.type]}</dd>
        <dt className="text-[var(--am-muted)]">Size</dt>
        <dd>{formatBytes(asset.sizeBytes)}</dd>
        <dt className="text-[var(--am-muted)]">Modified</dt>
        <dd>{formatRelativeDate(asset.updatedAt)}</dd>
        <dt className="text-[var(--am-muted)]">Used</dt>
        <dd>{asset.usageCount}×</dd>
        {asset.creator && (
          <>
            <dt className="text-[var(--am-muted)]">Creator</dt>
            <dd className="truncate">{asset.creator}</dd>
          </>
        )}
        {asset.license && (
          <>
            <dt className="text-[var(--am-muted)]">License</dt>
            <dd>{asset.license.type}</dd>
          </>
        )}
      </dl>

      <div className="mb-4">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">Description</h3>
        {editingDescription ? (
          <textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={persistDescription}
            rows={3}
            className="w-full rounded border border-[var(--am-border)] bg-transparent p-1.5 text-xs"
          />
        ) : (
          <p
            onClick={() => {
              setDescDraft(asset.description ?? '');
              setEditingDescription(true);
            }}
            className="cursor-text text-xs text-[var(--am-muted)]"
          >
            {asset.description || 'Add a description…'}
          </p>
        )}
      </div>

      <div className="mb-4">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">Tags</h3>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {asset.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full border border-[var(--am-border)] px-2 py-0.5 text-xs">
              {tag}
              <button type="button" onClick={() => handleRemoveTag(tag)} aria-label={`Remove tag ${tag}`}>
                ×
              </button>
            </span>
          ))}
          {asset.autoTags
            .filter((t) => !asset.tags.includes(t))
            .map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--am-surface-hover)] px-2 py-0.5 text-xs text-[var(--am-muted)]" title="AI-suggested tag">
                ✨ {tag}
              </span>
            ))}
        </div>
        <div className="flex gap-1">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add tag…"
            className="flex-1 rounded border border-[var(--am-border)] bg-transparent px-2 py-1 text-xs"
          />
          <button type="button" onClick={handleAddTag} className="rounded border border-[var(--am-border)] px-2 text-xs">
            Add
          </button>
        </div>
      </div>

      {asset.versions.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">Version History</h3>
          <ul className="flex flex-col gap-1 text-xs">
            {asset.versions.map((v) => (
              <li key={v.versionId} className="flex justify-between text-[var(--am-muted)]">
                <span>{v.note || 'Update'}</span>
                <span>{formatRelativeDate(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <a
          href={asset.fileUrl}
          download
          className="flex-1 rounded-md border border-[var(--am-border)] px-3 py-1.5 text-center text-xs"
        >
          Download
        </a>
        <button
          type="button"
          onClick={handleDelete}
          disabled={asset.locked}
          className="flex-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-500 disabled:opacity-40"
          title={asset.locked ? 'Asset is locked' : undefined}
        >
          {asset.locked ? 'Locked' : 'Delete'}
        </button>
      </div>
    </aside>
  );
}
