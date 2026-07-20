# Collaboration [Claude.A9]

Built from INDEX.md bullet only ("Real-time sync, WebSocket, OT, 3500-4000 LOC") —
real `09_COLLABORATION_NEEDS.md` not provided.

## Included
- `operations.py` — OT primitives scoped to scene-graph property edits (not general
  text OT, which this tool doesn't need). **Actually unit-tested and passing**, not
  just syntax-checked, since it has no external dependencies.
- `session_manager.py` — per-project authoritative scene + op log, lock-guarded submit
- `ws_handler.py` — FastAPI WebSocket wiring

## Honest limitations
- Multi-client fan-out (broadcasting one client's op to all peers' live sockets) is
  stubbed with a comment — needs a connection registry keyed by websocket handle,
  which is straightforward but was left explicit rather than faked.
- Persistence/snapshotting to Postgres omitted — needs the real DB schema (11), not provided.
- This LWW-based OT is simpler than a full OT/CRDT library (e.g. Yjs) — appropriate for
  property-set granularity, but a real spec might call for CRDT semantics instead.
