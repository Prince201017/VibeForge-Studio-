// [Claude.A8] Asset Manager - UploadArea
// Modal overlay supporting drag-and-drop, file-picker, and URL import, with
// per-file progress bars backed by the upload queue in the store.

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useUpload } from '../../lib/asset-manager/hooks';
import { assetApi } from '../../lib/asset-manager/api';
import { validateFile } from '../../lib/asset-manager/utils';

export interface UploadAreaProps {
  projectId: string;
  folderId?: string | null;
  onClose: () => void;
}

export function UploadArea({ folderId = null, onClose }: UploadAreaProps) {
  const { uploadFiles, uploadQueue, clearCompletedUploads } = useUpload();
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        const { valid } = validateFile(file);
        if (valid) validFiles.push(file);
      }
      if (validFiles.length) uploadFiles(validFiles, { folderId });
    },
    [uploadFiles, folderId]
  );

  const handleUrlImport = async () => {
    if (!urlValue.trim()) return;
    setUrlImporting(true);
    setUrlError(null);
    try {
      await assetApi.importFromUrl(urlValue.trim(), { folderId });
      setUrlValue('');
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUrlImporting(false);
    }
  };

  const allDone = uploadQueue.length > 0 && uploadQueue.every((i) => i.status === 'complete' || i.status === 'error');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload assets"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-[var(--am-surface)] p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Upload Assets</h2>
          <button type="button" onClick={onClose} aria-label="Close upload dialog" className="text-[var(--am-muted)]">
            ×
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-8 text-center ${
            isDragOver ? 'border-[var(--am-accent)] bg-[var(--am-accent)]/5' : 'border-[var(--am-border)]'
          }`}
        >
          <p className="text-sm">Drop files here or click to browse</p>
          <p className="text-xs text-[var(--am-muted)]">Up to 2GB per file · images, video, 3D, fonts, and more</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="mb-3 flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Import from URL…"
            className="flex-1 rounded border border-[var(--am-border)] bg-transparent px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={handleUrlImport}
            disabled={urlImporting || !urlValue.trim()}
            className="rounded border border-[var(--am-border)] px-3 text-xs disabled:opacity-50"
          >
            {urlImporting ? 'Importing…' : 'Import'}
          </button>
        </div>
        {urlError && <p className="mb-2 text-xs text-red-500">{urlError}</p>}

        {uploadQueue.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <ul className="flex flex-col gap-1.5">
              {uploadQueue.map((item) => (
                <li key={item.localId} className="text-xs">
                  <div className="mb-0.5 flex justify-between">
                    <span className="truncate">{item.fileName}</span>
                    <span className="text-[var(--am-muted)]">
                      {item.status === 'error' ? item.error : `${item.status} ${item.progress}%`}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--am-surface-hover)]">
                    <div
                      className={`h-1 rounded-full ${item.status === 'error' ? 'bg-red-500' : 'bg-[var(--am-accent)]'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allDone && (
          <button
            type="button"
            onClick={clearCompletedUploads}
            className="mt-3 self-end text-xs text-[var(--am-accent)]"
          >
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
