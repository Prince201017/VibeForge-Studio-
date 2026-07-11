# Yellow Germ - ForgeOS Specification Index

Master specification package for distributed parallel development. All agents must read this first.

**Distribution Date:** 2026-07-12
**Head:** V0.A1
**Status:** ACTIVE - Ready for agent pickup

## Folder Structure

```
yellow_germ/
├── 00_MASTER_INDEX.md (this file)
├── 01_ARCHITECTURE_REQUIREMENTS.md (system design, constraints, integration points)
├── specs/
│   ├── 02_CLAUDE_A2_GEOMETRY_ENGINE.md (Voronoi, boolean ops, SVG/Canvas)
│   ├── 03_CLAUDE_A3_ANIMATION_SYSTEM.md (Timeline, keyframes, graph editor)
│   ├── 04_V0_A4_AI_INTEGRATION.md (FastAPI, design generation, references)
│   └── 05_CLAUDE_A5_VIEWPORT_RENDERER.md (Canvas/WebGL rendering, export)
├── contracts/
│   ├── API_CONTRACT.md (REST endpoints, payload schemas)
│   ├── STATE_CONTRACT.md (Zustand store mutations, state shape)
│   └── TYPE_CONTRACTS.md (TypeScript interfaces all agents must honor)
├── schemas/
│   ├── GEOMETRY_SCHEMA.json (Geometry operation definitions)
│   ├── ANIMATION_SCHEMA.json (Keyframe & timeline structure)
│   ├── PARTICLE_SCHEMA.json (Particle system definitions)
│   └── PROJECT_SCHEMA.json (Full project data model)
├── templates/
│   ├── COMPONENT_TEMPLATE.tsx (React component boilerplate)
│   ├── HOOK_TEMPLATE.ts (Custom React hook pattern)
│   └── SERVICE_TEMPLATE.py (FastAPI service boilerplate)
└── checklists/
    ├── QUALITY_CHECKLIST.md (Code quality, testing, documentation)
    ├── INTEGRATION_CHECKLIST.md (Integration points before merging)
    └── DEPLOYMENT_CHECKLIST.md (Pre-release verification)
```

## Quick Start for Agents

### 1. Register Yourself
- Update `/vercel/share/v0-project/team_members.md`
- Create your own `<Name>.md` task log
- Comment in `communication_gate.md` confirming you're ready

### 2. Read Your Specification
- **Claude.A2:** Read `specs/02_CLAUDE_A2_GEOMETRY_ENGINE.md`
- **Claude.A3:** Read `specs/03_CLAUDE_A3_ANIMATION_SYSTEM.md`
- **V0.A4:** Read `specs/04_V0_A4_AI_INTEGRATION.md`
- **Claude.A5:** Read `specs/05_CLAUDE_A5_VIEWPORT_RENDERER.md`

### 3. Reference Contracts & Schemas
- Read `contracts/API_CONTRACT.md` for endpoint requirements
- Read `contracts/STATE_CONTRACT.md` for state mutations
- Read `contracts/TYPE_CONTRACTS.md` for TypeScript interfaces
- Reference schema files in `schemas/` for data structures

### 4. Start Development
- Use templates from `templates/` as starting points
- Follow the **Strict Code Standards** in your spec
- Tag all code with your agent name: `// [YourName] description`
- Log every action in your `.md` task file with timestamp
- Post blockers in `communication_gate.md` immediately

### 5. Quality Assurance
- Run through `QUALITY_CHECKLIST.md` before pushing
- Verify all integration points with `INTEGRATION_CHECKLIST.md`
- All code must be production-ready on first submission

---

## Core Principles

1. **Strict Specifications** — No improvisation. Follow your spec exactly.
2. **Type Safety** — All TypeScript must be strict mode. No `any` types.
3. **Code Comments** — Tag every function/component with your agent name.
4. **Integration First** — Verify API contracts before writing code.
5. **Parallel Development** — Minimal blocking dependencies between agents.
6. **Performance** — Code must be optimized from day one (no tech debt).
7. **Documentation** — Every file, function, and exported symbol must be documented.
8. **Testing** — All public functions must have basic unit test coverage.

---

## Agent Assignments & LOC Targets

| Agent    | Task                          | Files       | LOC Target | Complexity | Due    |
|----------|-------------------------------|-------------|-----------|-----------|--------|
| Claude.A2 | Geometry Engine               | 12-15       | 3500-4500 | High      | Phase 1 |
| Claude.A3 | Animation & Timeline          | 10-12       | 3000-4000 | High      | Phase 1 |
| V0.A4    | AI Integration & FastAPI      | 15-20       | 4000-5000 | Very High | Phase 1 |
| Claude.A5 | Viewport Renderer             | 8-10        | 2500-3500 | High      | Phase 1 |

---

## Phase 1 Timeline (All Agents in Parallel)

- **Days 1-2:** Register, read specs, set up development environment
- **Days 2-4:** Implement core systems per specification
- **Day 4:** Integration testing and bug fixes
- **Day 5:** Final quality checks and deployment

---

## Communication Protocol

All issues, questions, and blockers must go through `communication_gate.md`:

```markdown
[TIMESTAMP] AgentName: @OtherAgent question/issue
[TIMESTAMP] OtherAgent: @AgentName response/solution
[TIMESTAMP] V0.A1: Confirmed, proceeding with approach X
```

**Do not work around issues silently.** Post immediately. Head will adjudicate.

---

## File Tagging Standard

Every code file must have this format at the top:

```typescript
/**
 * [AgentName] Module description
 * Purpose: What this file does
 * Dependencies: Other modules it imports
 * Exports: Public API surface
 * Tests: ./filename.test.ts
 */
```

Every function/component must be tagged:

```typescript
// [AgentName] Brief description of what it does
export function myFunction() { ... }
```

---

## Submission Requirements

When your implementation is complete:

1. **Push to Git** with clear commit message tagged with your name
2. **Post in communication_gate.md** with summary and link to commit
3. **Run quality checklist** and post results
4. **Await V0.A1 review** before moving to next task

Head will verify integration, merge to main, and coordinate next phase.

---

## Next Steps

1. Each agent reads their assigned spec file
2. Agents register in team_members.md
3. Post any clarification questions in communication_gate.md
4. Begin implementation immediately

**Head:** V0.A1 is monitoring. Full commitment to this timeline.

Questions? Post in communication_gate.md. Let's ship ForgeOS.
