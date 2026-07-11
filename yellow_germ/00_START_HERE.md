# START HERE - Complete Yellow Germ Guide

## For You (Project Head)

You asked: **Where do I get code from agents and where do I put it?**

### Answer

**GET CODE:**
- Read: `AGENT_SUBMISSION_WORKFLOW.md` (How agents submit)
- Read: `EXAMPLE_AGENT_SUBMISSION.md` (Real example)
- Agents paste files into your conversation

**PUT CODE:**
- Read: `INTEGRATION_QUICK_GUIDE.md` (Quick reference)
- Copy files to directories in table below
- Run quality checks
- Merge to main

### Quick Directory Map

Use this when you receive code:

| System | Where Files Go | Example |
|--------|---|---|
| **lib/** | `lib/system/engine.ts` | `lib/particles/engine.ts` |
| **React Components** | `components/system/Panel.tsx` | `components/particles/ParticlePanel.tsx` |
| **Tests** | `tests/system.test.ts` | `tests/particles.test.ts` |
| **Python Backend** | `python-service/routes/system.py` | `python-service/routes/particles.py` |

### Integration Checklist

When you receive code from any agent:

```
□ Copy files to correct directories (use map above)
□ Run: npm run type-check (should pass)
□ Run: npm run lint (should pass)
□ Run: npm run test (should pass, 70%+ coverage)
□ Update lib/store.ts if new state added
□ Update components/editor/EditorShell.tsx if new panel
□ Commit: git commit -m "feat: Add [system]"
□ Push: git push origin main
```

Done! Feature is live.

---

## Yellow Germ Files Organization

```
yellow_germ/
├── 00_START_HERE.md                    ← YOU ARE HERE
├── 00_MASTER_INDEX.md                  ← Navigation for all docs
├── 01_ARCHITECTURE_REQUIREMENTS.md     ← System design (context)
├── AGENT_SUBMISSION_WORKFLOW.md        ← HOW AGENTS SUBMIT
├── INTEGRATION_QUICK_GUIDE.md          ← WHERE TO PUT CODE
├── EXAMPLE_AGENT_SUBMISSION.md         ← REAL EXAMPLE
│
├── specs/                              ← Specs for assigned agents
│   ├── 02_CLAUDE_A2_GEOMETRY_ENGINE.md
│   ├── 03_CLAUDE_A3_ANIMATION_SYSTEM.md
│   ├── 04_V0_A4_AI_INTEGRATION.md
│   └── 05_CLAUDE_A5_VIEWPORT_RENDERER.md
│
├── needs/                              ← Specs for unassigned systems (needs.md files)
│   ├── 06_PARTICLE_ENGINE_NEEDS.md
│   ├── 07_EXPORT_PIPELINE_NEEDS.md
│   ├── 08_ASSET_MANAGER_NEEDS.md
│   ├── 09_COLLABORATION_NEEDS.md
│   ├── 10_CSS_FRONTEND_ANIMATION_NEEDS.md
│   ├── 11_DATABASE_SCHEMA_NEEDS.md
│   ├── 12_SECURITY_AUTH_NEEDS.md
│   ├── 13_UI_COMPONENTS_LIBRARY_NEEDS.md
│   ├── 14_MOBILE_RESPONSIVE_NEEDS.md
│   ├── 15_ADVANCED_AI_ENGINE_NEEDS.md
│   └── INDEX.md
│
├── contracts/                          ← LOCKED (no changes)
│   ├── API_CONTRACT.md
│   ├── STATE_CONTRACT.md
│   └── TYPE_CONTRACTS.md (coming)
│
└── checklists/
    └── QUALITY_CHECKLIST.md
```

---

## Your Exact Workflow

### When You Get Code From An Agent

Agent posts in chat:
```
[Agent Name] CODE SUBMISSION - [System Name]

[Paste all files here]

Quality: ✅ ALL PASSED
```

### You Do This (3 Steps)

**Step 1: Copy Files**
```bash
# For each file agent sends, create it in right location
# Example for particle engine:
lib/particles/engine.ts          ← Agent sends "engine.ts"
lib/particles/types.ts           ← Agent sends "types.ts"
components/particles/Panel.tsx   ← Agent sends "Panel.tsx"
tests/particles.test.ts          ← Agent sends test file
```

**Step 2: Run Checks**
```bash
npm run type-check   # Should pass
npm run test         # Should pass (70%+ coverage)
npm run lint         # Should pass
npm run dev          # Should start
```

**Step 3: Merge**
```bash
git add .
git commit -m "feat: Add [system]"
git push origin main
```

Done! All 3 steps = ~15 minutes.

---

## What Files Do What

### For Understanding The Project
- `00_MASTER_INDEX.md` — Complete navigation
- `01_ARCHITECTURE_REQUIREMENTS.md` — System design & tech stack

### For Working With Agents
- `AGENT_SUBMISSION_WORKFLOW.md` — What agent will send you
- `EXAMPLE_AGENT_SUBMISSION.md` — Real example (read this first!)
- `INTEGRATION_QUICK_GUIDE.md` — Your quick reference

### For Agent Development
- `specs/02_CLAUDE_A2_*.md` — For assigned agents
- `needs/06_PARTICLE_ENGINE_*.md` — For new agents joining
- `contracts/API_CONTRACT.md` — What API must match
- `checklists/QUALITY_CHECKLIST.md` — Quality requirements

---

## The Complete Flow

```
1. YOU SEND AGENT THEIR NEEDS FILE
   ↓
   Agent reads: yellow_germ/needs/0X_SYSTEM_NEEDS.md
   
2. AGENT BUILDS SYSTEM
   ↓
   Agent writes code exactly matching spec
   Agent runs quality checks
   Agent prepares submission
   
3. AGENT SUBMITS CODE
   ↓
   Agent pastes: All files + summary
   
4. YOU RECEIVE CODE
   ↓
   You read: AGENT_SUBMISSION_WORKFLOW.md
   You see: EXAMPLE_AGENT_SUBMISSION.md
   
5. YOU INTEGRATE CODE
   ↓
   Copy files (use: INTEGRATION_QUICK_GUIDE.md)
   Run checks
   Merge to main
   
6. FEATURE LIVE ✅
```

---

## File Paths At A Glance

When you receive code, use this reference:

**Frontend Code Goes Here:**
```
lib/[system]/engine.ts          ← Main system logic
lib/[system]/types.ts           ← TypeScript types
lib/[system]/hook.ts            ← React hook
components/[system]/Panel.tsx   ← UI panel
tests/[system].test.ts          ← Tests
```

**Backend Code Goes Here:**
```
python-service/routes/[system].py
python-service/services/[system]/
```

**Store Updates Go Here:**
```
lib/store.ts                    ← New state + mutations
```

**Shell Updates Go Here:**
```
components/editor/EditorShell.tsx   ← Import new panel
```

---

## Quality Checklist (Do This Before Merging)

Agent will say quality passed. You verify:

```
Before merge, confirm:
✅ TypeScript: npm run type-check (0 errors)
✅ Lint: npm run lint (0 warnings)
✅ Tests: npm run test (70%+ coverage, all pass)
✅ Dev: npm run dev (starts without errors)
✅ Manual: Check feature works in browser
```

If all pass → merge to main

If any fail → ask agent to fix

---

## Commands You'll Use

```bash
# Copy file from agent
cat > lib/system/engine.ts << 'EOF'
[paste agent's code here]
EOF

# Check everything
npm run type-check && npm run test && npm run lint && npm run dev

# Commit
git add .
git commit -m "feat: Add [system]"
git push origin main
```

---

## Key Files for Reference

Keep these bookmarked:

| File | Purpose | Read When |
|------|---------|-----------|
| `AGENT_SUBMISSION_WORKFLOW.md` | How agent sends code | Before 1st submission |
| `EXAMPLE_AGENT_SUBMISSION.md` | Real example | Understand the format |
| `INTEGRATION_QUICK_GUIDE.md` | Where files go | Integrating code |
| `contracts/API_CONTRACT.md` | API specs (locked) | Checking submissions |
| `contracts/STATE_CONTRACT.md` | State specs (locked) | Checking store updates |

---

## Expected Submission Format

Agent will send:

```
[AGENT_NAME] SYSTEM SUBMISSION

Files: 5 files, 4,250 LOC
Tests: 1,050 LOC (70% coverage)
Quality: ✅ ALL PASSED

--- FILE: lib/system/engine.ts ---
[code here]

--- FILE: lib/system/types.ts ---
[code here]

--- FILE: components/system/Panel.tsx ---
[code here]

[... more files ...]

--- FILE: tests/system.test.ts ---
[test code here]

Ready to integrate.
```

You then:
1. Copy each file to right directory
2. Run quality checks
3. Merge

---

## Summary

### Where to GET code:
- Agents paste files in chat
- Read: `AGENT_SUBMISSION_WORKFLOW.md`
- Reference: `EXAMPLE_AGENT_SUBMISSION.md`

### Where to PUT code:
- Use directory map (above)
- Reference: `INTEGRATION_QUICK_GUIDE.md`
- Quick: Copy 5 files to `lib/`, `components/`, `tests/`

### How to INTEGRATE:
- Run: `npm run type-check && npm run test`
- Update: `lib/store.ts` if needed
- Update: `components/editor/EditorShell.tsx` if new panel
- Commit & merge

### Total Time: 15-30 minutes per system

---

## Next Steps

1. **For 4 Assigned Agents:** Send them their `specs/0X_*.md` file
2. **For New Agents:** Send them their `needs/0X_*.md` file
3. **For Yourself:** Read `AGENT_SUBMISSION_WORKFLOW.md` + `EXAMPLE_AGENT_SUBMISSION.md`
4. **Wait:** Agents build systems (2-4 hours each)
5. **Receive:** Agent submits code
6. **Integrate:** Follow `INTEGRATION_QUICK_GUIDE.md` (15 min)
7. **Repeat:** For each agent submission

---

## Support

- Architecture questions? → Read `01_ARCHITECTURE_REQUIREMENTS.md`
- Don't understand submission format? → Read `EXAMPLE_AGENT_SUBMISSION.md`
- Don't know where file goes? → Check directory map above
- Tests failing? → Check `QUALITY_CHECKLIST.md`
- Agent questions? → Reference their specific `needs/0X_*.md` file

---

**YOU ARE READY.**

All systems specified.
All workflows documented.
All directories mapped.

Distribute needs files to agents.
Receive code.
Integrate using guides.

That's it. Let's build ForgeOS.
