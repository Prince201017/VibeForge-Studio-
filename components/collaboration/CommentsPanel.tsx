// [CollabAgent] CommentsPanel.tsx — full list of comments for a project,
// filterable by resolved state, pinned-first ordering.
import { useMemo, useState } from "react";
import type { Comment } from "../../lib/collaboration/types";
import { CommentThread } from "./CommentThread";

interface CommentsPanelProps {
  comments: Comment[];
  allComments: Comment[]; // includes replies, for thread lookups
  onPostComment: (text: string, layerId?: string | null) => void;
  onReply: (parentId: string, text: string) => void;
  onResolveToggle: (id: string, resolved: boolean) => void;
  onReact: (id: string, emoji: string) => void;
  onPinToggle: (id: string) => void;
}

export function CommentsPanel({
  comments,
  allComments,
  onPostComment,
  onReply,
  onResolveToggle,
  onReact,
  onPinToggle,
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [newComment, setNewComment] = useState("");

  const filtered = useMemo(() => {
    const roots = comments.filter((c) => {
      if (filter === "unresolved") return !c.resolved;
      if (filter === "resolved") return c.resolved;
      return true;
    });
    return [...roots].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  }, [comments, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 6, padding: 8, borderBottom: "1px solid #E5E7EB" }}>
        {(["unresolved", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 12,
              border: "1px solid #E5E7EB",
              background: filter === f ? "#111827" : "white",
              color: filter === f ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((root) => (
          <CommentThread
            key={root.id}
            root={root}
            replies={allComments.filter((c) => c.parentCommentId === root.id)}
            onReply={(text) => onReply(root.id, text)}
            onResolveToggle={() => onResolveToggle(root.id, !root.resolved)}
            onReact={(emoji) => onReact(root.id, emoji)}
            onPinToggle={() => onPinToggle(root.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 24 }}>
            No {filter === "all" ? "" : filter} comments yet
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, padding: 8, borderTop: "1px solid #E5E7EB" }}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... use @ to mention"
          style={{ flex: 1, fontSize: 13, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newComment.trim()) {
              onPostComment(newComment.trim());
              setNewComment("");
            }
          }}
        />
      </div>
    </div>
  );
}
