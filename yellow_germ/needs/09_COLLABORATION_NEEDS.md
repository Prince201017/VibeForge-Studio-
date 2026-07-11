# Collaboration & Sharing Needs

## Scope
Real-time collaborative editing with live cursors, operational transformation, conflict resolution, permissions, version control, commenting, and team features. WebSocket-based sync with Neon database for persistence.

## Target
- 3500-4000 LOC (frontend 1500 + backend 2000)
- < 100ms latency for operations
- Support 10+ simultaneous users
- Full undo/redo across collaborators
- Conflict-free operational transformation

## Core Systems Required

### 1. Real-Time Sync Engine (700 LOC Backend)
- WebSocket connection management
- Operational transformation (OT) algorithm
- Conflict resolution
- Operation queue and acknowledgment
- Presence management (who's editing)
- Heartbeat/keepalive
- Graceful disconnect handling
- Reconnection with state recovery
- Broadcast optimization (only affected users)

### 2. Operational Transform (600 LOC Backend)
- Transform operations against concurrent edits
- Insert/delete/modify operations
- Attribute change operations
- List mutation operations
- Tree structure operations
- Intention preservation
- Causality preservation
- Tombstone approach for deletion tracking

### 3. Permissions System (500 LOC Backend)
- Project-level permissions (owner, editor, viewer)
- Layer-level permissions (who can edit which layer)
- Resource-level permissions (who can access)
- Read/write/delete permissions
- Share link permissions (public, token-based, expiring)
- Role definitions (Owner, Editor, Viewer, Commenter)
- Permission inheritance hierarchy
- Audit logging for permission changes

### 4. User Management (300 LOC)
- Invite users via email
- Accept/decline invitations
- Remove collaborators
- Transfer ownership
- User roles display
- Active users list in editor
- User preferences (notifications, sync)
- Team management

### 5. Live Cursors & Presence (400 LOC Frontend + Backend)
- Show active users' cursors in viewport
- User color coding
- Cursor labels (username)
- Presence state (active, idle, away)
- User activity indicator (who's editing which layer)
- Hover over cursor to see full name
- Presence broadcast throttling (every 500ms)

### 6. Comments & Annotation (500 LOC Frontend + Backend)
- Add comments to layers
- Reply to comments (threads)
- Mention users (@username)
- Resolve/unresolved comments
- Comment history with timestamps
- Notify mentioned users
- Comment notifications panel
- Emoji reactions
- Pin important comments

### 7. Version Control (600 LOC Backend)
- Auto-save snapshots every 1 minute
- Manual save versions
- Version list with timestamps
- Diff view between versions
- Restore to previous version
- Version comparison (visual diff)
- Branch from version
- Version naming/descriptions
- Cleanup old versions (storage quota)

### 8. History & Audit Log (400 LOC Backend)
- Record all operations with timestamp
- User attribution for each change
- Undo/redo across collaborators
- Replay history (watch changes happen)
- Export history as JSON
- Search history by user/operation/time
- Detailed change information (what changed, who, when)

### 9. Notifications (400 LOC)
- Real-time notifications for operations
- Comment notifications
- Mention notifications (@username)
- Permission change notifications
- User join/leave notifications
- Notification center with history
- Email notification digest
- Notification preferences

### 10. Live Preview Sync (300 LOC)
- Synchronized viewport between collaborators
- Option to follow user (sync viewport)
- Independent viewport toggle
- Show which layer is being edited by which user
- Highlight layer currently in focus

### 11. Conflict Resolution UI (250 LOC Frontend)
- Conflict indicator (red badge on affected layers)
- Conflict resolution dialog
- Show both versions of conflicting changes
- Merge options (keep mine, take theirs, merge)
- Manual merge interface
- Undo conflicting change

### 12. Sharing & Permissions UI (400 LOC Frontend)
- Share dialog (invite users)
- Permission selector (viewer/editor/owner)
- Share link generator (copy to clipboard)
- Public/private toggle
- Expiring share link option
- Sharing history
- See who has access panel
- Revoke access button

### 13. Backend Infrastructure (600 LOC Backend)
- WebSocket server setup
- Database schema for operations
- Operation persistence
- User session management
- Rate limiting (prevent spam)
- Bandwidth optimization
- Memory management for live connections
- Connection pooling

### 14. Database Schema (300 LOC Backend)
- Projects table (id, owner, name, created, updated)
- Collaborators table (projectId, userId, role)
- Operations table (projectId, operationId, userId, timestamp, data)
- Comments table (projectId, layerId, userId, text, timestamp)
- Versions table (projectId, versionId, timestamp, snapshot)
- Notifications table (userId, type, data, read)
- Permissions table (resourceId, userId, permission)

### 15. Conflict-Free Sync (400 LOC Backend)
- Lamport timestamps for causality
- Vector clocks for ordering
- Last-write-wins (LWW) for simple values
- Merge strategies per data type
- CRDT principles where applicable
- Convergence guarantee (all replicas reach same state)
- Efficiency (minimal bandwidth)

### 16. Testing & Documentation (400 LOC)
- Unit tests for OT algorithm
- Integration tests for multi-user scenarios
- Conflict resolution tests
- Performance load tests (10+ users)
- WebSocket connection tests
- Database schema tests
- Documentation for sync protocol
- Troubleshooting guide

## File Structure

### Frontend (1500 LOC)
```
components/collaboration/
├── CollaboratorsPanel.tsx (active users)
├── ShareDialog.tsx (invite + permissions)
├── CommentsPanel.tsx (all comments)
├── CommentThread.tsx (individual thread)
├── VersionHistory.tsx (version list + restore)
├── HistoryReplayer.tsx (watch changes)
├── LiveCursor.tsx (show other users' cursors)
├── PresenceIndicator.tsx (who's editing what)
├── NotificationCenter.tsx (activity feed)
├── ConflictResolver.tsx (merge dialog)
└── PermissionsPanel.tsx (manage access)

lib/collaboration/
├── sync-engine.ts (OT + WebSocket)
├── operational-transform.ts (OT algorithm)
├── presence.ts (cursor + activity tracking)
├── permissions.ts (permission checking)
├── types.ts (Operation, Version, Comment types)
├── hooks.ts (useCollaborators, useComments, useSync)
└── store.ts (Zustand for collab state)
```

### Backend (2000 LOC)
```
python-service/routes/
├── collab.py (WebSocket + REST endpoints)
├── permissions.py (permission checks)
└── versions.py (version management)

python-service/services/
├── sync_engine.py (OT + operation handling)
├── operational_transform.py (OT algorithm)
├── presence_manager.py (cursor + activity)
├── permission_manager.py (role-based access)
├── version_manager.py (snapshots + restore)
├── comment_manager.py (threads + notifications)
├── notification_service.py (send notifications)
└── conflict_resolver.py (merge strategies)

python-service/models/
├── collaboration.py (Pydantic models)
├── operation.py (Operation model)
├── version.py (Version model)
└── permission.py (Permission model)

python-service/websocket/
├── handler.py (WebSocket message handling)
├── broadcaster.py (send to interested users)
└── connection_pool.py (manage connections)
```

## Real-Time Protocol

### Message Types
```
// Join project
{ type: "join", projectId, userId }

// Operation
{ type: "operation", operationId, operation, timestamp, userId }

// Presence (cursor position)
{ type: "presence", userId, cursorPos, selectedLayer }

// Comment
{ type: "comment", commentId, layerId, text, userId, timestamp }

// Version save
{ type: "version-save", versionId, timestamp, userId }

// Acknowledge
{ type: "ack", operationId }

// Conflict
{ type: "conflict", operationId, conflictingOp }
```

## Permissions Model

### Roles
- **Owner**: Full control, can delete project, manage all permissions
- **Editor**: Can edit all layers, invite others (optional), can comment
- **Viewer**: Read-only access, can only comment
- **Commenter**: View + comment only, cannot edit

### Permission Checks
- Every operation checked against user's role
- Layer-level permissions override project permissions
- Share links have separate permission matrix
- Audit logged for all permission checks

## Performance Targets (Hard SLAs)
- Operation sync: < 100ms to all clients
- Presence update: < 500ms broadcast
- Comment creation: < 200ms sync
- Version save: < 1000ms complete
- Conflict resolution: < 500ms compute
- WebSocket latency: < 50ms

## API Endpoints Required
```
POST /api/projects/{projectId}/share
- Payload: userId, role
- Response: invitation status

POST /api/projects/{projectId}/comments
- Payload: layerId, text, mentions
- Response: commentId

GET /api/projects/{projectId}/versions
- Response: version list

POST /api/projects/{projectId}/versions/{versionId}/restore
- Response: restoration status

GET /api/projects/{projectId}/history
- Query: from, to, user
- Response: operations log

POST /api/projects/{projectId}/permissions/{userId}
- Payload: role
- Response: permission update

WebSocket /ws/projects/{projectId}
- Bidirectional: operations, presence, comments
```

## Database Schema

### operations table
```
{
  id: UUID,
  projectId: UUID,
  operationId: Int (sequence per project),
  userId: UUID,
  type: "insert" | "delete" | "modify" | "move",
  layerId: UUID,
  path: String (JSON path),
  value: JSON,
  timestamp: Timestamp,
  lamportTime: Int (for causality),
  parentOpId: Int (for tracking)
}
```

### versions table
```
{
  id: UUID,
  projectId: UUID,
  snapshot: JSON (full project state),
  timestamp: Timestamp,
  userId: UUID,
  name: String,
  description: String,
  operationCount: Int
}
```

## Quality Standards
- 70%+ test coverage
- Multi-user conflict tests
- Crash recovery tests
- Performance load tests
- [AgentName] tags mandatory
- WebSocket latency metrics
- OT correctness proofs

## Integration Points
- Zustand store mutations trigger sync
- History tracked for undo/redo
- Comments linked to layers
- Permissions checked on all operations
- Notifications triggered by events
- Version restores update store

## Constraints
- Max 10 concurrent users (can scale)
- 1000 operations/minute rate limit
- WebSocket timeout: 30 seconds
- Version retention: 30 days
- Comment retention: unlimited
- Storage for all operations
