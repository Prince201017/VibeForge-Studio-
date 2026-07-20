# Mobile/Responsive [V0.A13]

Built from INDEX.md bullet only ("Mobile/tablet/desktop layouts, touch, 1500-2000 LOC") —
real `14_MOBILE_RESPONSIVE_NEEDS.md` not provided.

## Included
- `breakpoints.ts` — mobile/tablet/desktop/wide breakpoints + `useBreakpoint()`/`useIsMobile()` hooks
- `touch-gestures.ts` — pinch-zoom/pan gesture handler feeding the viewport camera, plus
  tap-vs-drag disambiguation
- `responsive-layout.tsx` — layout switcher + WCAG-compliant min touch-target helper

## Test
Actual unit test for breakpoint classification (`tests/breakpoints.test.ts`).
