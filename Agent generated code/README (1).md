# Collaboration System — Implementation

Implements the full spec from `09_COLLABORATION_NEEDS.md`: real-time OT sync,
permissions, presence, comments, versioning, notifications, and conflict
resolution, split into `backend/` (Python/FastAPI) and `frontend/` (TS/React).

## Architecture

```
Client A ─┐                                   ┌─ Client B
          │        WebSocket /ws/projects/id  │
          ▼                                   ▼
     ConnectionPool ── Broadcaster ── CollaborationHandler
                                            │
                 ┌──────────────┬───────────┼───────────┬───────────────┐
                 ▼              ▼           ▼           ▼               ▼
            SyncEngine   PresenceManager  PermissionMgr  CommentManager  VersionManager
                 │
                 ▼
          ConflictResolver → OperationalTransform
```

Every inbound operation goes: `handler → permission check → SyncEngine.submit_operation
→ ConflictResolver.resolve_incoming → OperationalTransform.transform_against_history
→ persisted + broadcast (excluding author) → ack sent to author`.

## Sync Protocol

Messages are JSON envelopes: `{ type, project_id, user_id, payload, timestamp }`.
Types: `join`, `operation`, `presence`, `comment`, `version-save`, `ack`, `conflict`,
`sync-state`, `error`, `heartbeat`. See `models/collaboration.py::WSMessage` /
`frontend/lib/collaboration/types.ts::WSMessage` — both sides serialize identically.

**Reconnection**: client tracks `lastKnownOpId`; on reconnect it sends `sync-state`
with `since_operation_id`, and the server replays everything after that via
`SyncEngine.recover_since`.

**Conflict convergence**: two concurrent scalar edits to the same path resolve via
Lamport-time + site-id tie-break (`operational_transform.py::_lamport_wins`), so
every replica converges on the same winner regardless of arrival order — this is
covered by `tests/test_operational_transform.py::TestConvergence`.

## Where things live

- `backend/models/` — Pydantic wire/data models (Operation, Version, Permission, etc.)
- `backend/services/operational_transform.py` — the OT algorithm itself
- `backend/services/sync_engine.py` — ordering, lamport clock, persistence, undo
- `backend/services/conflict_resolver.py` — turns OT output into user-facing conflicts
- `backend/services/permission_manager.py` — RBAC, layer overrides, share links, audit
- `backend/services/presence_manager.py` — cursors, throttling, idle/away
- `backend/services/comment_manager.py` — threads, mentions, reactions
- `backend/services/version_manager.py` — snapshots, diff, restore, branch, retention
- `backend/services/notification_service.py` — real-time + digest notifications
- `backend/websocket/` — connection pool, broadcaster, message handler
- `backend/routes/` — FastAPI REST + WS endpoints (matches API_CONTRACT.md shape)
- `frontend/lib/collaboration/` — sync engine, client OT mirror, Zustand store, hooks
- `frontend/components/collaboration/` — all UI panels from the spec's file structure

## Running the tests

```bash
cd backend
pip install pydantic fastapi pytest pytest-asyncio
pytest tests/ -v
```

`tests/test_operational_transform.py` includes explicit convergence proofs
(apply A-then-B vs B-then-A yields identical final state). `tests/test_sync_engine.py`
covers multi-user submission, rate limiting, undo, and reconnection recovery.
`tests/test_permission_manager.py` covers RBAC inheritance and share-link expiry.

## Troubleshooting

- **Client stuck "connecting"**: check the `token` query param resolves via
  `services/auth.resolve_user_from_token` (stub — wire to your real auth/security module).
- **Ops silently dropped**: check `ack.accepted` — `false` means it lost an LWW
  tie or targeted a tombstoned node; surfaced to the UI via the `conflict` event.
- **Presence not updating for a user**: the 500ms throttle
  (`PRESENCE_BROADCAST_THROTTLE_MS`) may be suppressing rapid updates — this is
  expected; the last position always wins on the next allowed tick.
- **Disconnects after ~30s of inactivity**: expected — `CONNECTION_TIMEOUT_SECONDS`
  in `connection_pool.py`. Client should be sending `heartbeat` every 10s (it does,
  automatically, in `SyncEngine.startHeartbeat`).

## Known integration points to wire up for production

1. Replace `InMemoryOperationStore` with a Neon/Postgres-backed `OperationStore`.
2. Implement `services/auth.py::resolve_user_from_token` against your real session/JWT system.
3. Persist `PermissionManager`, `CommentManager`, `VersionManager`, `NotificationService`
   state (currently in-memory dicts) to the `operations`/`comments`/`versions`/
   `notifications`/`permissions` tables per `11_DATABASE_SCHEMA_NEEDS.md`.
4. Wire `NotificationService.on_notify` to also push web-push/email for offline users.
