# CSS/Frontend Animation Engine — Implementation

Built from `10_CSS_FRONTEND_ANIMATION_NEEDS.md`, per the assignment in `INDEX.md`
(unassigned system #10, "CSS Animation Code Gen"). This revision closes out
every item flagged as missing in the first pass.

## Status: feature-complete against the spec

All 9 export targets, the full component file list from the spec's "File
Structure" section, and every "Additional/Advanced" subsystem (source maps,
code formatting, advanced effects, component library, performance analysis,
container queries) are now implemented. 31/31 backend tests pass.

## Frontend (`frontend/`)

`lib/css-animation/`
- `types.ts` — full type contract
- `easing.ts` — cubic-bezier math, elastic/bounce/step evaluators, CSS/GSAP/Framer serializers
- `properties.ts` — registry of 40 animatable properties with GPU-acceleration flags
- `css-generator.ts` — client-side `@keyframes` generator for instant preview
- `store.ts` — Zustand store with undo/redo
- `hooks.ts` — `useCSSAnimation` (rAF playback/scrubbing) and `useCodeGen` (backend fetch)

`components/css-animation/` — now fully split per the spec's file list:
- `CSSAnimationEditor.tsx` — shell that composes everything below
- `PropertySelector.tsx` — track list, grouped by transform/filter/other, add/remove/toggle
- `TimelineEditor.tsx` — multi-track horizontal timeline with draggable keyframe markers + scrubbing ruler
- `EasingEditor.tsx` — draggable SVG Bézier curve editor + preset library (power/back/elastic/bounce/steps)
- `LivePreview.tsx` — play/pause/scrub/speed preview with real keyframe interpolation
- `ResponsivePreview.tsx` — mobile/tablet/desktop viewports rendered side by side, resolving breakpoint overrides
- `FrameworkSelector.tsx` — tab bar for the 9 export targets
- `GeneratedCodePreview.tsx` — code panel with copy button and inline warnings
- `ExportDialog.tsx` — filename + download modal

## Backend (`backend/`) — all verified by `backend/tests/test_generators.py` (31/31 passing)

Code generators (`services/`):
- `css_generator.py` — `@keyframes`, animation shorthand, vendor prefixes, minification, media queries, **container queries**, Tailwind config
- `html_generator.py` — self-contained runnable HTML page with reset CSS and trigger wiring
- `styled_components_gen.py` — TS-typed styled-component with hover pseudo-state
- `framer_motion_gen.py` — React + Framer Motion component (load/hover/tap/inView variants)
- `gsap_generator.py` — `gsap.fromTo`, stagger, ScrollTrigger, timeline chaining
- `motion_one_generator.py` — `animate()` call
- `anime_js_generator.py` — `anime()` call with stagger
- `web_animation_gen.py` — dependency-free `Element.animate()`
- `easing_calculator.py` — Python port of the easing math, source of truth for exports

New in this pass:
- `code_formatter.py` — shells out to Prettier if available, falls back to a dependency-free pretty-printer; also exposes `minify_css`
- `source_maps.py` — hand-rolled Source Map v3 generator (VLQ/base64 encoding included), maps generated CSS lines back to the animation config
- `advanced_effects.py` — glassmorphism, neumorphism, magnetic cursor, parallax scroll, scroll-triggered reveal (+ IntersectionObserver), SVG liquid morph, micro-interactions (button press / toggle / checkbox check)
- `component_library.py` — 14 pre-built patterns across button/card/menu/modal/loader/transition/notification categories
- `performance_analyzer.py` — bundle-size check against the 5MB cap, GPU-vs-layout property analysis, `will-change` recommendation, and duplicate-animation detection via content fingerprinting across a project's configs

`routes/css_animation.py` — FastAPI router, Pydantic-validated, enforces the spec's hard limits (10-min max duration, 50-property cap). Endpoints:
- `POST /generate-{css,tailwind,html,styled,framer,gsap,motion-one,animejs,waapi}`
- `POST /generate-css-with-sourcemap`
- `POST /format`
- `POST /effects/{glassmorphism,neumorphism,magnetic-cursor,parallax,scroll-reveal,liquid-morph,micro-interaction}`
- `GET /component-library`, `GET /component-library/{id}`, `GET /component-library/category/{category}`
- `POST /analyze`, `POST /analyze/duplicates`
- `GET /presets`

## Still not built (small, deliberately deferred)
- Browser compatibility test matrix / automated cross-browser runs (needs real browsers, not scriptable here)
- Live perf benchmarking against the 60fps/16ms-per-frame SLAs (needs a real browser + profiler, not just code generation)
- WebGL/canvas-based bounding-box + path visualization beyond the current dashed-box overlay

## Run the tests
```bash
cd css-animation-engine
python3 -m pytest backend/tests/test_generators.py -v
# or without pytest installed:
python3 -c "import backend.tests.test_generators as t, inspect; [f() for n,f in inspect.getmembers(t, inspect.isfunction) if n.startswith('test_')]"
```

## Wire it up
- Mount `router` from `backend/routes/css_animation.py` into your FastAPI app: `app.include_router(router)`
- Drop `components/css-animation/CSSAnimationEditor.tsx` into a Next.js/React page; it's self-contained aside from the `zustand` peer dependency
