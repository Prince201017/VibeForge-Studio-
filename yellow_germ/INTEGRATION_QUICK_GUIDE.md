# Quick Integration Guide for Agent Code

## When You Receive Code From An Agent

### COPY & PASTE FILES

**Agent sends you files.** You receive content like this:

```
--- FILE: lib/particles/engine.ts ---
export class ParticleEngine {
  // all code here
}
```

**What you do:**

1. Create file: `/vercel/share/v0-project/lib/particles/engine.ts`
2. Paste content (everything between the markers)
3. Repeat for each file agent sends

### DIRECTORY CHECKLIST

Use this checklist when integrating each agent's code:

**Frontend (React/TypeScript):**
- [ ] `lib/[system]/engine.ts` exists
- [ ] `lib/[system]/types.ts` exists
- [ ] `lib/[system]/hook.ts` exists
- [ ] `components/[system]/[Panel].tsx` exists
- [ ] `tests/[system].test.ts` exists

**Backend (Python):**
- [ ] `python-service/routes/[system].py` exists
- [ ] `python-service/services/[system]/` folder exists
- [ ] `python-service/tests/test_[system].py` exists

**Documentation:**
- [ ] JSDoc on all exports
- [ ] [AgentName] tags present
- [ ] README in folder if complex

### RUN QUALITY CHECKS

After pasting all files:

```bash
# 1. Check TypeScript compiles
npm run type-check
# Should show: ✅ No errors

# 2. Run tests
npm run test
# Should show: ✅ All tests pass (70%+ coverage)

# 3. Check lint
npm run lint
# Should show: ✅ No warnings

# 4. Start dev server
npm run dev
# Should show: ✅ Ready on http://localhost:3000
```

### UPDATE STORE IF NEEDED

If agent added new state mutations:

1. Open `lib/store.ts`
2. Add new methods from agent's spec
3. Verify types match `lib/types.ts`
4. Test in browser that new state works

### COMMIT TO GIT

```bash
git checkout -b feature/system-name

git add lib/[system]/ \
        components/[system]/ \
        tests/[system].test.ts \
        python-service/routes/[system].py

git commit -m "feat: Add [system-name] from [AgentName]

Complete implementation of [system].
- [feature 1]
- [feature 2]
- [feature 3]

All quality checks passed.
Performance SLAs met.
Tests: 70%+ coverage"

git push origin feature/system-name
```

### MERGE TO MAIN

```bash
git checkout main
git pull origin main
git merge feature/system-name
git push origin main
```

---

## File Organization by System

### Particle Engine (Example)

**When agent sends:**
- engine.ts
- types.ts
- hook.ts
- ParticlePanel.tsx
- particles.test.ts

**You put in:**
- `lib/particles/engine.ts`
- `lib/particles/types.ts`
- `lib/particles/hook.ts`
- `components/particles/ParticlePanel.tsx`
- `tests/particles.test.ts`

### Export Pipeline (Example)

**When agent sends:**
- engine.ts
- formats.ts
- video.ts
- ExportPanel.tsx
- export.test.ts

**You put in:**
- `lib/export/engine.ts`
- `lib/export/formats.ts`
- `lib/export/video.ts`
- `components/editor/panels/ExportPanel.tsx`
- `tests/export.test.ts`

---

## Real-World Integration Example

### Step 1: Agent Submits Code

```
[Claude.A6] PARTICLE ENGINE SUBMISSION

All code ready. 6 files, 4,250 LOC.

---FILE: lib/particles/engine.ts---
export class ParticleEngine {
  private gpu: GPUDevice
  private particles: ParticleData[] = []
  
  constructor(canvas: HTMLCanvasElement) {
    this.gpu = initWebGPU(canvas)
  }
  
  // ... 1,200 more lines
}

---FILE: lib/particles/types.ts---
export interface ParticleData {
  position: Vec3
  velocity: Vec3
  // ... 300 more lines
}

---FILE: lib/particles/hook.ts---
export function useParticles() {
  // ... 200 lines
}

---FILE: components/particles/ParticlePanel.tsx---
export function ParticlePanel() {
  // ... 800 lines
}

---FILE: tests/particles.test.ts---
describe('ParticleEngine', () => {
  // ... 1,050 lines of tests
})

Quality: ✅ ALL PASSED
```

### Step 2: You Receive Files

You copy each file content to its location:

```bash
# File 1
cat > lib/particles/engine.ts << 'EOF'
export class ParticleEngine {
  ...
}
EOF

# File 2
cat > lib/particles/types.ts << 'EOF'
export interface ParticleData {
  ...
}
EOF

# And so on...
```

