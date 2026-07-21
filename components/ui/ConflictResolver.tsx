// [CollabAgent] ConflictResolver.tsx — merge dialog showing both sides of
// a conflicting change with keep-mine / take-theirs / manual-merge options.
import { useState } from "react";
import type { ConflictInfo } from "../../lib/collaboration/types";

interface ConflictResolverProps {
  conflict: ConflictInfo;
  onResolve: (resolution: "keep_mine" | "take_theirs" | "manual_merge", mergedValue?: unknown) => void;
  onCancel: () => void;
}

export function ConflictResolver({ conflict, onResolve, onCancel }: ConflictResolverProps) {
  const [mergedValue, setMergedValue] = useState(
    JSON.stringify(conflict.winningOp.value ?? "", null, 2)
  );
  const [showManualMerge, setShowManualMerge] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div style={{ background: "white", borderRadius: 10, padding: 20, width: 480 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Conflicting change</h3>
        <p style={{ fontSize: 13, color: "#6B7280" }}>
          Path: <code>{conflict.path}</code>
        </p>

        <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
          <div style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Your change</div>
            <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(conflict.losingOp.value, null, 2)}</pre>
          </div>
          <div style={{ flex: 1, border: "1px solid #E5E7EB", borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Their change</div>
            <pre style={{ fontSize: 12, margin: 0 }}>{JSON.stringify(conflict.winningOp.value, null, 2)}</pre>
          </div>
        </div>

        {showManualMerge && (
          <textarea
            value={mergedValue}
            onChange={(e) => setMergedValue(e.target.value)}
            style={{ width: "100%", height: 80, fontSize: 12, fontFamily: "monospace" }}
          />
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={() => onResolve("keep_mine")}>Keep mine</button>
          <button onClick={() => onResolve("take_theirs")}>Take theirs</button>
          {!showManualMerge ? (
            <button onClick={() => setShowManualMerge(true)}>Manual merge</button>
          ) : (
            <button
              onClick={() => {
                try {
                  onResolve("manual_merge", JSON.parse(mergedValue));
                } catch {
                  onResolve("manual_merge", mergedValue);
                }
              }}
            >
              Apply merge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
