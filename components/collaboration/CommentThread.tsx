// [CollabAgent] CommentThread.tsx — an individual comment plus its replies,
// with reactions, resolve toggle, and a reply box.
import { useState } from "react";
import type { Comment } from "../../lib/collaboration/types";

interface CommentThreadProps {
  root: Comment;
  replies: Comment[];
  onReply: (text: string) => void;
  onResolveToggle: () => void;
  onReact: (emoji: string) => void;
  onPinToggle: () => void;
}

function CommentRow({ comment, onReact }: { comment: Comment; onReact: (emoji: string) => void }) {
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{comment.userId.slice(0, 8)}</span>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
          {new Date(comment.createdAt * 1000).toLocaleTimeString()}
        </span>
      </div>
      <div style={{ fontSize: 14, marginTop: 2 }}>{comment.text}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {["👍", "❤️", "🎉"].map((emoji) => {
          const count = comment.reactions[emoji]?.length ?? 0;
          return (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              style={{
                fontSize: 12,
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: "1px 6px",
                background: count > 0 ? "#EEF2FF" : "white",
                cursor: "pointer",
              }}
            >
              {emoji} {count > 0 ? count : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CommentThread({
  root,
  replies,
  onReply,
  onResolveToggle,
  onReact,
  onPinToggle,
}: CommentThreadProps) {
  const [replyText, setReplyText] = useState("");

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: 10,
        background: root.resolved ? "#F9FAFB" : "white",
        opacity: root.resolved ? 0.7 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 4 }}>
        <button onClick={onPinToggle} style={{ fontSize: 11, cursor: "pointer" }}>
          {root.pinned ? "📌 Unpin" : "Pin"}
        </button>
        <button onClick={onResolveToggle} style={{ fontSize: 11, cursor: "pointer" }}>
          {root.resolved ? "Reopen" : "Resolve"}
        </button>
      </div>
      <CommentRow comment={root} onReact={onReact} />
      {replies.map((r) => (
        <div key={r.id} style={{ marginLeft: 16 }}>
          <CommentRow comment={r} onReact={onReact} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply..."
          style={{ flex: 1, fontSize: 13, padding: "4px 8px", border: "1px solid #E5E7EB", borderRadius: 6 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && replyText.trim()) {
              onReply(replyText.trim());
              setReplyText("");
            }
          }}
        />
      </div>
    </div>
  );
}
