# Agent Code Submission Workflow

## How Code Gets Generated, Delivered, and Integrated

### STEP 1: DISTRIBUTE NEEDS FILES TO AGENTS

**What you do:**
1. Go to `/vercel/share/v0-project/yellow_germ/needs/`
2. Send each agent their specific needs file:
   - Agent for Particle Engine → `06_PARTICLE_ENGINE_NEEDS.md`
   - Agent for Export Pipeline → `07_EXPORT_PIPELINE_NEEDS.md`
   - Agent for Asset Manager → `08_ASSET_MANAGER_NEEDS.md`
   - Agent for Collaboration → `09_COLLABORATION_NEEDS.md`
   - Agent for CSS Animation → `10_CSS_FRONTEND_ANIMATION_NEEDS.md`
   - Agent for Security/Auth → `12_SECURITY_AUTH_NEEDS.md`
   - Agent for UI Components → `13_UI_COMPONENTS_LIBRARY_NEEDS.md`
   - Agent for Mobile/Responsive → `14_MOBILE_RESPONSIVE_NEEDS.md`
   - Agent for Advanced AI → `15_ADVANCED_AI_ENGINE_NEEDS.md`

Also send them:
- `01_ARCHITECTURE_REQUIREMENTS.md` (context)
- `contracts/API_CONTRACT.md` (locked APIs)
- `contracts/STATE_CONTRACT.md` (locked state mutations)
- `checklists/QUALITY_CHECKLIST.md` (pre-commit requirements)

**Format to send:** Copy entire markdown file content, paste into chat with agent

---

### STEP 2: AGENTS GENERATE CODE

**What agents do:**
1. Read their needs file completely
2. Read architecture & contract files
3. Create code exactly matching spec:
   - Exact file structure specified
   - Exact LOC target (e.g., 3500-4500 LOC)
   - All performance SLAs met
   - All tests included (70%+ coverage)
   - All [AgentName] tags present
   - JSDoc on all exports
   - Zero TypeScript errors
4. Run through quality checklist
5. Generate summary + commit hash

**What they output:**
- Complete working code
- All TypeScript types
- Full test suite
- Documentation
- Performance benchmarks
- Git commit summary

---

### STEP 3: AGENTS DELIVER CODE TO YOU

**How they send it:**

#### Option A: DIRECT FILE CONTENT (Recommended)
Agent posts in conversation:
```
[AGENT_NAME] CODE SUBMISSION

System: [System Name]
Needs File: [Which needs file they implemented]
Commit Hash: [if they committed locally]
Status: ✅ Complete

Files Generated:
- lib/system/engine.ts (1200 LOC)
- lib/system/types.ts (300 LOC)
- lib/system/hook.ts (250 LOC)
- components/system/Panel.tsx (800 LOC)
- tests/system.test.ts (1000 LOC)

[Then they paste each file's complete content]
```

#### Option B: GIT BRANCH (If they have git access)
Agent creates branch: `feature/system-name`
Pushes all commits
You pull and merge

#### Option C: GITHUB GIST/PASTE
Agent uses GitHub Gist to share all files
Posts link + commit summary

---

### STEP 4: YOU REVIEW SUBMISSION

**What you check:**
1. All files created match spec structure
2. LOC count is within target range
3. Run quality checklist verification:
   ```
   [ ] All TypeScript files compile without errors
   [ ] No 'any' types in codebase
   [ ] 70%+ test coverage
   [ ] No ESLint warnings
   [ ] All functions have JSDoc
   [ ] [AgentName] tags present on all exports
   [ ] Performance benchmarks meet SLAs
   [ ] API endpoints match contracts exactly
   [ ] State mutations use locked store methods only
   [ ] No console.log() except debug tagged
   ```

---

### STEP 5: RECEIVE FILES FROM AGENT

When agent submits code, they will:

**A) Paste Full File Content** (if no git access)
```
---FILE: lib/particles/engine.ts---
[complete TypeScript code here]

---FILE: lib/particles/types.ts---
[complete type definitions here]

---FILE: lib/particles/hook.ts---
[complete React hook here]

---FILE: components/particles/ParticlePanel.tsx---
[complete React component here]

---FILE: tests/particles.test.ts---
[complete test suite here]

---PERFORMANCE_REPORT---
Metrics:
- Max particles: 1M GPU-accelerated
- FPS at 500K particles: 60 FPS
- Memory usage: 450MB
- Init time: 150ms
```

