# NEED 2: ANIMATION SYSTEM - Timeline Editor & Keyframing

## System Overview
Professional animation timeline with keyframe management, graph editor, easing curves, and animation playback at 60 FPS.

## What Goes In This System
- Timeline editor component (horizontal scrubber)
- Keyframe editor and management
- Graph editor for custom easing curves
- 25+ easing curve presets
- Animation playback engine
- Property keyframing (position, rotation, opacity, scale, etc)

## Files to Create
- `lib/animation/engine.ts` - Core animation engine
- `lib/animation/keyframe.ts` - Keyframe management
- `lib/animation/easing.ts` - Easing curves (25+ presets)
- `lib/animation/timeline.ts` - Timeline logic
- `lib/animation/types.ts` - Type definitions
- `lib/animation/hook.ts` - React hook (useAnimation)
- `components/animation/TimelineEditor.tsx` - Timeline UI
- `components/animation/GraphEditor.tsx` - Curve editor
- `components/animation/KeyframePanel.tsx` - Keyframe list
- `tests/animation.test.ts` - Tests (70%+ coverage)

## LOC Target: 3000-4000 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: 60 FPS (< 16ms per frame)

## Keyframeable Properties
- position (x, y)
- rotation (degrees/radians)
- scale (x, y)
- opacity (0-1)
- skew
- blur
- filters
- colors/gradients
- geometry parameters
- particle emitters

## Easing Curves (25+)
- Linear
- Ease in/out variations
- Cubic Bezier (custom)
- Spring physics
- Elastic curves
- Back curves
- Bounce curves
- Custom JavaScript expressions

## API Endpoints
- POST /api/animation/create
- POST /api/animation/update-keyframe
- POST /api/animation/preview
- POST /api/animation/export
- GET /api/animation/easing-curves

## State Integration
Use Zustand store:
- `editorStore.addKeyframe()`
- `editorStore.updateKeyframe()`
- `editorStore.deleteKeyframe()`
- `editorStore.playAnimation()`
- Update history for undo/redo
- Real-time viewport animation

## Deliverables Checklist
- Timeline editor with scrubber
- All 25+ easing curves working
- Graph editor for custom curves
- Keyframe editor with properties
- Animation playback (60 FPS)
- All keyframeable properties working
- Full undo/redo support
- All tests passing
- Performance benchmarks met
- JSDoc complete
