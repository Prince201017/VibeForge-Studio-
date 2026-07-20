// [CollabAgent] NotificationCenter.tsx — activity feed with unread badge,
// mark-as-read, and per-type icons.
import type { Notification } from "../../lib/collaboration/types";

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const ICONS: Record<Notification["type"], string> = {
  comment: "💬",
  mention: "@",
  permission_change: "🔑",
  user_joined: "👋",
  user_left: "🚪",
  version_saved: "📌",
  conflict: "⚠️",
};

function describe(n: Notification): string {
  switch (n.type) {
    case "comment":
      return "left a comment";
    case "mention":
      return "mentioned you";
    case "permission_change":
      return `changed your role to ${n.data.new_role}`;
    case "user_joined":
      return "joined the project";
    case "user_left":
      return "left the project";
    case "version_saved":
      return "saved a new version";
    case "conflict":
      return `has a conflict on ${n.data.path}`;
  }
}

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  return (
    <div style={{ width: 320, border: "1px solid #E5E7EB", borderRadius: 8, background: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: 10, borderBottom: "1px solid #E5E7EB" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          Notifications {unreadCount > 0 && <span style={{ color: "#EF4444" }}>({unreadCount})</span>}
        </span>
        <button onClick={onMarkAllRead} style={{ fontSize: 12 }}>
          Mark all read
        </button>
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => onMarkRead(n.id)}
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 10px",
              cursor: "pointer",
              background: n.read ? "white" : "#EFF6FF",
              borderBottom: "1px solid #F3F4F6",
            }}
          >
            <span>{ICONS[n.type]}</span>
            <div>
              <div style={{ fontSize: 13 }}>
                {n.actorId ? `${n.actorId.slice(0, 8)} ` : ""}
                {describe(n)}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                {new Date(n.createdAt * 1000).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            You're all caught up
          </div>
        )}
      </div>
    </div>
  );
}
