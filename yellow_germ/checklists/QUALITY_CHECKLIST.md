# Quality Checklist - STRICT ENFORCEMENT

**Run this checklist before every commit. Any unchecked items = no merge.**

---

## Code Quality

- [ ] **TypeScript Strict Mode**
  - Run: `tsc --noEmit`
  - Result: Zero errors
  - No `any` types allowed
  - All imports resolved

- [ ] **ESLint Compliance**
  - Run: `npm run lint`
  - Result: Zero warnings (errors must be zero)
  - Check: All `[AgentName]` tags present
  - Check: No console.log() except debug tagged

- [ ] **Code Comments & Documentation**
  - Every exported function has JSDoc comment
  - Every component has file header with `[AgentName]`
  - Complex logic has inline comments
  - No commented-out code remaining

- [ ] **Formatting**
  - Run: `npm run format`
  - Result: All files properly formatted
  - Consistent indentation (2 spaces)
  - Line length < 100 characters (except URLs)

---

## Testing

- [ ] **Unit Test Coverage**
  - Run: `npm run test -- --coverage`
  - Target: Minimum 70% coverage
  - All public functions tested
  - Edge cases included

- [ ] **Test Quality**
  - Tests use meaningful names
  - Each test tests one thing
  - Assertions are specific (not just truthiness)
  - Mock data is realistic

- [ ] **Integration Tests**
  - API endpoints return correct formats
  - State mutations work correctly
  - Component integrations work
  - No console errors in tests

- [ ] **Performance Tests** (if applicable)
  - Operations complete within target time
  - No memory leaks detected
  - Performance benchmarks pass
  - Frame rate maintained (60 FPS for rendering)

---

## Type Safety

- [ ] **TypeScript Interfaces**
  - All types defined and exported in `types.ts`
  - No implicit `any` types
  - Strict null checking enabled
  - Readonly where appropriate

- [ ] **Type Contracts Honored**
  - Request/response types match API_CONTRACT.md
  - Geometry types match schemas
  - Animation types match timeline system
  - No type mismatches in store

---

## API Integration

- [ ] **Endpoint Contracts**
  - All requests match API_CONTRACT.md format
  - All responses include metadata
  - Error responses have proper error codes
  - Status codes are correct (200/400/500/etc)

- [ ] **Request Validation**
  - All inputs validated before use
  - Error messages are helpful
  - Validation errors return 422
  - Max request size enforced

- [ ] **Response Validation**
  - Response structure matches contract
  - All required fields present
  - No extra fields that break contract
  - Response size reasonable

---

## Performance

- [ ] **Time Targets Met** (specific to your task)
  - Geometry operations: < 500ms
  - Image analysis: < 2s
  - Animation render: < 3s
  - Viewport 60 FPS
  - No frame drops

- [ ] **Memory Usage**
  - No memory leaks detected
  - Memory profiler shows reasonable usage
  - Large datasets handled efficiently
  - Cleanup on unmount complete

- [ ] **Network**
  - Requests use compression
  - Payloads optimized
  - No unnecessary API calls
  - Connection timeouts handled

---

## React/Frontend Quality

- [ ] **Component Structure**
  - Single responsibility per component
  - Props properly typed with TypeScript
  - No prop drilling (max 2 levels)
  - Memoization used where needed

- [ ] **Hooks Usage**
  - Custom hooks extracted where needed
  - useEffect dependencies correct
  - No infinite loops
  - Cleanup functions present

- [ ] **State Management**
  - Uses Zustand for global state
  - Only store mutations via provided functions
  - History recorded for undo/redo
  - No direct state mutations

- [ ] **Accessibility**
  - ARIA labels present on interactive elements
  - Keyboard navigation works
  - Color contrast sufficient
  - Focus indicators visible

---

## Python/Backend Quality

- [ ] **Type Hints**
  - All functions have type hints
  - All parameters typed
  - Return types specified
  - No `Any` types without comment

