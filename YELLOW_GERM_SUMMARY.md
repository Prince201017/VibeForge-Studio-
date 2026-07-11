# 🚀 ForgeOS - Yellow Germ Package Summary

**Creation Date:** 2026-07-12  
**Head Agent:** V0.A1  
**Status:** READY FOR TEAM DEVELOPMENT  
**Total Specifications:** 4000+ lines  
**Total Files Created:** 36 core + 9 specification files

---

## What is Yellow Germ?

**Yellow Germ** is the comprehensive specification package for distributed parallel development of **ForgeOS** — an AI-first creative engine. It contains:

- **Locked API contracts** for all integrations
- **Detailed task specifications** for each team member
- **Strict code quality standards** with checklists
- **Architecture requirements** and constraints
- **File structure and LOC targets** for each module

---

## What's Been Delivered

### ✅ Infrastructure (V0.A1 Complete)
- **Next.js 16** frontend with App Router, TypeScript, Tailwind CSS v4
- **Python FastAPI** backend service scaffold
- **Zustand global state** management system
- **Professional editor UI** with dockable panels
- **Command palette** with 10+ keyboard shortcuts
- **Dev server running** at http://localhost:3000

### ✅ Specifications (V0.A1 Complete)
- **00_MASTER_INDEX.md** — Complete navigation guide
- **01_ARCHITECTURE_REQUIREMENTS.md** — System design & constraints
- **02_CLAUDE_A2_GEOMETRY_ENGINE.md** — 15+ procedural operations
- **03_CLAUDE_A3_ANIMATION_SYSTEM.md** — Timeline + keyframes + graph editor
- **04_V0_A4_AI_INTEGRATION.md** — FastAPI routes + design generation
- **05_CLAUDE_A5_VIEWPORT_RENDERER.md** — Canvas/WebGL rendering

### ✅ Contracts (LOCKED)
- **API_CONTRACT.md** — All endpoints, formats, validation
- **STATE_CONTRACT.md** — Zustand mutations, data types
- **QUALITY_CHECKLIST.md** — Strict enforcement requirements

---

## For Each Agent

### **Claude.A2 - Geometry Engine**
**Read:** `yellow_germ/specs/02_CLAUDE_A2_GEOMETRY_ENGINE.md`

- **LOC Target:** 3500-4500 lines
- **Complexity:** High
- **Files:** 12-15
- **What to build:** 15+ procedural geometry operations (Voronoi, boolean, slicing, grids, waves, etc.)
- **Key deliverable:** GeometryEngine class, SVG path manipulation, Canvas rendering
- **Performance:** All operations < 500ms
- **Test coverage:** 70%+ required

**Spec highlights:**
- Complete operation list with parameters and requirements
- File structure with exact LOC allocation
- Integration points with viewport and animation
- Full code examples and boilerplate

---

### **Claude.A3 - Animation System**
**Read:** `yellow_germ/specs/03_CLAUDE_A3_ANIMATION_SYSTEM.md`

- **LOC Target:** 3000-4000 lines
- **Complexity:** High
- **Files:** 10-12
- **What to build:** Professional timeline editor with keyframes, easing curves, graph editor
- **Key deliverable:** AnimationEngine class, Timeline UI, Graph Editor component
- **Performance:** 60 FPS playback, < 16ms per frame
- **Test coverage:** 70%+ required

**Spec highlights:**
- All 25+ easing functions with implementations
- Timeline component with playhead scrubbing
- Bézier curve editor with tangent handles
- Export support (CSS, GSAP, APNG)

---

### **V0.A4 - AI Integration & FastAPI**
**Read:** `yellow_germ/specs/04_V0_A4_AI_INTEGRATION.md`

- **LOC Target:** 4000-5000 lines
- **Complexity:** Very High
- **Files:** 15-20
- **What to build:** FastAPI backend with design generation, image analysis, AI services
- **Key deliverable:** AI routes, design generator, image analyzer, chat UI component
- **Performance:** Design gen < 5s, image analysis < 2s
- **Test coverage:** 70%+ required

**Spec highlights:**
- Complete FastAPI route specifications
- Design generation pipeline with prompting
- Reference image analysis system
- Streaming SSE responses
- AI chat panel React component

---

### **Claude.A5 - Viewport Renderer**
**Read:** `yellow_germ/specs/05_CLAUDE_A5_VIEWPORT_RENDERER.md`

- **LOC Target:** 2500-3500 lines
- **Complexity:** High
- **Files:** 8-10
- **What to build:** Real-time rendering engine with Canvas 2D and WebGL
- **Key deliverable:** Canvas2DRenderer, WebGLRenderer, export pipeline
- **Performance:** 60 FPS minimum, < 16ms per frame
- **Test coverage:** 70%+ required

**Spec highlights:**
- Canvas 2D rendering pipeline with layer composition
- WebGL renderer with shader compilation
- Export to MP4, PNG, APNG, SVG
- Performance profiling and optimization

---

## Key Standards (Strict Enforcement)

### Code Quality
- ✅ **No `any` types** — 100% TypeScript strict mode
- ✅ **70%+ test coverage** — All public functions tested
- ✅ **JSDoc on all exports** — Google-style docstrings
- ✅ **[AgentName] tags** — Track code ownership
- ✅ **No console.log()** — Except debug tagged entries
- ✅ **Zero ESLint warnings** — Full compliance

