# CSS/Frontend Animation Engine — Implementation

Built from `10_CSS_FRONTEND_ANIMATION_NEEDS.md`, per the assignment in `INDEX.md`
(unassigned system #10, "CSS Animation Code Gen").

## Honest scope note

The spec's 3000–3500 LOC target is a *padding estimate*, not a quality bar. I
built a real, working, tested implementation of the core engine — every
export format runs and is verified by the test suite — rather than inflating
line counts with boilerplate. Some spec items (Interactive Preview's
frame-scrubber, mobile/tablet/desktop side-by-side `ResponsivePreview.tsx`,
`ExportDialog.tsx`, code minifier/prettier integration, SVG morphing) are
stubbed or omitted; see "Not built" below. Extend from this skeleton rather
than treating it as feature-complete.

## What's implemented and tested

**Frontend** (`frontend/`)
- `lib/css-animation/types.ts` — full type contract (AnimationConfig, tracks, easing, timing, export request/response)
- `lib/css-animation/easing.ts` — cubic-bezier math, elastic/bounce/step evaluators, CSS/GSAP/Framer serializers
- `lib/css-animation/properties.ts` — registry of 40 animatable properties (transform, filter, box model, shadows, clip-path, mask, gradients) with GPU-acceleration flags
- `lib/css-animation/css-generator.ts` — client-side `@keyframes` generator for instant preview
- `lib/css-animation/store.ts` — Zustand store with undo/redo
- `lib/css-animation/hooks.ts` — `useCSSAnimation` (rAF playback/scrubbing) and `useCodeGen` (backend fetch)
- `components/css-animation/EasingEditor.tsx` — draggable SVG Bézier curve editor + preset library
- `components/css-animation/LivePreview.tsx` — play/pause/scrub/speed preview with real keyframe interpolation
- `components/css-animation/CSSAnimationEditor.tsx` — main shell wiring tracks, timing, framework tabs, code panel

**Backend** (`backend/`) — all verified by `backend/tests/test_generators.py` (11/11 passing)
- `services/css_generator.py` — `@keyframes`, animation shorthand, vendor prefixes, minification, media queries, Tailwind config
- `services/html_generator.py` — self-contained runnable HTML page with reset CSS and trigger wiring (load/click/inView)
- `services/styled_components_gen.py` — TS-typed styled-component with hover pseudo-state
- `services/framer_motion_gen.py` — React + Framer Motion component (load/hover/tap/inView variants)
- `services/gsap_generator.py` — `gsap.fromTo`, stagger, ScrollTrigger, timeline chaining
- `services/motion_one_generator.py` — `animate()` call
- `services/anime_js_generator.py` — `anime()` call with stagger
- `services/web_animation_gen.py` — dependency-free `Element.animate()`
- `services/easing_calculator.py` — Python port of the easing math, single source of truth for exports
- `routes/css_animation.py` — FastAPI router, Pydantic-validated, enforces the spec's hard limits (10-min max duration, 50-property cap)

## Not built (be aware before treating this as done)
- `PropertySelector.tsx` / `TimelineEditor.tsx` / `FrameworkSelector.tsx` / `ExportDialog.tsx` / `ResponsivePreview.tsx` as separate files — their functionality is inlined into `CSSAnimationEditor.tsx` rather than split out
- `GeneratedCodePreview.tsx` — inlined as the right-hand panel in the editor shell
- Prettier/code-formatter integration (`code_formatter.py`)
- SVG liquid-morphing, magnetic cursor, parallax scroll effects (Advanced Effects section)
- Component Library presets (button/card/menu/modal/loader patterns) — only a 5-item preset stub exists in `/presets`
- Source maps
- Container query support

## Run the tests
```bash
cd css-animation-engine
python3 -m pytest backend/tests/test_generators.py -v
# or, if pytest isn't installed:
python3 -c "import backend.tests.test_generators as t, inspect; [f() for n,f in inspect.getmembers(t, inspect.isfunction) if n.startswith('test_')]"
```

## Wire it up
- Mount `router` from `backend/routes/css_animation.py` into your FastAPI app: `app.include_router(router)`
- Drop `components/css-animation/CSSAnimationEditor.tsx` into a Next.js/React page; it's self-contained aside from the `zustand` peer dependency
