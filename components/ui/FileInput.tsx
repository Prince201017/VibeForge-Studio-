/**
 * [ForgeOS UI] FileInput
 * Drag-and-drop + click-to-browse file picker with image preview
 * thumbnails and per-file remove. Object URLs are revoked on unmount
 * to avoid leaking memory.
 */
import React, { useEffect, useRef, useState } from "react";
import { cn } from "../utils/classNames";

export interface FileInputProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  label?: string;
  className?: string;
}

interface StagedFile {
  file: File;
  previewUrl?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  onFilesSelected,
  accept,
  multiple = false,
  maxSizeMb,
  label = "Drag files here or click to browse",
  className,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => staged.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    const oversized = maxSizeMb && files.some((f) => f.size > maxSizeMb * 1024 * 1024);
    if (oversized) {
      setError(`Files must be under ${maxSizeMb}MB`);
      return;
    }
    setError(null);
    const next = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setStaged(multiple ? [...staged, ...next] : next);
    onFilesSelected(files);
  };

  const removeFile = (index: number) => {
    const removed = staged[index];
    if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    const next = staged.filter((_, i) => i !== index);
    setStaged(next);
    onFilesSelected(next.map((s) => s.file));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
          dragOver ? "border-indigo-500 bg-indigo-500/5" : "border-neutral-700 hover:border-neutral-600"
        )}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
          <path d="M12 4v10M8 10l4-4 4 4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm text-neutral-300">{label}</p>
        {accept && <p className="text-xs text-neutral-500">Accepted: {accept}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </div>
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
      {staged.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {staged.map((s, i) => (
            <li key={i} className="relative flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300">
              {s.previewUrl ? (
                <img src={s.previewUrl} alt="" className="h-6 w-6 rounded object-cover" />
              ) : (
                <span className="h-6 w-6 rounded bg-neutral-800 flex items-center justify-center text-[9px]">FILE</span>
              )}
              <span className="max-w-[140px] truncate">{s.file.name}</span>
              <button type="button" aria-label={`Remove ${s.file.name}`} onClick={() => removeFile(i)} className="text-neutral-500 hover:text-rose-400">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

FileInput.displayName = "FileInput";
