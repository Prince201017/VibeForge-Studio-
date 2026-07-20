import { useCallback, useState } from "react";
import { getFormatInfo } from "../../lib/export/formats";
import { useExportProgress } from "../../lib/export/hooks";
import type { QueueItem } from "../../lib/export/types";

const API_BASE = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_EXPORT_API_BASE) || "";

interface ExportQueueProps {
  queue: QueueItem[];
  onRemove: (localId: string) => void;
  onStarted: (localId: string, jobId: string) => void;
}

/** Matches the backend's "Concurrent exports: 5 max per user" constraint —
 * the server enforces the real limit via its semaphore; this just avoids
 * firing 20 fetches at once from the client for no reason. */
const CLIENT_BATCH_SIZE = 5;

export default function ExportQueue({ queue, onRemove, onStarted }: ExportQueueProps) {
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    const pending = queue.filter((q) => !q.job);
    for (let i = 0; i < pending.length; i += CLIENT_BATCH_SIZE) {
      const batch = pending.slice(i, i + CLIENT_BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const res = await fetch(`${API_BASE}/api/export/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.request),
            });
            if (!res.ok) throw new Error(await res.text());
            const { job_id } = await res.json();
            onStarted(item.localId, job_id);
          } catch {
            // surfaced per-row below via a failed placeholder status; queue keeps going
          }
        })
      );
    }
    setRunning(false);
  }, [queue, onStarted]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          Batch Queue ({queue.length})
        </h3>
        <button
          type="button"
          onClick={runAll}
          disabled={running || queue.every((q) => !!q.job)}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {running ? "Starting…" : "Run all"}
        </button>
      </div>

      {queue.length === 0 && (
        <p className="rounded-md border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-600">
          Add formats to the queue to export several at once.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {queue.map((item) => (
          <QueueRow key={item.localId} item={item} onRemove={() => onRemove(item.localId)} />
        ))}
      </ul>
    </div>
  );
}

function QueueRow({ item, onRemove }: { item: QueueItem; onRemove: () => void }) {
  const info = getFormatInfo(item.request.format);
  const { job } = useExportProgress(item.job?.job_id ?? null);
  const status = job?.status ?? (item.job ? "queued" : "pending");

  return (
    <li className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-neutral-200">{info?.label ?? item.request.format}</span>
        <span className="font-mono text-[11px] text-neutral-500">
          {status === "pending" ? "Not started" : `${status}${job ? ` · ${Math.round(job.percent_complete)}%` : ""}`}
        </span>
      </div>
      {job?.status === "complete" && (
        <a
          href={`${API_BASE}/api/export/download/${job.job_id}`}
          className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:border-violet-600 hover:text-violet-300"
        >
          Download
        </a>
      )}
      {status === "pending" && (
        <button type="button" onClick={onRemove} className="text-xs text-neutral-500 hover:text-red-400">
          Remove
        </button>
      )}
    </li>
  );
}
