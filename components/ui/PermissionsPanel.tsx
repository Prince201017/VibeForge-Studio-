// [CollabAgent] PermissionsPanel.tsx — read-only overview of who has
// access at what level, plus an audit log view for owners.
import { useState } from "react";
import type { ResourcePermission } from "../../lib/collaboration/types";
import { roleLabel } from "../../lib/collaboration/permissions";

interface AuditEntry {
  actorId: string;
  targetUserId?: string | null;
  action: string;
  oldRole?: string | null;
  newRole?: string | null;
  timestamp: number;
}

interface PermissionsPanelProps {
  access: ResourcePermission[];
  auditLog: AuditEntry[];
  canViewAudit: boolean;
}

export function PermissionsPanel({ access, auditLog, canViewAudit }: PermissionsPanelProps) {
  const [tab, setTab] = useState<"access" | "audit">("access");

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, width: 340 }}>
      <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
        <button
          onClick={() => setTab("access")}
          style={{ flex: 1, padding: 8, fontSize: 13, background: tab === "access" ? "#F3F4F6" : "white" }}
        >
          Access
        </button>
        {canViewAudit && (
          <button
            onClick={() => setTab("audit")}
            style={{ flex: 1, padding: 8, fontSize: 13, background: tab === "audit" ? "#F3F4F6" : "white" }}
          >
            Audit log
          </button>
        )}
      </div>

      {tab === "access" && (
        <div style={{ padding: 10 }}>
          {access.map((a) => (
            <div key={a.userId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 13 }}>{a.userId.slice(0, 10)}</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{roleLabel(a.role)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div style={{ padding: 10, maxHeight: 280, overflowY: "auto" }}>
          {auditLog.map((e, i) => (
            <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid #F3F4F6" }}>
              <strong>{e.actorId.slice(0, 8)}</strong> {e.action}
              {e.targetUserId ? ` for ${e.targetUserId.slice(0, 8)}` : ""}
              {e.newRole ? ` → ${e.newRole}` : ""}
              <div style={{ color: "#9CA3AF" }}>{new Date(e.timestamp * 1000).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