### Step 3: Run Quality Checks

```bash
npm run type-check  # ✅ All good
npm run test        # ✅ 70% coverage
npm run lint        # ✅ No warnings
npm run dev         # ✅ Ready
```

### Step 4: Commit

```bash
git add lib/particles components/particles tests/particles.test.ts
git commit -m "feat: Add particle engine from Claude.A6

GPU-accelerated particle system with 1M+ concurrent particles.
- ParticleEngine class with physics
- GPU compute pipeline
- React integration via useParticles hook
- UI panel for particle controls
- Full test coverage (70%+)

All quality standards met."
```

### Step 5: Done!

Your codebase now has the particle engine. Users can immediately use it via:

```tsx
import { useParticles } from '@/lib/particles/hook'

function MyComponent() {
  const particles = useParticles()
  particles.emit(1000) // emit 1000 particles
}
```

---

## File Paths Reference

Copy this table to avoid mistakes:

| System | Frontend Path | Component Path | Test Path | Backend Path |
|--------|--------------|---|---|---|
| Geometry | `lib/geometry/` | `components/editor/panels/GeometryPanel.tsx` | `tests/geometry.test.ts` | `routes/geometry.py` |
| Animation | `lib/animation/` | `components/editor/panels/AnimationPanel.tsx` | `tests/animation.test.ts` | `routes/animation.py` |
| Particles | `lib/particles/` | `components/particles/ParticlePanel.tsx` | `tests/particles.test.ts` | `routes/particles.py` |
| Export | `lib/export/` | `components/editor/panels/ExportPanel.tsx` | `tests/export.test.ts` | `routes/export.py` |
| Assets | `lib/assets/` | `components/editor/panels/AssetsPanel.tsx` | `tests/assets.test.ts` | `routes/assets.py` |
| Collab | `lib/collaboration/` | `components/editor/panels/CollaborationPanel.tsx` | `tests/collaboration.test.ts` | `routes/collaboration.py` |
| CSS Gen | `lib/css-gen/` | `components/editor/panels/CSSGenPanel.tsx` | `tests/css-gen.test.ts` | `routes/css_gen.py` |
| Security | `lib/auth/` | N/A (hooks only) | `tests/auth.test.ts` | `routes/auth.py` |
| UI Lib | `lib/ui/` | `components/ui/` | `tests/ui.test.ts` | N/A |
| Mobile | `lib/mobile/` | Already integrated | `tests/mobile.test.ts` | N/A |
| Advanced AI | `lib/ai/` | N/A (service only) | `tests/ai.test.ts` | `routes/ai.py` |

---

## Troubleshooting Integration

### Problem: "Module not found" error

**Cause:** File in wrong directory

**Fix:** Check path against table above, move file to correct location

### Problem: TypeScript errors after integration

**Cause:** Missing imports or type mismatches

**Fix:** 
1. Check agent used correct imports
2. Verify types in `lib/types.ts` match
3. Run `npm run type-check` to see exact error

### Problem: Tests failing after integration

**Cause:** Test setup issues or store mutations not imported

**Fix:**
1. Check test imports reference correct paths
2. Verify store methods exist in `lib/store.ts`
3. Run `npm test -- --verbose` to see details

### Problem: Visual/UI not appearing

**Cause:** Component not registered in EditorShell or panel missing

**Fix:**
1. Check component is in correct panel folder
2. Verify EditorShell imports the panel
3. Check layout CSS isn't hiding it

---

## Checklist Before Merging

Before you merge any agent's code to main:

- [ ] All files copied to correct directories
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with zero warnings
- [ ] Tests pass with 70%+ coverage
- [ ] Dev server starts without errors
- [ ] New feature works in browser (manual test)
- [ ] No console errors in browser
- [ ] Performance benchmarks included
- [ ] [AgentName] tags present in code
- [ ] JSDoc on all exports
- [ ] Git commit message references spec file

**Only after ALL checks:** `git push origin main`

---

## Quick Commands

Save these for easy integration:

```bash
# Check everything
npm run type-check && npm run lint && npm run test && npm run dev

# Type only
npm run type-check

# Lint only
npm run lint

# Test only
npm run test

# Test coverage
npm run test -- --coverage

# Start dev
npm run dev

# Build for production
npm run build

# Clean node_modules
rm -rf node_modules && npm install
```

---

## Summary

**When you receive code from agent:**

1. Copy files to correct directories (use table above)
2. Run: `npm run type-check && npm run lint && npm run test`
3. If all pass: commit + merge
4. Done! Feature is live

**That's it.** The agent does all the hard work. You just integrate.
