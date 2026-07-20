// [CollabAgent] sync-engine.ts
// Owns the WebSocket connection lifecycle: connect, heartbeat, reconnect
// with state recovery, optimistic local operation application, and
// reconciliation against server acks/broadcasts.

import { ot } from "./operational-transform";
import type { Operation, OperationAck, WSMessage } from "./types";

const HEARTBEAT_INTERVAL_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 10_000;

export type SyncEventMap = {
  operation: (op: Operation) => void;
  ack: (ack: OperationAck) => void;
  presence: (payload: unknown) => void;
  comment: (payload: unknown) => void;
  conflict: (payload: unknown) => void;
  error: (message: string) => void;
  connected: () => void;
  disconnected: () => void;
};

type Listener<K extends keyof SyncEventMap> = SyncEventMap[K];

export class SyncEngine {
  private socket: WebSocket | null = null;
  private projectId: string;
  private token: string;
  private lastKnownOpId = 0;
  private pendingOps: Map<number, Operation> = new Map(); // optimistic, unacked
  private history: Operation[] = [];
  private reconnectAttempt = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: { [K in keyof SyncEventMap]?: Set<Listener<K>> } = {};
  private intentionallyClosed = false;

  constructor(projectId: string, token: string) {
    this.projectId = projectId;
    this.token = token;
  }

  on<K extends keyof SyncEventMap>(event: K, fn: Listener<K>): () => void {
    const set = (this.listeners[event] ??= new Set()) as Set<Listener<K>>;
    set.add(fn);
    return () => set.delete(fn);
  }

  private emit<K extends keyof SyncEventMap>(event: K, ...args: Parameters<Listener<K>>) {
    const set = this.listeners[event] as Set<Listener<K>> | undefined;
    set?.forEach((fn) => (fn as (...a: unknown[]) => void)(...args));
  }

  connect(wsBaseUrl: string, displayName: string): void {
    this.intentionallyClosed = false;
    const url = `${wsBaseUrl}/ws/projects/${this.projectId}?token=${encodeURIComponent(
      this.token
    )}&display_name=${encodeURIComponent(displayName)}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      this.emit("connected");
      this.requestStateRecovery();
    };

    this.socket.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.emit("disconnected");
      if (!this.intentionallyClosed) this.scheduleReconnect(wsBaseUrl, displayName);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.stopHeartbeat();
    this.socket?.close();
  }

  private scheduleReconnect(wsBaseUrl: string, displayName: string): void {
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_DELAY_MS
    );
    this.reconnectAttempt += 1;
    setTimeout(() => {
      if (!this.intentionallyClosed) this.connect(wsBaseUrl, displayName);
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "heartbeat", payload: {}, timestamp: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private requestStateRecovery(): void {
    this.send({
      type: "sync-state",
      payload: { since_operation_id: this.lastKnownOpId },
      timestamp: Date.now(),
    });
  }

  private send(message: WSMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /** Optimistically apply an operation locally and send it to the server. */
  submitOperation(op: Operation): void {
    this.pendingOps.set(op.operationId, op);
    this.emit("operation", op); // apply immediately for responsiveness
    this.send({ type: "operation", payload: op, timestamp: Date.now() });
  }

  updatePresence(cursor: { x: number; y: number } | null, selectedLayerId: string | null): void {
    this.send({
      type: "presence",
      payload: { cursor, selected_layer_id: selectedLayerId },
      timestamp: Date.now(),
    });
  }

  postComment(text: string, layerId: string | null, mentions: string[] = [], parentCommentId?: string): void {
    this.send({
      type: "comment",
      payload: { text, layer_id: layerId, mentions, parent_comment_id: parentCommentId },
      timestamp: Date.now(),
    });
  }

  saveVersion(snapshot: Record<string, unknown>, name?: string, description?: string): void {
    this.send({
      type: "version-save",
      payload: { snapshot, name, description },
      timestamp: Date.now(),
    });
  }

  private handleMessage(message: WSMessage): void {
    switch (message.type) {
      case "operation": {
        const remoteOp = message.payload as Operation;
        this.reconcileRemoteOperation(remoteOp);
        break;
      }
      case "ack": {
        const ack = message.payload as OperationAck;
        this.pendingOps.delete(ack.operationId);
        this.lastKnownOpId = Math.max(this.lastKnownOpId, ack.operationId);
        this.emit("ack", ack);
        break;
      }
      case "presence":
        this.emit("presence", message.payload);
        break;
      case "comment":
        this.emit("comment", message.payload);
        break;
      case "conflict":
        this.emit("conflict", message.payload);
        break;
      case "error":
        this.emit("error", (message.payload as { error: string }).error);
        break;
      default:
        break;
    }
  }

  private reconcileRemoteOperation(remoteOp: Operation): void {
    // Transform any still-pending local ops against the newly-arrived remote
    // op so local optimistic state stays consistent.
    for (const [id, localOp] of this.pendingOps) {
      const result = ot.transform(localOp, remoteOp);
      if (result.dropped) {
        this.pendingOps.delete(id);
      } else {
        this.pendingOps.set(id, result.op);
      }
    }
    this.history.push(remoteOp);
    this.lastKnownOpId = Math.max(this.lastKnownOpId, remoteOp.operationId);
    this.emit("operation", remoteOp);
  }

  getHistory(): Operation[] {
    return [...this.history];
  }

  getPendingOperations(): Operation[] {
    return [...this.pendingOps.values()];
  }
}
