import { useCallback, useEffect, useRef, useState } from "react";
import type { ExportJob, ExportRequestPayload, HistoryEntry, JobStatus, StartExportResponse } from "./types";

/**
 * [V0.A7] useExport / useExportProgress
 * Talks to the 6 endpoints under /api/export/* (see backend/routes/export.py).
 * Base URL is overridable via NEXT_PUBLIC_EXPORT_API_BASE for local dev
 * against a backend running on a different port than the main app.
 */
const API_BASE = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_EXPORT_API_BASE) || "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Export API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

const TERMINAL: JobStatus[] = ["complete", "failed", "cancelled"];

export function useExportProgress(jobId: string | null, pollMs = 800) {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await apiFetch<ExportJob>(`/api/export/progress/${jobId}`);
        if (cancelled) return;
        setJob(data);
        if (TERMINAL.includes(data.status) && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    };

    poll();
    timer.current = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [jobId, pollMs]);

  return { job, error };
}

export function useExport() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [estimatedSec, setEstimatedSec] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { job, error: progressError } = useExportProgress(jobId);

  const start = useCallback(async (payload: ExportRequestPayload) => {
    setStarting(true);
    setStartError(null);
    setJobId(null);
    try {
      const res = await apiFetch<StartExportResponse>("/api/export/start", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setJobId(res.job_id);
      setEstimatedSec(res.estimated_time_sec);
      return res.job_id;
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setStarting(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    await apiFetch(`/api/export/cancel/${jobId}`, { method: "POST" });
  }, [jobId]);

  const downloadUrl = jobId ? `${API_BASE}/api/export/download/${jobId}` : null;

  return {
    start,
    cancel,
    jobId,
    job,
    estimatedSec,
    starting,
    error: startError || progressError,
    downloadUrl,
    isDone: job ? TERMINAL.includes(job.status) : false,
  };
}

export function useExportHistory(limit = 50) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<HistoryEntry[]>(`/api/export/history?limit=${limit}`);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loading, error, refresh };
}