**B) Or provide GitHub link**
```
Branch: feature/particle-engine
Commit: abc123def456
Files: 8 files, 4,250 LOC
Tests: 1,050 LOC (70% coverage)
Status: ✅ All quality checks passed

Pull: git pull origin feature/particle-engine
```

**C) Or provide Gist link**
```
Gist: https://gist.github.com/agent/abc123
Files: 8 files (particle engine implementation)
Size: 4,250 LOC
Status: Ready to integrate
```

---

### STEP 6: WHERE TO PUT THE CODE

**Directory Structure:**

```
/vercel/share/v0-project/

├── lib/
│   ├── geometry/              ← Claude.A2 Geometry Engine
│   │   ├── engine.ts
│   │   ├── operations.ts
│   │   ├── svg.ts
│   │   └── types.ts
│   │
│   ├── animation/             ← Claude.A3 Animation System
│   │   ├── engine.ts
│   │   ├── timeline.ts
│   │   ├── keyframe.ts
│   │   └── types.ts
│   │
│   ├── particles/             ← New Agent - Particle Engine
│   │   ├── engine.ts
│   │   ├── emitter.ts
│   │   ├── types.ts
│   │   └── hook.ts
│   │
│   ├── export/                ← New Agent - Export Pipeline
│   │   ├── engine.ts
│   │   ├── formats.ts
│   │   ├── video.ts
│   │   ├── image.ts
│   │   └── types.ts
│   │
│   ├── assets/                ← New Agent - Asset Manager
│   │   ├── manager.ts
│   │   ├── search.ts
│   │   ├── cache.ts
│   │   └── types.ts
│   │
│   ├── collaboration/         ← New Agent - Collaboration
│   │   ├── websocket.ts
│   │   ├── ot.ts
│   │   ├── sync.ts
│   │   └── types.ts
│   │
│   ├── css-gen/               ← New Agent - CSS Animation Code Gen
│   │   ├── generator.ts
│   │   ├── frameworks.ts
│   │   ├── tailwind.ts
│   │   └── types.ts
│   │
│   ├── renderer/              ← Claude.A5 Viewport Renderer
│   │   ├── canvas.ts
│   │   ├── webgl.ts
│   │   ├── engine.ts
│   │   └── types.ts
│   │
│   └── hooks/
│       ├── useGeometry.ts
│       ├── useAnimation.ts
│       ├── useParticles.ts      ← New files from agents
│       ├── useExport.ts
│       ├── useAssets.ts
│       ├── useCollaboration.ts
│       └── useCSSGen.ts
│
├── components/
│   ├── editor/
│   │   ├── panels/
│   │   │   ├── GeometryPanel.tsx      ← Claude.A2
│   │   │   ├── AnimationPanel.tsx     ← Claude.A3
│   │   │   ├── ParticlesPanel.tsx     ← New Agent
│   │   │   ├── ExportPanel.tsx        ← New Agent
│   │   │   ├── AssetsPanel.tsx        ← New Agent
│   │   │   ├── CollaborationPanel.tsx ← New Agent
│   │   │   └── CSSGenPanel.tsx        ← New Agent
│   │   │
│   │   ├── Viewport.tsx               ← Claude.A5
│   │   └── EditorShell.tsx            ← V0.A1
│
├── python-service/
│   ├── routes/
│   │   ├── geometry.py        ← Claude.A2
│   │   ├── animation.py       ← Claude.A3
│   │   ├── ai.py              ← V0.A4
│   │   ├── particles.py       ← New Agent
│   │   ├── export.py          ← New Agent
│   │   ├── assets.py          ← New Agent
│   │   ├── collaboration.py   ← New Agent
│   │   └── css_gen.py         ← New Agent
│   │
│   └── services/
│       └── [corresponding services]
│
└── tests/
    ├── geometry.test.ts       ← Claude.A2 tests
    ├── animation.test.ts      ← Claude.A3 tests
    ├── particles.test.ts      ← New Agent tests
    ├── export.test.ts         ← New Agent tests
    ├── assets.test.ts         ← New Agent tests
    ├── collaboration.test.ts  ← New Agent tests
    └── css-gen.test.ts        ← New Agent tests
```

