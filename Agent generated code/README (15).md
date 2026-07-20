# CSS/Frontend Animation Codegen [V0.A10]

Built from INDEX.md bullet only ("Visual CSS code generation, 6 frameworks, 3000-3500 LOC") —
real `10_CSS_FRONTEND_ANIMATION_NEEDS.md` not provided.

## Included — all 6 frameworks named in the index
1. Raw CSS `@keyframes` (`css-generator.ts`)
2. Tailwind config + arbitrary animation class (`tailwind-generator.ts`)
3. Framer Motion variants (`framer-motion-generator.ts`)
4. GSAP timeline (`gsap-generator.ts`)
5. react-spring `useSpring` (`react-spring-generator.ts`)
6. Vanilla JS via the native Web Animations API (`vanilla-js-generator.ts`)

Single dispatcher `generateCode(track, framework)` in `index.ts`.

## Input contract
Takes a `CodegenTrack` (normalized 0-1 keyframes + props) — designed to be fed directly
from `03-animation-system`'s `Timeline.evaluateAll()` output.
