// [CollabAgent] ShareDialog.tsx — invite users, set roles, generate share
// links (public/token/expiring), and view/revoke existing access.
import { useState } from "react";
import type { ResourcePermission, Role, ShareLink } from "../../lib/collaboration/types";
import { ALL_ROLES, roleLabel } from "../../lib/collaboration/permissions";

interface ShareDialogProps {
  access: ResourcePermission[];
  shareLinks: ShareLink[];
  onInvite: (email: string, role: Role) => void;
  onRoleChange: (userId: string, role: Role) => void;
  onRevoke: (userId: string) => void;
  onCreateShareLink: (role: Role, isPublic: boolean, expiresInSeconds?: number) => void;
  onRevokeShareLink: (token: string) => void;
  onClose: () => void;
}

export function ShareDialog({
  access,
  shareLinks,
  onInvite,
  onRoleChange,
  onRevoke,
  onCreateShareLink,
  onRevokeShareLink,
  onClose,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const [linkRole, setLinkRole] = useState<Role>("viewer");
  const [isPublic, setIsPublic] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div style={{ background: "white", borderRadius: 10, padding: 20, width: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Share project</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            style={{ flex: 1, padding: "6px 8px", fontSize: 13, border: "1px solid #E5E7EB", borderRadius: 6 }}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
            {ALL_ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (email.trim()) {
                onInvite(email.trim(), inviteRole);
                setEmail("");
              }
            }}
          >
            Invite
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
          PEOPLE WITH ACCESS
        </div>
        <div style={{ maxHeight: 160, overflowY: "auto" }}>
          {access.map((a) => (
            <div
              key={a.userId}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", alignItems: "center" }}
            >
              <span style={{ fontSize: 13 }}>{a.userId.slice(0, 10)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={a.role}
                  onChange={(e) => onRoleChange(a.userId, e.target.value as Role)}
                  disabled={a.role === "owner"}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
                {a.role !== "owner" && (
                  <button onClick={() => onRevoke(a.userId)} style={{ fontSize: 12 }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: "#6B7280" }}>SHARE LINK</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
          <select value={linkRole} onChange={(e) => setLinkRole(e.target.value as Role)}>
            {ALL_ROLES.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Public
          </label>
          <button onClick={() => onCreateShareLink(linkRole, isPublic)}>Generate link</button>
        </div>

        {shareLinks.map((link) => (
          <div key={link.token} style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <code style={{ fontSize: 11 }}>/join/{link.token.slice(0, 16)}...</code>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/join/${link.token}`)}
                style={{ fontSize: 11 }}
              >
                Copy
              </button>
              <button onClick={() => onRevokeShareLink(link.token)} style={{ fontSize: 11 }}>
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