---

### STEP 7: INTEGRATE CODE

**When you receive files:**

1. **Create a new branch for this system:**
   ```bash
   git checkout -b feature/system-name
   ```

2. **Copy files to correct directories:**
   - Agent sends `engine.ts` → you put in `lib/system/engine.ts`
   - Agent sends `Panel.tsx` → you put in `components/editor/panels/SystemPanel.tsx`
   - Agent sends `types.ts` → you put in `lib/system/types.ts`
   - Agent sends tests → you put in `tests/system.test.ts`

3. **Update the store if needed:**
   - If system adds state, update `lib/store.ts`
   - Add new Zustand actions for this system
   - Post change in `communication_gate.md`

4. **Update types if needed:**
   - If system adds new types, update `lib/types.ts`
   - Ensure TypeScript compilation clean

5. **Test integration:**
   ```bash
   npm run dev        # Start dev server
   npm run test       # Run all tests
   npm run type-check # TypeScript check
   npm run lint       # ESLint check
   ```

6. **If everything passes:**
   ```bash
   git add .
   git commit -m "feat: Add system-name implementation

   [AgentName] Implements system-name with:
   - engine.ts (1200 LOC)
   - types.ts (300 LOC)
   - React components (2000 LOC)
   - Tests (1050 LOC, 70% coverage)
   
   All quality checks passed.
   Performance SLAs met.
   Closes: needs/0X_SYSTEM_NAME_NEEDS.md"
   
   git push origin feature/system-name
   ```

7. **Merge to main:**
   ```bash
   git checkout main
   git pull
   git merge feature/system-name
   git push
   ```

---

### STEP 8: TRACK SUBMISSIONS

Create a tracking file to monitor incoming code:

**File: `yellow_germ/AGENT_SUBMISSIONS.md`**

```markdown
# Agent Code Submissions Tracker

## Status: In Progress

| Agent | System | Status | Files | LOC | Tests | Date |
|-------|--------|--------|-------|-----|-------|------|
| Claude.A2 | Geometry Engine | ⏳ In Progress | - | - | - | - |
| Claude.A3 | Animation | ⏳ In Progress | - | - | - | - |
| V0.A4 | AI Integration | ⏳ In Progress | - | - | - | - |
| Claude.A5 | Viewport Renderer | ⏳ In Progress | - | - | - | - |
| TBD | Particle Engine | ⏳ Waiting | - | - | - | - |
| TBD | Export Pipeline | ⏳ Waiting | - | - | - | - |

## Completed Submissions

### Particle Engine (Example)
- Agent: Claude.A6
- Files: 8 files, 4,250 LOC
- Tests: 1,050 LOC (70% coverage)
- Submission Date: 2026-07-15
- Status: ✅ Merged
- Commit: abc123def456
- Branch: feature/particle-engine
- Notes: All quality checks passed, performance SLAs met

## Quality Gate Results

### Particle Engine Submission
```
✅ TypeScript: No errors
✅ ESLint: No warnings
✅ Tests: 1,050 LOC (70% coverage)
✅ JSDoc: All exports documented
✅ [AgentName] Tags: Present
✅ Performance: 60 FPS at 500K particles
✅ API Contracts: Match spec exactly
✅ State Management: Using locked store only
✅ No Console.log: Only debug tagged
```

## Incoming Code Format

### How Each Agent Submits

**Example Submission:**
```
[AGENT_NAME] CODE SUBMISSION - PARTICLE ENGINE

Needs File: 06_PARTICLE_ENGINE_NEEDS.md
Status: ✅ COMPLETE

Summary:
- 4,250 LOC total
- 1,050 LOC tests (70% coverage)
- GPU particles: 1M+ concurrent
- Performance: 60 FPS @ 500K particles

Files Created:
✅ lib/particles/engine.ts (1200 LOC)
✅ lib/particles/emitter.ts (950 LOC)
✅ lib/particles/types.ts (400 LOC)
✅ lib/particles/hook.ts (300 LOC)
✅ components/particles/ParticlePanel.tsx (800 LOC)
✅ tests/particles.test.ts (1,050 LOC)

Quality Checklist: ✅ ALL PASSED

Code follows all standards. Ready to integrate.
```

---

## Submission Timeline Template

Use this to track when agents submit:

```markdown
# Code Submission Timeline

