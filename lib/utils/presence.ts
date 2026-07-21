// [CollabAgent] presence.ts — client-side cursor throttling and presence
// bookkeeping. Mirrors the 500ms broadcast throttle on the server so local
// mousemove sampling doesn't spam the socket even before the server-side
// throttle would drop it.

import type { CursorPosition, Presence } from "./types";

const THROTTLE_MS = 500;

export class PresenceTracker {
  private lastSentAt = 0;
  private peers: Map<string, Presence> = new Map();

  /** Call on every local mousemove; returns true if it's time to actually
   * send the update (keeps components from calling the socket directly). */
  shouldSendCursorUpdate(): boolean {
    const now = Date.now();
    if (now - this.lastSentAt >= THROTTLE_MS) {
      this.lastSentAt = now;
      return true;
    }
    return false;
  }

  upsertPeer(presence: Presence): void {
    this.peers.set(presence.userId, presence);
  }

  removePeer(userId: string): void {
    this.peers.delete(userId);
  }

  listPeers(): Presence[] {
    return [...this.peers.values()];
  }

  peersEditingLayer(layerId: string): Presence[] {
    return this.listPeers().filter((p) => p.selectedLayerId === layerId);
  }

  static distanceSincePointer(a: CursorPosition, b: CursorPosition): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
