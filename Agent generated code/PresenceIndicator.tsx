// [CollabAgent] PresenceIndicator.tsx — small badge shown on a layer/node
// indicating which collaborator(s) currently have it selected.
import type { Presence } from "../../lib/collaboration/types";

interface PresenceIndicatorProps {
  editors: Presence[];
  maxAvatars?: number;
}

export function PresenceIndicator({ editors, maxAvatars = 3 }: PresenceIndicatorProps) {
  if (editors.length === 0) return null;

  const visible = editors.slice(0, maxAvatars);
  const overflow = editors.length - visible.length;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: -6 }}>
      {visible.map((p) => (
        <div
          key={p.userId}
          title={p.displayName}
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: p.color,
            border: "2px solid white",
            marginLeft: -6,
            fontSize: 9,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {p.displayName?.charAt(0).toUpperCase() ?? "?"}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#6B7280",
            border: "2px solid white",
            marginLeft: -6,
            fontSize: 9,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
