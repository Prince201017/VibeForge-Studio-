// [CollabAgent] types.ts — shared TS types for the collaboration layer.
// Mirrors backend/models/*.py so payloads serialize identically both ways.

export type OperationType =
  | "insert"
  | "delete"
  | "modify"
  | "move"
  | "attribute"
  | "list_insert"
  | "list_delete"
  | "list_move";

export interface Operation {
  id: string;
  projectId: string;
  operationId: number;
  userId: string;
  type: OperationType;
  layerId?: string | null;
  path: string;
  value: unknown;
  oldValue?: unknown;
  timestamp: number;
  lamportTime: number;
  parentOpId?: number | null;
  tombstone?: boolean;
  siteId?: string;
}

export interface OperationAck {
  operationId: number;
  serverTimestamp: number;
  accepted: boolean;
  transformedAgainst: number[];
}

export type Role = "owner" | "editor" | "commenter" | "viewer";

export interface ResourcePermission {
  id: string;
  resourceId: string;
  resourceType: "project" | "layer";
  userId: string;
  role: Role;
  grantedBy?: string;
  grantedAt: number;
}

export interface ShareLink {
  id: string;
  projectId: string;
  token: string;
  role: Role;
  isPublic: boolean;
  expiresAt?: number | null;
  createdBy: string;
  createdAt: number;
  revoked: boolean;
}

export type PresenceState = "active" | "idle" | "away";

export interface CursorPosition {
  x: number;
  y: number;
}

export interface Presence {
  userId: string;
  projectId: string;
  cursor?: CursorPosition | null;
  selectedLayerId?: string | null;
  state: PresenceState;
  color: string;
  displayName: string;
  lastSeen: number;
}

export interface Comment {
  id: string;
  projectId: string;
  layerId?: string | null;
  parentCommentId?: string | null;
  userId: string;
  text: string;
  mentions: string[];
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: number | null;
  pinned: boolean;
  reactions: Record<string, string[]>;
  createdAt: number;
  editedAt?: number | null;
}

export type NotificationType =
  | "comment"
  | "mention"
  | "permission_change"
  | "user_joined"
  | "user_left"
  | "version_saved"
  | "conflict";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  projectId: string;
  actorId?: string | null;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: number;
}

export interface Version {
  id: string;
  projectId: string;
  snapshot: Record<string, unknown>;
  timestamp: number;
  userId: string;
  name?: string | null;
  description?: string | null;
  operationCount: number;
  parentVersionId?: string | null;
  isAutoSave: boolean;
}

export interface ConflictInfo {
  layerId: string | null;
  path: string;
  losingOp: Operation;
  winningOp: Operation;
  createdAt: number;
}

export type WSMessageType =
  | "join"
  | "leave"
  | "operation"
  | "presence"
  | "comment"
  | "version-save"
  | "ack"
  | "conflict"
  | "sync-state"
  | "error"
  | "heartbeat";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  projectId?: string;
  userId?: string;
  payload: T;
  timestamp: number;
}
