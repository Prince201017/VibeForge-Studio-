import { useMemo, useState } from "react";
import type { ExportFormat, ExportPreset, ExportRequestPayload, QueueItem } from "../../lib/export/types";
import { useExport } from "../../lib/export/hooks";
import { defaultRequest, validateRequest } from "../../lib/export/utils";
import FormatSelector from "./FormatSelector";
import QualitySettings from "./QualitySettings";
import ProgressIndicator from "./ProgressIndicator";
import ExportPreview from "./ExportPreview";
import HistoryPanel from "./HistoryPanel";
import PresetExports from "./PresetExports";
import ExportQueue from "./ExportQueue";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pulled straight from the Zustand store's active project — see
   * STATE_CONTRACT.md (not included in this handoff) for the real shape.
   * `project` is passed through untouched as ExportRequestPayload.project;
   * this dialog never re-derives it. */
  project: {
    project_id: string;
    name: string;
    width: number;
    height: number;
    duration_ms: number;
    fps: number;
    [key: string]: unknown;
  };
  thumbnailUrl?: string;
}

type Tab = "format" | "settings" | "presets" | "queue" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "format", label: "Format" },
  { id: "settings", label: "Settings" },
  { id: "presets", label: "Presets" },
  { id: "queue", label: "Batch" },
  { id: "history", label: "History" },
];

export default function ExportDialog({ open, onClose, project, thumbnailUrl }: ExportDialogProps) {
  const [tab, setTab] = useState<Tab>("format");
  const [request, setRequest] = useState<ExportRequestPayload>(() => defaultRequest("mp4", project));
  const [customPresets, setCustomPresets] = useState<ExportPreset[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const { start, cancel, job, estimatedSec, starting, error, downloadUrl, isDone } = useExport();

  const errors = useMemo(() => validateRequest(request), [request]);

  if (!open) return null;

  const patch = (p: Partial<ExportRequestPayload>) => setRequest((r) => ({ ...r, ...p }));
  const setFormat = (format: ExportFormat) => setRequest((r) => ({ ...defaultRequest(format, project), resolution: r.resolution }));

  const applyPreset = (preset: ExportPreset) => {
    setRequest((r) => ({
      ...defaultRequest(preset.format, project),
      resolution: preset.resolution ?? r.resolution,
      fps: preset.fps,
      video: { ...defaultRequest(preset.format, project).video, ...preset.video },
      render: { ...defaultRequest(preset.format, project).render, ...preset.render },
    }));
    setTab("settings");
  };

  const saveCurrentPreset = (name: string) => {
    setCustomPresets((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`, name, format: request.format, resolution: request.resolution,
        fps: request.fps, video: request.video, render: request.render,
      },
    ]);
  };

  const addToQueue = () => {
    setQueue((q) => [...q, { localId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, format: request.format, request }]);
    setTab("queue");
  };

  const handleExport = async () => {
    if (errors.length) return;
    await start({ ...request, project });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Export">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Export “{project.name}”</h2>
            <p className="font-mono text-xs text-neutral-500">{project.width}×{project.height} · {(project.duration_ms / 1000).toFixed(1)}s · {project.fps}fps</p>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close export dialog"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
          >
            ✕
          </button>
        </header>

        <nav className="flex gap-1 border-b border-neutral-800 px-5 pt-3">
          {TABS.map((t) => (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? "border-b-2 border-violet-500 text-violet-300" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t.label}{t.id === "queue" && queue.length > 0 ? ` (${queue.length})` : ""}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "format" && <FormatSelector value={request.format} onChange={setFormat} />}
          {tab === "settings" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <QualitySettings
                request={request} onChange={patch}
                projectWidth={project.width} projectHeight={project.height} projectFps={project.fps}
              />
              <ExportPreview
                request={request} projectDurationMs={project.duration_ms} projectFps={project.fps}
                thumbnailUrl={thumbnailUrl}
              />
            </div>
          )}
          {tab === "presets" && (
            <PresetExports request={request} onApply={applyPreset} onSaveCurrent={saveCurrentPreset} customPresets={customPresets} />
          )}
          {tab === "queue" && (
            <ExportQueue
              queue={queue}
              onRemove={(id) => setQueue((q) => q.filter((item) => item.localId !== id))}
              onStarted={(id, jobId) => setQueue((q) => q.map((item) => (item.localId === id ? { ...item, job: { job_id: jobId, status: "queued", percent_complete: 0, current_frame: 0, total_frames: 0, time_remaining_sec: null } } : item)))}
            />
          )}
          {tab === "history" && <HistoryPanel />}
        </div>

        <footer className="flex flex-col gap-3 border-t border-neutral-800 px-5 py-4">
          {errors.length > 0 && (
            <ul className="text-xs text-amber-400">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {job ? (
            <ProgressIndicator job={job} estimatedSec={estimatedSec} onCancel={cancel} />
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button" onClick={addToQueue}
                className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-600"
              >
                Add to batch queue
              </button>
              <button
                type="button" onClick={handleExport} disabled={starting || errors.length > 0}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
              >
                {starting ? "Starting…" : "Export"}
              </button>
            </div>
          )}

          {isDone && job?.status === "complete" && downloadUrl && (
            <a
              href={downloadUrl}
              className="rounded-md bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
            >
              Download export
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}