### Performance
- ✅ **Geometry:** < 500ms per operation
- ✅ **Animation:** 60 FPS (< 16ms/frame)
- ✅ **Viewport:** 60 FPS rendering
- ✅ **AI:** < 5s design generation, < 2s image analysis
- ✅ **Memory:** No leaks, efficient resource cleanup

### Contracts
- ✅ **API_CONTRACT.md** — All endpoints locked
- ✅ **STATE_CONTRACT.md** — All mutations defined
- ✅ **TYPE_CONTRACTS.md** — All types strict

### Testing
- ✅ **Unit tests** for all functions
- ✅ **Integration tests** for API endpoints
- ✅ **Performance tests** for critical paths
- ✅ **70%+ code coverage** minimum

---

## Development Workflow

### For New Agents

1. **Register** in `team_members.md`
2. **Read specs** in order: MASTER_INDEX → ARCHITECTURE → YOUR_SPEC
3. **Reference contracts** while coding
4. **Tag all code** with `[YourName]` comments
5. **Run QUALITY_CHECKLIST** before each commit
6. **Post summary** in `communication_gate.md`
7. **Await V0.A1 review** before merge

### Phase 1 Timeline (Parallel)
- **Days 1-2:** Register, read specs, setup environment
- **Days 2-4:** Core implementation per spec
- **Day 4:** Integration testing and bug fixes
- **Day 5:** Final quality checks and deployment

---

## File Organization

```
/vercel/share/v0-project/
├── app/                          # Next.js pages and layouts
├── components/                   # React components
│   └── editor/
│       ├── EditorShell.tsx
│       ├── Viewport.tsx
│       ├── TopMenuBar.tsx
│       └── panels/
│           ├── LeftPanels.tsx
│           ├── RightPanels.tsx
│           └── BottomPanels.tsx
├── lib/                          # Core logic and utilities
│   ├── store.ts (Zustand)
│   ├── types.ts (All TypeScript types)
│   ├── keyboard.ts
│   ├── geometry/                 # [Claude.A2]
│   ├── animation/                # [Claude.A3]
│   ├── renderer/                 # [Claude.A5]
│   └── ai/                       # [V0.A4]
├── python-service/               # FastAPI backend
│   ├── main.py
│   ├── requirements.txt
│   ├── routes/
│   │   ├── ai.py (V0.A4)
│   │   ├── geometry.py (Claude.A2)
│   │   ├── animation.py (Claude.A3)
│   │   └── render.py (Claude.A5)
│   ├── services/
│   ├── models/
│   └── utils/
├── __tests__/                    # Test files
├── yellow_germ/                  # Specifications (THIS PACKAGE)
│   ├── 00_MASTER_INDEX.md
│   ├── 01_ARCHITECTURE_REQUIREMENTS.md
│   ├── specs/
│   │   ├── 02_CLAUDE_A2_GEOMETRY_ENGINE.md
│   │   ├── 03_CLAUDE_A3_ANIMATION_SYSTEM.md
│   │   ├── 04_V0_A4_AI_INTEGRATION.md
│   │   └── 05_CLAUDE_A5_VIEWPORT_RENDERER.md
│   ├── contracts/
│   │   ├── API_CONTRACT.md (LOCKED)
│   │   ├── STATE_CONTRACT.md (LOCKED)
│   │   └── TYPE_CONTRACTS.md (LOCKED)
│   └── checklists/
│       └── QUALITY_CHECKLIST.md
├── styles/                       # Global styles and design tokens
├── public/                       # Static assets
├── package.json                  # Node dependencies
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
├── README.md                     # Project overview
├── KEYBOARD_SHORTCUTS.md         # Keyboard command reference
├── PROJECT_STATUS.md             # Current status
├── team_members.md               # Team registry and architecture overview
├── communication_gate.md          # Cross-agent communication log
└── V0.A1.md                      # Head agent task log
```

---

## Critical Links

**Start Here:**
- `yellow_germ/00_MASTER_INDEX.md` — Navigation guide
- `yellow_germ/01_ARCHITECTURE_REQUIREMENTS.md` — System design

**Agent Specs (Read your own):**
- `yellow_germ/specs/02_CLAUDE_A2_GEOMETRY_ENGINE.md`
- `yellow_germ/specs/03_CLAUDE_A3_ANIMATION_SYSTEM.md`
- `yellow_germ/specs/04_V0_A4_AI_INTEGRATION.md`
- `yellow_germ/specs/05_CLAUDE_A5_VIEWPORT_RENDERER.md`

**Contracts (Reference while coding):**
- `yellow_germ/contracts/API_CONTRACT.md`
- `yellow_germ/contracts/STATE_CONTRACT.md`

**Quality:**
- `yellow_germ/checklists/QUALITY_CHECKLIST.md` — Run before every commit

**Team Coordination:**
- `communication_gate.md` — Post updates and blockers here
- `team_members.md` — Register yourself here

---

## Dev Server

**Frontend:** http://localhost:3000 (Next.js - running)  
**Backend:** http://localhost:8000 (FastAPI - ready)  
**Proxy:** `/api/*` routes through to backend

---

## Summary for Agents

You have everything you need to start building. The specifications are detailed, the APIs are locked, and the quality standards are clear. No ambiguity. No guessing.

**Your job:** Implement your spec exactly as written, follow the contracts, meet the performance targets, and ship production-ready code on day one.

The head (V0.A1) is monitoring. Post questions and blockers in `communication_gate.md` immediately.

Let's build ForgeOS.

---

**V0.A1 — Head Agent**  
**Created:** 2026-07-12  
**Git Commits:** 5 total | Foundation ready for team
