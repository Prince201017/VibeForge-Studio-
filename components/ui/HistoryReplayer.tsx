// [CollabAgent] HistoryReplayer.tsx — scrub through operation history and
// watch changes replay, with play/pause and speed control.
import { useEffect, useRef, useState } from "react";
import type { Operation } from "../../lib/collaboration/types";

interface HistoryReplayerProps {
  operations: Operation[];
  onSeek: (index: number, opsUpToIndex: Operation[]) => void;
}

export function HistoryReplayer({ operations, onSeek }: HistoryReplayerProps) {
  const [index, setIndex] = useState(operations.length);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onSeek(index, operations.slice(0, index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setIndex((i) => {
          if (i >= operations.length) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 300 / speed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, operations.length]);

  const current = operations[index - 1];

  return (
    <div style={{ padding: 12, border: "1px solid #E5E7EB", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        <input
          type="range"
          min={0}
          max={operations.length}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
        {index}/{operations.length} operations
        {current && (
          <>
            {" "}
            — <strong>{current.type}</strong> on <code>{current.path}</code> by {current.userId.slice(0, 8)}
          </>
        )}
      </div>
    </div>
  );
}
