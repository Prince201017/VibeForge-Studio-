import type { ExportJob } from "../../lib/export/types";
import { formatDuration } from "../../lib/export/utils";

interface ProgressIndicatorProps {
  job: ExportJob | null;
  estimatedSec: number | null;
  onCancel: () => void;
}

const STATUS_COPY: Record<string, string> = {
  queued: "Queued",
  running: "Rendering",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function ProgressIndicator({ job, estimatedSec, onCancel }: ProgressIndicatorProps) {
  if (!job) {
    return <p className="text-sm text-neutral-500">Waiting to start…</p>;
  }

  const pct = Math.round(job.percent_complete);
  const isActive = job.status === "queued" || job.status === "running";
  const barColor =
    job.status === "failed" ? "bg-red-500" : job.status === "cancelled" ? "bg-neutral-600" : "bg-violet-500";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-200">{STATUS_COPY[job.status] ?? job.status}</span>
        <span className="font-mono text-neutral-400">{pct}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-xs text-neutral-500">
        <span>
          {job.total_frames > 0 ? `frame ${job.current_frame} / ${job.total_frames}` : "—"}
        </span>
        <span>
          {isActive
            ? `${formatDuration(job.time_remaining_sec ?? estimatedSec)} remaining`
            : job.status === "complete"
              ? "Done"
              : ""}
        </span>
      </div>

      {job.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {job.error}
        </p>
      )}

      {isActive && (
        <button
          type="button"
          onClick={onCancel}
          className="self-start rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-red-700 hover:text-red-300"
        >
          Cancel export
        </button>
      )}
    </div>
  );
}
