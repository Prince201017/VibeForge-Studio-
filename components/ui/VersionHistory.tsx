// [CollabAgent] VersionHistory.tsx — version list with restore, diff view
// launcher, and branch-from-version action.
import type { Version } from "../../lib/collaboration/types";

interface VersionHistoryProps {
  versions: Version[];
  onRestore: (versionId: string) => void;
  onCompare: (fromId: string, toId: string) => void;
  onBranch: (versionId: string) => void;
  selectedForCompare: string[];
  onToggleCompareSelection: (versionId: string) => void;
}

export function VersionHistory({
  versions,
  onRestore,
  onCompare,
  onBranch,
  selectedForCompare,
  onToggleCompareSelection,
}: VersionHistoryProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>
          Version History
        </span>
        {selectedForCompare.length === 2 && (
          <button
            onClick={() => onCompare(selectedForCompare[0], selectedForCompare[1])}
            style={{ fontSize: 12, cursor: "pointer" }}
          >
            Compare selected
          </button>
        )}
      </div>

      {versions.map((v) => (
        <div
          key={v.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            border: "1px solid #E5E7EB",
            borderRadius: 6,
            background: selectedForCompare.includes(v.id) ? "#EEF2FF" : "white",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedForCompare.includes(v.id)}
              onChange={() => onToggleCompareSelection(v.id)}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {v.name || (v.isAutoSave ? "Auto-save" : "Untitled version")}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                {new Date(v.timestamp * 1000).toLocaleString()} · {v.operationCount} ops
              </div>
            </div>
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onBranch(v.id)} style={{ fontSize: 12, cursor: "pointer" }}>
              Branch
            </button>
            <button onClick={() => onRestore(v.id)} style={{ fontSize: 12, cursor: "pointer" }}>
              Restore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
