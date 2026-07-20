// [CollabAgent] store.ts — Zustand store holding all collaboration UI
// state (presence, comments, notifications, conflicts, versions). The
// sync engine's event callbacks feed into this store; components read
// from it via the hooks in hooks.ts.

import { create } from "zustand";
import type {
  Comment,
  ConflictInfo,
  Notification,
  Presence,
  Version,
} from "./types";

interface CollaborationState {
  projectId: string | null;
  connected: boolean;

  presenceByUser: Record<string, Presence>;
  comments: Comment[];
  notifications: Notification[];
  conflicts: ConflictInfo[];
  versions: Version[];
  followingUserId: string | null;

  setProjectId: (id: string) => void;
  setConnected: (connected: boolean) => void;

  upsertPresence: (presence: Presence) => void;
  removePresence: (userId: string) => void;

  addComment: (comment: Comment) => void;
  updateComment: (comment: Comment) => void;

  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  addConflict: (c: ConflictInfo) => void;
  resolveConflict: (layerId: string | null, path: string) => void;

  setVersions: (versions: Version[]) => void;
  addVersion: (v: Version) => void;

  setFollowingUser: (userId: string | null) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  projectId: null,
  connected: false,
  presenceByUser: {},
  comments: [],
  notifications: [],
  conflicts: [],
  versions: [],
  followingUserId: null,

  setProjectId: (id) => set({ projectId: id }),
  setConnected: (connected) => set({ connected }),

  upsertPresence: (presence) =>
    set((state) => ({
      presenceByUser: { ...state.presenceByUser, [presence.userId]: presence },
    })),

  removePresence: (userId) =>
    set((state) => {
      const next = { ...state.presenceByUser };
      delete next[userId];
      return { presenceByUser: next };
    }),

  addComment: (comment) => set((state) => ({ comments: [...state.comments, comment] })),

  updateComment: (comment) =>
    set((state) => ({
      comments: state.comments.map((c) => (c.id === comment.id ? comment : c)),
    })),

  addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  addConflict: (c) => set((state) => ({ conflicts: [...state.conflicts, c] })),

  resolveConflict: (layerId, path) =>
    set((state) => ({
      conflicts: state.conflicts.filter((c) => !(c.layerId === layerId && c.path === path)),
    })),

  setVersions: (versions) => set({ versions }),
  addVersion: (v) => set((state) => ({ versions: [v, ...state.versions] })),

  setFollowingUser: (userId) => set({ followingUserId: userId }),
}));
