// [CollabAgent] permissions.ts — client-side permission checks for gating
// UI affordances (disable edit tools for viewers, etc). The server is
// always the source of truth; this only prevents showing controls that
// would be rejected anyway.

import type { Role } from "./types";

const ROLE_CAPABILITIES: Record<Role, Set<string>> = {
  owner: new Set(["read", "write", "delete", "comment", "share", "manage_permissions", "manage_project"]),
  editor: new Set(["read", "write", "comment", "share"]),
  commenter: new Set(["read", "comment"]),
  viewer: new Set(["read"]),
};

export function can(role: Role | undefined | null, capability: string): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.has(capability) ?? false;
}

export function canEdit(role: Role | undefined | null): boolean {
  return can(role, "write");
}

export function canComment(role: Role | undefined | null): boolean {
  return can(role, "comment");
}

export function canShare(role: Role | undefined | null): boolean {
  return can(role, "share");
}

export function canManagePermissions(role: Role | undefined | null): boolean {
  return can(role, "manage_permissions");
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "commenter":
      return "Commenter";
    case "viewer":
      return "Viewer";
  }
}

export const ALL_ROLES: Role[] = ["owner", "editor", "commenter", "viewer"];
