// [CollabAgent] hooks.ts — React hooks wiring the SyncEngine into the
// Zustand store and exposing ergonomic selectors to components.

import { useEffect, useMemo, useRef } from "react";
import { SyncEngine } from "./sync-engine";
import { useCollaborationStore } from "./store";
import type { Comment, Operation, Presence } from "./types";

const WS_BASE_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "wss://api.example.com";

/** Establishes (and tears down) the websocket connection for a project,
 * and pipes every event into the shared Zustand store. Call once near the
 * root of the collaborative editor. */
export function useSync(projectId: string, token: string, displayName: string) {
  const engineRef = useRef<SyncEngine | null>(null);
  const store = useCollaborationStore;

  useEffect(() => {
    const engine = new SyncEngine(projectId, token);
    engineRef.current = engine;
    store.getState().setProjectId(projectId);

    const unsubscribers = [
      engine.on("connected", () => store.getState().setConnected(true)),
      engine.on("disconnected", () => store.getState().setConnected(false)),
      engine.on("presence", (payload) => {
        const presence = payload as Presence;
        if (presence && "userId" in presence) {
          store.getState().upsertPresence(presence);
        }
      }),
      engine.on("comment", (payload) => {
        store.getState().addComment(payload as Comment);
      }),
      engine.on("conflict", (payload) => {
        store.getState().addConflict(payload as never);
      }),
      engine.on("error", (message) => {
        // eslint-disable-next-line no-console
        console.error("[collab] server error:", message);
      }),
    ];

    engine.connect(WS_BASE_URL, displayName);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      engine.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, token]);

  return engineRef;
}

/** Returns the list of active collaborators (excluding the current user). */
export function useCollaborators(currentUserId: string): Presence[] {
  const presenceByUser = useCollaborationStore((s) => s.presenceByUser);
  return useMemo(
    () => Object.values(presenceByUser).filter((p) => p.userId !== currentUserId),
    [presenceByUser, currentUserId]
  );
}

/** Returns comments for a given layer (or all top-level comments if
 * layerId is omitted), plus a helper to post a new one via the engine. */
export function useComments(
  engineRef: React.RefObject<SyncEngine | null>,
  layerId?: string
): { comments: Comment[]; postComment: (text: string, mentions?: string[]) => void } {
  const allComments = useCollaborationStore((s) => s.comments);
  const comments = useMemo(
    () =>
      layerId
        ? allComments.filter((c) => c.layerId === layerId && !c.parentCommentId)
        : allComments.filter((c) => !c.parentCommentId),
    [allComments, layerId]
  );

  const postComment = (text: string, mentions: string[] = []) => {
    engineRef.current?.postComment(text, layerId ?? null, mentions);
  };

  return { comments, postComment };
}

/** Convenience hook for submitting local edits through the sync engine. */
export function useOperationSubmit(engineRef: React.RefObject<SyncEngine | null>) {
  return (op: Operation) => engineRef.current?.submitOperation(op);
}

export function useNotifications() {
  const notifications = useCollaborationStore((s) => s.notifications);
  const markRead = useCollaborationStore((s) => s.markNotificationRead);
  const markAllRead = useCollaborationStore((s) => s.markAllNotificationsRead);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  return { notifications, unreadCount, markRead, markAllRead };
}

export function useConflicts() {
  const conflicts = useCollaborationStore((s) => s.conflicts);
  const resolveConflict = useCollaborationStore((s) => s.resolveConflict);
  return { conflicts, resolveConflict };
}