## Week 1 (Initial 4 Core Agents)
- [ ] Claude.A2 Geometry Engine - Expected: Day 3
- [ ] Claude.A3 Animation System - Expected: Day 3
- [ ] V0.A4 AI Integration - Expected: Day 4
- [ ] Claude.A5 Viewport Renderer - Expected: Day 4

## Week 2 (Additional Agents Join)
- [ ] Agent X Particle Engine - Expected: Day 7
- [ ] Agent Y Export Pipeline - Expected: Day 7
- [ ] Agent Z Asset Manager - Expected: Day 8

## Week 3 (Remaining Systems)
- [ ] Agent A Collaboration - Expected: Day 12
- [ ] Agent B CSS Generation - Expected: Day 12
- [ ] Agent C Security/Auth - Expected: Day 13
- [ ] Agent D UI Components - Expected: Day 13
- [ ] Agent E Mobile/Responsive - Expected: Day 14
- [ ] Agent F Advanced AI - Expected: Day 15

## Integration & Testing
- [ ] All code merged to main
- [ ] Full integration tests
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Deployment ready
```

---

## File Naming Convention for Submissions

When agents send code, use this naming:

**For Frontend Files:**
```
lib/[system]/
  ├── engine.ts           # Main business logic
  ├── types.ts            # TypeScript types
  ├── hook.ts             # React hook export
  ├── utils.ts            # Helper functions (if needed)
  └── constants.ts        # Constants (if needed)

components/[system]/
  ├── Panel.tsx           # Main UI panel
  ├── Dialog.tsx          # Modals (if needed)
  └── Toolbar.tsx         # Toolbars (if needed)

tests/
  └── [system].test.ts    # All tests
```

**For Backend Files:**
```
python-service/
  ├── routes/[system].py
  ├── services/[system]/
  │   ├── engine.py
  │   ├── utils.py
  │   └── __init__.py
  └── tests/test_[system].py
```

---

## How You'll Know Code Is Ready

Agent submission message will include:

✅ **Status:** All systems READY
✅ **Quality:** All checks PASSED
✅ **Performance:** All SLAs MET
✅ **Tests:** 70%+ coverage
✅ **Types:** Zero TypeScript errors
✅ **Code:** Ready for production
✅ **Integration:** Follows contracts exactly

Then you:
1. Copy files to correct folders
2. Run tests & type checks
3. Commit to feature branch
4. Merge to main

---

## Summary: Code Reception Workflow

1. **You send:** Agent reads `needs/0X_SYSTEM_NEEDS.md`
2. **Agent builds:** Exactly matching spec
3. **Agent submits:** All code + tests + docs
4. **You receive:** Full implementation ready to integrate
5. **You test:** Run quality checks (they provide results)
6. **You integrate:** Copy files to right places
7. **You merge:** Branch → main
8. **System live:** Feature available in editor

**Total time per system:** ~2-4 hours from submission to live
**No friction:** Code is ready day one, all standards met
**No waiting:** All agents work in parallel

---

## Template: What Agent Submission Looks Like

```
[AGENT_NAME] FINAL SUBMISSION

System: [System Name]
Reference: yellow_germ/needs/0X_SYSTEM_NEEDS.md

IMPLEMENTATION COMPLETE ✅

Files Generated: 6 files
Total LOC: 4,250 (target: 3500-4500) ✅
Test LOC: 1,050 (70% coverage) ✅
Performance: All SLAs met ✅
Quality: All checks passed ✅

--- FILE 1: lib/system/engine.ts ---
[complete code here]

--- FILE 2: lib/system/types.ts ---
[complete code here]

--- FILE 3: lib/system/hook.ts ---
[complete code here]

--- FILE 4: components/system/Panel.tsx ---
[complete code here]

--- FILE 5: tests/system.test.ts ---
[complete code here]

QUALITY CHECKLIST RESULTS:
✅ TypeScript: No errors
✅ ESLint: No warnings
✅ Tests: 1050 LOC (70% coverage)
✅ JSDoc: All exports documented
✅ [AgentName] Tags: Present
✅ Performance: Benchmarks included
✅ API Contracts: Match exactly
✅ State: Locked store only
✅ Production Ready: YES

Ready to integrate. All standards met.
```

---

This is the complete workflow for how you'll receive and integrate code from all your agents.
