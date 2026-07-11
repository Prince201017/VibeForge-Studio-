# Yellow Germ Needs - Complete Index

This folder contains comprehensive specification needs for every system required to build ForgeOS.

## What This Folder Contains

**15 detailed needs.md files** defining every subsystem requirement without summarization—just pure, actionable specifications for agent developers.

## Files Overview

### Foundation & Architecture
- **01_ARCHITECTURE_REQUIREMENTS.md** — System design, tech stack, integration points, constraints
- **11_DATABASE_SCHEMA_NEEDS.md** — Complete PostgreSQL schema, migrations, queries, optimization

### Core Subsystems (Already Assigned)
- **02_CLAUDE_A2_GEOMETRY_ENGINE.md** — 15+ procedural operations, 3500-4500 LOC (Assigned: Claude.A2)
- **03_CLAUDE_A3_ANIMATION_SYSTEM.md** — Timeline, keyframes, graph editor, easing, 3000-4000 LOC (Assigned: Claude.A3)
- **04_V0_A4_AI_INTEGRATION.md** — FastAPI backend, design generation, 4000-5000 LOC (Assigned: V0.A4)
- **05_CLAUDE_A5_VIEWPORT_RENDERER.md** — Canvas/WebGL rendering, exports, 2500-3500 LOC (Assigned: Claude.A5)

### Additional Major Systems (Unassigned - Needs New Agents)
- **06_PARTICLE_ENGINE_NEEDS.md** — 1M+ particles, GPU, 20+ presets, 3500-4500 LOC
- **07_EXPORT_PIPELINE_NEEDS.md** — 25+ formats (video, image, code), 5000-6000 LOC
- **08_ASSET_MANAGER_NEEDS.md** — 100K+ assets, preview, search, tagging, 2500-3000 LOC
- **09_COLLABORATION_NEEDS.md** — Real-time sync, WebSocket, OT, 3500-4000 LOC
- **10_CSS_FRONTEND_ANIMATION_NEEDS.md** — Visual CSS code generation, 6 frameworks, 3000-3500 LOC
- **12_SECURITY_AUTH_NEEDS.md** — Clerk, CSP, rate limiting, encryption, 2000-2500 LOC
- **13_UI_COMPONENTS_LIBRARY_NEEDS.md** — 40+ reusable components, Storybook, 3000-4000 LOC
- **14_MOBILE_RESPONSIVE_NEEDS.md** — Mobile/tablet/desktop layouts, touch, 1500-2000 LOC
- **15_ADVANCED_AI_ENGINE_NEEDS.md** — Style transfer, code gen, NLP, 4000-5000 LOC

### Contract Files (Reference)
- **../contracts/API_CONTRACT.md** — All endpoint specs (locked)
- **../contracts/STATE_CONTRACT.md** — Zustand mutations (locked)

### Quality Enforcement
- **../checklists/QUALITY_CHECKLIST.md** — Pre-commit requirements (locked)

## How to Use This Index

### For Existing Agents (Claude.A2, A3, V0.A4, Claude.A5)
1. Read your assigned spec file in `/specs/`
2. Reference `../contracts/` when building APIs
3. Follow `../checklists/QUALITY_CHECKLIST.md` before commits
4. Read `../01_ARCHITECTURE_REQUIREMENTS.md` for integration context

### For New Agents (Particle, Export, Assets, Collaboration, CSS, Security, UI, Mobile, Advanced AI)
1. Start with the specific needs.md file for your system
2. Read `../01_ARCHITECTURE_REQUIREMENTS.md` for overall design
3. Reference `../contracts/` for API integration
4. Follow quality checklist on all deliverables
5. Register yourself in `../../team_members.md` before starting

## System Assignments (Current Status)

### ✅ Complete (V0.A1)
- Infrastructure & Editor Shell
- Architecture & Documentation

### 🔄 In Progress (4 Agents)
- Claude.A2 — Geometry Engine
- Claude.A3 — Animation System
- V0.A4 — AI Integration (v1)
- Claude.A5 — Viewport Renderer

### ⏳ Waiting for Assignment (9 Systems)
- **Particle Engine** — 3500-4500 LOC (needs Claude.A6 or similar)
- **Export Pipeline** — 5000-6000 LOC (needs V0.A7 or similar)
- **Asset Manager** — 2500-3000 LOC (needs Claude.A8 or similar)
- **Collaboration** — 3500-4000 LOC (needs Claude.A9 or similar)
- **CSS Animation Code Gen** — 3000-3500 LOC (needs V0.A10 or similar)
- **Security & Auth** — 2000-2500 LOC (needs Claude.A11 or similar)
- **UI Components** — 3000-4000 LOC (needs Claude.A12 or similar)
- **Mobile/Responsive** — 1500-2000 LOC (needs V0.A13 or similar)
- **Advanced AI Engine** — 4000-5000 LOC (needs Claude.A14 or similar)

