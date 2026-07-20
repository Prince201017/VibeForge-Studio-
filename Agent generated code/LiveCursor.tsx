// [CollabAgent] LiveCursor.tsx — renders a single remote user's cursor with
// color coding, a name label, and a hover tooltip with the full name.
import { useState } from "react";
import type { Presence } from "../../lib/collaboration/types";

interface LiveCursorProps {
  presence: Presence;
}

export function LiveCursor({ presence }: LiveCursorProps) {
  const [hovered, setHovered] = useState(false);
  if (!presence.cursor) return null;

  const opacity = presence.state === "away" ? 0.3 : presence.state === "idle" ? 0.6 : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: presence.cursor.x,
        top: presence.cursor.y,
        pointerEvents: "auto",
        transition: "left 80ms linear, top 80ms linear",
        opacity,
        zIndex: 40,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M2 2 L18 9 L10 11 L8 18 Z"
          fill={presence.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        style={{
          marginTop: 2,
          marginLeft: 14,
          padding: "2px 8px",
          borderRadius: 4,
          background: presence.color,
          color: "white",
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          display: hovered ? "block" : "inline-block",
        }}
      >
        {presence.displayName || "Anonymous"}
      </div>
    </div>
  );
}

interface LiveCursorLayerProps {
  peers: Presence[];
}

export function LiveCursorLayer({ peers }: LiveCursorLayerProps) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {peers.map((p) => (
        <LiveCursor key={p.userId} presence={p} />
      ))}
    </div>
  );
}