- [ ] **Error Handling**
  - All exceptions caught
  - Custom exception types used
  - Error messages helpful
  - Logging includes context

- [ ] **Async Code**
  - Async/await used correctly
  - No race conditions
  - Timeouts implemented
  - Connection pooling used

- [ ] **Docstrings**
  - Google-style docstrings on all functions
  - Parameters documented
  - Return type documented
  - Raises documented

---

## Security

- [ ] **Input Validation**
  - All user inputs validated
  - File uploads checked (MIME, size)
  - SQL injection prevention (if applicable)
  - XSS prevention (if applicable)

- [ ] **Secrets Management**
  - No API keys in code
  - All secrets in environment variables
  - No secrets in git history
  - Rotation policy documented

- [ ] **Authentication** (if applicable)
  - Authorization checks in place
  - Session tokens validated
  - CORS headers correct
  - CSRF protection if needed

---

## Git & Version Control

- [ ] **Commit Quality**
  - Commit message is descriptive
  - Commit tagged with `[AgentName]`
  - One logical change per commit
  - No debug commits

- [ ] **Branch Management**
  - Working on feature branch (not main)
  - Branch name descriptive
  - Branch up-to-date with main
  - No merge conflicts

- [ ] **Files Changed**
  - Only relevant files modified
  - No accidental deletions
  - .gitignore respected
  - No temporary files committed

---

## Documentation

- [ ] **Code Documentation**
  - File headers with agent tags present
  - Function/class documentation complete
  - Complex algorithms explained
  - Edge cases documented

- [ ] **README Updates**
  - New features documented in README
  - Setup instructions updated if needed
  - API changes documented
  - Examples provided where helpful

- [ ] **Changelog**
  - Changes summarized for release notes
  - Breaking changes flagged
  - Migration guide if needed

---

## Deployment Ready

- [ ] **Build Verification**
  - `npm run build` completes without errors
  - No TypeScript errors
  - No bundle size regressions
  - Assets generated correctly

- [ ] **Environment Variables**
  - All required vars documented
  - .env.example updated
  - No missing variable errors
  - Defaults provided where safe

- [ ] **Database** (if applicable)
  - Schema migrations documented
  - Backward compatibility maintained
  - Rollback plan included
  - Data migration tested

---

## Agent-Specific Checks

### Claude.A2 (Geometry)
- [ ] All 15+ geometry operations tested
- [ ] SVG path handling robust
- [ ] Canvas rendering at 60 FPS
- [ ] Performance < 500ms target met
- [ ] Geometry types match contracts

### Claude.A3 (Animation)
- [ ] Timeline UI fully functional
- [ ] Keyframe interpolation accurate
- [ ] All easing curves working
- [ ] 60 FPS playback achieved
- [ ] Export formats working (CSS, GSAP, APNG)

### V0.A4 (AI)
- [ ] FastAPI endpoints responding
- [ ] Design generation producing valid output
- [ ] Image analysis returning insights
- [ ] Streaming SSE working smoothly
- [ ] Error handling comprehensive
- [ ] 70%+ test coverage

### Claude.A5 (Viewport)
- [ ] Canvas 2D rendering at 60 FPS
- [ ] WebGL rendering optimized
- [ ] Pan/zoom smooth
- [ ] Animation preview synchronized
- [ ] Export rendering functional
- [ ] No memory leaks

---

## Sign-Off

Before submitting for review, confirm:

```
Agent: [Your Name]
Task: [Your Task]
Date: [Today's Date]

✓ All items checked and passing
✓ No exceptions or workarounds
✓ Ready for production
```

---

## Submission Process

1. **Complete this checklist** — All items checked
2. **Run all tests** — 70%+ coverage minimum
3. **Commit to Git** — Tag with [AgentName]
4. **Post in communication_gate.md** — Link to commit + checklist summary
5. **Await V0.A1 review** — No merging until approved

**No shortcuts. No exceptions. This is production code.**
