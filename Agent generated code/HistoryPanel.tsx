import { getFormatInfo } from "../../lib/export/formats";
import { useExportHistory } from "../../lib/export/hooks";
import { formatBytes } from "../../lib/export/utils";

const STATUS_DOT: Record<string, string> = {
  complete: "bg-emerald-500",
  failed: "bg-red-500",
  cancelled: "bg-neutral-600",
  running: "bg-violet-500 animate-pulse",
  queued: "bg-neutral-500",
};

interface HistoryPanelProps {
  onReplay?: (jobId: string) => void;
}

export default function HistoryPanel({ onReplay }: HistoryPanelProps) {
  const { history, loading, error, refresh } = useExportHistory(50);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Export History</h3>
        <button type="button" onClick={refresh} className="text-xs text-neutral-500 hover:text-neutral-300">
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-600">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && history.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-600">
          Nothing exported yet. Your finished exports will show up here.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-neutral-800 overflow-hidden rounded-md border border-neutral-800">
        {history.map((entry) => {
          const info = getFormatInfo(entry.format);
          return (
            <li key={entry.job_id} className="flex items-center gap-3 bg-neutral-950 px-3 py-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[entry.status] ?? "bg-neutral-600"}`} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-neutral-200">{info?.label ?? entry.format}</span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {new Date(entry.created_at).toLocaleString()} · {formatBytes(entry.file_size_bytes)}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                {entry.status === "complete" && (
                  <a
                    href={entry.output_url ?? `/api/export/download/${entry.job_id}`}
                    className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:border-violet-600 hover:text-violet-300"
                  >
                    Download
                  </a>
                )}
                {onReplay && (
                  <button
                    type="button"
                    onClick={() => onReplay(entry.job_id)}
                    className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-600"
                  >
                    Replay
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
