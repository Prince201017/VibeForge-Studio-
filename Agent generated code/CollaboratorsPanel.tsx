// [CollabAgent] CollaboratorsPanel.tsx — sidebar panel listing all active
// collaborators with their state (active/idle/away) and a "follow" toggle.
import { useCollaborationStore } from "../../lib/collaboration/store";
import type { Presence } from "../../lib/collaboration/types";

interface CollaboratorsPanelProps {
  currentUserId: string;
  peers: Presence[];
}

export function CollaboratorsPanel({ currentUserId, peers }: CollaboratorsPanelProps) {
  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const setFollowingUser = useCollaborationStore((s) => s.setFollowingUser);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>
        {peers.length + 1} online
      </div>
      {peers.map((p) => (
        <div
          key={p.userId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            background: followingUserId === p.userId ? "#F3F4F6" : "transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  p.state === "active" ? "#22C55E" : p.state === "idle" ? "#FBBF24" : "#9CA3AF",
              }}
            />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
            <span style={{ fontSize: 14 }}>{p.displayName || "Anonymous"}</span>
          </div>
          <button
            onClick={() => setFollowingUser(followingUserId === p.userId ? null : p.userId)}
            style={{
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid #E5E7EB",
              background: followingUserId === p.userId ? "#111827" : "white",
              color: followingUserId === p.userId ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            {followingUserId === p.userId ? "Following" : "Follow"}
          </button>
        </div>
      ))}
    </div>
  );
}
