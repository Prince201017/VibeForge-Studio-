// [Claude.A8] Asset Manager - CollectionView
// Renders the folder tree (nested collections) inside the sidebar, with
// create/rename/delete affordances and drag-to-move support.

'use client';

import React, { useMemo, useState } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { assetApi } from '../../lib/asset-manager/api';
import type { AssetFolder } from '../../lib/asset-manager/types';

interface FolderNode extends AssetFolder {
  children: FolderNode[];
}

function buildTree(folders: AssetFolder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: FolderNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function CollectionView() {
  const folders = useAssetManagerStore((s) => s.folders);
  const addFolder = useAssetManagerStore((s) => s.addFolder);
  const removeFolder = useAssetManagerStore((s) => s.removeFolder);
  const currentFolderId = useAssetManagerStore((s) => s.currentFolderId);
  const setCurrentFolder = useAssetManagerStore((s) => s.setCurrentFolder);
  const moveToFolder = useAssetManagerStore((s) => s.moveToFolder);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const tree = useMemo(() => buildTree(Object.values(folders)), [folders]);

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      setCreating(false);
      return;
    }
    // Project context is supplied by the parent AssetManager via props in
    // real usage; store here assumes a single active project.
    const folder = await assetApi.createFolder('current-project', newFolderName.trim(), currentFolderId);
    addFolder(folder);
    setNewFolderName('');
    setCreating(false);
  };

  const handleDelete = async (folderId: string) => {
    await assetApi.deleteFolder(folderId);
    removeFolder(folderId);
    if (currentFolderId === folderId) setCurrentFolder(null);
  };

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--am-muted)]">Folders</h3>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="Create folder"
          className="text-xs text-[var(--am-accent)]"
        >
          + New
        </button>
      </div>

      {creating && (
        <input
          autoFocus
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onBlur={handleCreate}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Folder name"
          className="mb-1 w-full rounded border border-[var(--am-border)] bg-transparent px-2 py-0.5 text-xs"
        />
      )}

      <div className="flex flex-col gap-0.5">
        {tree.map((node) => (
          <FolderRow
            key={node.id}
            node={node}
            depth={0}
            activeId={currentFolderId}
            onSelect={setCurrentFolder}
            onDelete={handleDelete}
            onDropAsset={(assetId, folderId) => moveToFolder([assetId], folderId)}
          />
        ))}
      </div>
    </div>
  );
}

function FolderRow({
  node,
  depth,
  activeId,
  onSelect,
  onDelete,
  onDropAsset,
}: {
  node: FolderNode;
  depth: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDropAsset: (assetId: string, folderId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const assetId = e.dataTransfer.getData('application/x-asset-id');
          if (assetId) onDropAsset(assetId, node.id);
        }}
        style={{ paddingLeft: depth * 12 }}
        className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm ${
          activeId === node.id ? 'bg-[var(--am-accent)]/10 text-[var(--am-accent)]' : ''
        } ${isDragOver ? 'bg-[var(--am-accent)]/20' : ''}`}
      >
        {node.children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
            className="text-[var(--am-muted)]"
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
        <button type="button" onClick={() => onSelect(node.id)} className="flex-1 truncate text-left">
          📁 {node.name}
        </button>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          aria-label={`Delete ${node.name}`}
          className="hidden text-xs text-[var(--am-muted)] group-hover:block"
        >
          ×
        </button>
      </div>
      {expanded &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
            onDropAsset={onDropAsset}
          />
        ))}
    </div>
  );
}