## Total Development Scope

| Category | Files | Total LOC | Agents |
|----------|-------|-----------|--------|
| Foundation | 2 | ~3,500 | V0.A1 ✅ |
| Core Systems | 4 | ~12,500 | 4 agents 🔄 |
| Additional Systems | 9 | ~31,500 | 9 agents ⏳ |
| **TOTAL** | **15** | **~47,500** | **13 agents** |

## Development Timeline (Suggested)

### Phase 1: Core Systems (2-3 weeks)
- Core 4 agents finish their assigned systems
- Integration testing between subsystems
- Bug fixes and optimization

### Phase 2: Additional Systems (2-3 weeks)
- 9 new agents join and build their systems
- Parallel development
- Integration with Phase 1 work

### Phase 3: Polish & Deployment (1 week)
- Full integration testing
- Performance optimization
- Security audit
- Deployment

## Key Statistics

### Code Distribution
- Frontend: ~18,000 LOC
- Backend (Python): ~19,000 LOC
- Documentation: ~7,000 LOC

### Component Count
- React Components: 150+ components
- API Endpoints: 80+ endpoints
- Database Tables: 15+ tables
- Features: 100+ distinct features

### Performance Targets (All Hard SLAs)
- Viewport rendering: 60 FPS
- API responses: < 200ms
- Animation playback: 60 FPS
- Particle physics: < 16ms per frame
- Export pipeline: < 60 seconds for videos
- Search: < 100ms for 10K items
- WebSocket sync: < 100ms latency

## Quality Standards (Non-Negotiable)

### Code Quality
- ✅ 70%+ test coverage minimum
- ✅ 100% TypeScript strict mode
- ✅ Zero ESLint warnings
- ✅ JSDoc on all exports
- ✅ [AgentName] tags on all code

### Functionality
- ✅ All features production-ready day one
- ✅ No "TODO" comments
- ✅ Comprehensive error handling
- ✅ Full undo/redo support
- ✅ Responsive design across devices

### Performance
- ✅ Performance targets met
- ✅ No memory leaks
- ✅ Optimized bundle sizes
- ✅ Network efficient
- ✅ GPU accelerated where applicable

### Security
- ✅ Zero security vulnerabilities
- ✅ All inputs validated
- ✅ All outputs escaped
- ✅ Encrypted sensitive data
- ✅ Rate limiting enforced

## Integration Points (Critical)

All systems must integrate at these points:

### Frontend-Backend
- Zustand store ← → Python FastAPI
- WebSocket for real-time sync
- REST APIs for CRUD operations

### State Management
- All data mutations through Zustand store only
- History tracking on all mutations
- Undo/redo fully functional

### Authentication & Permissions
- All endpoints check user permissions
- Role-based access control (RBAC)
- Audit logging on all actions

### Database
- Neon PostgreSQL for persistence
- Transactions for consistency
- Proper indexing for performance

### Storage
- Vercel Blob for assets
- Cloud storage for exports
- Efficient cleanup policies

## Communication & Coordination

All cross-team issues discussed in: `../../communication_gate.md`

Format:
```
[TIMESTAMP] AgentName: @OtherAgent question/blocker
[TIMESTAMP] OtherAgent: @AgentName response
[TIMESTAMP] V0.A1: Confirmed, proceed with approach X
```

## Getting Started (For New Agents)

1. **Clone the repo** (already done for you)
2. **Read this file** (you're reading it!)
3. **Read architecture** — `../01_ARCHITECTURE_REQUIREMENTS.md`
4. **Read your needs file** — Find your assigned system above
5. **Register yourself** — Update `../../team_members.md`
6. **Create task log** — `../../AgentName.md` file
7. **Post readiness** — Comment in `../../communication_gate.md`
8. **Start building** — Follow your needs specification exactly
9. **Pre-commit** — Run through `../checklists/QUALITY_CHECKLIST.md`
10. **Submit** — Post commit link + checklist results in communication gate

## Questions?

- Architecture questions → `../01_ARCHITECTURE_REQUIREMENTS.md`
- API/State questions → `../contracts/`
- Specific system questions → That system's needs file
- Coordination issues → Post in `../../communication_gate.md`

## Final Notes

- **These are requirements, not suggestions** — Follow the specifications exactly
- **Quality is non-negotiable** — All checklist items must pass
- **Integration matters** — Your system must work with others
- **Communication is key** — Post blockers early in communication gate
- **Performance targets are SLAs** — Not aspirational, they're required

---

**Status:** All specifications complete. Ready for agent team development.

**Total Effort Estimate:** 40-50 hours per system (realistic timeline)

**Next Step:** Assign agents to unassigned systems and begin Phase 2.

**Commit Reference:** See git log for latest yellow_germ updates
