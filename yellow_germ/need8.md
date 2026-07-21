# NEED 8: COLLABORATIVE EDITING - Real-time Sync & Collaboration

## System Overview
Real-time collaboration system with WebSocket sync, operational transformation (OT), presence awareness, and conflict resolution.

## What Goes In This System
- WebSocket connection management
- Operational transformation algorithm
- Real-time presence indicators (cursor, selection)
- Comment and annotation system
- Version history and time-travel
- Permission management (view/edit/admin)
- Conflict resolution

## Files to Create
- `lib/collaboration/engine.ts` - Core collaboration engine
- `lib/collaboration/ot-algorithm.ts` - OT implementation
- `lib/collaboration/presence.ts` - Presence tracking
- `lib/collaboration/sync.ts` - Sync manager
- `lib/collaboration/types.ts` - Type definitions
- `lib/collaboration/hook.ts` - React hook (useCollaboration)
- `components/collaboration/PresenceIndicators.tsx` - Cursors
- `components/collaboration/CommentsPanel.tsx` - Comments
- `python-service/routes/collaboration.py` - WebSocket routes
- `python-service/services/sync_service.py` - Sync logic
- `tests/collaboration.test.ts` - Tests (70%+ coverage)

## LOC Target: 3500-4000 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: < 100ms sync latency

## Real-time Features
1. Multi-user editing (5-100 users)
2. Presence cursors and selections
3. Live activity feed
4. Comments and threads
5. Mentions (@username)
6. Notifications
7. User status (online/idle/offline)
8. Viewport sharing (see where others are looking)

## Operational Transformation (OT)
- Transform concurrent operations
- Ensure consistency across clients
- Undo/redo with OT
- Merge conflicts automatically
- Vector clock for causality

## Permissions Model
- Owner (full control)
- Editor (can edit + comment)
- Viewer (read-only)
- Commenter (can only comment)
- Custom roles with granular permissions

## Database Schema (Neon PostgreSQL)
- collaborative_projects table (project_id, owner_id, created_at)
- project_members table (project_id, user_id, role, joined_at)
- operations_log table (id, project_id, user_id, operation, timestamp, order)
- comments table (id, project_id, layer_id, user_id, text, created_at, resolved)
- presence_state table (project_id, user_id, viewport, cursor, updated_at)

## WebSocket Events
- sync.operation - Broadcast operation
- presence.update - Update presence
- comment.added - New comment
- comment.resolved - Comment resolved
- activity.update - Activity feed update
- users.joined - User joined
- users.left - User left
- project.updated - Project metadata changed

## API Endpoints
- POST /api/collaborate/invite - Invite user
- GET /api/collaborate/members - List members
- PUT /api/collaborate/permissions - Update permissions
- DELETE /api/collaborate/members/{userId} - Remove member
- GET /api/collaborate/history - Get operation history
- POST /api/collaborate/comments - Add comment
- PUT /api/collaborate/comments/{id} - Update comment
- DELETE /api/collaborate/comments/{id} - Delete comment
- GET /api/collaborate/activities - Activity feed

## State Integration
Use Zustand store:
- `editorStore.setCollaborators()`
- `editorStore.addOperation()`
- `editorStore.applyRemoteOperation()`
- Track local operations queue
- Track remote operations

## Sync Strategy
- Local changes immediately applied
- Queue operations for sending
- Batch send every 100ms or on idle
- Receive and transform remote operations
- Maintain operation version vector

## Deliverables Checklist
- WebSocket connection working
- OT algorithm working correctly
- Presence indicators working
- Comments system working
- Multi-user editing working
- Permissions working
- History/time-travel working
- Conflict resolution working
- Notifications working
- Database schema working
- All API endpoints working
- All WebSocket events working
- All tests passing
- Performance benchmarks met
- JSDoc complete
