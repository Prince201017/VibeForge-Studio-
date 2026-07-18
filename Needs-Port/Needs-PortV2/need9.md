# NEED 9: CSS/FRONTEND ANIMATION CODE GENERATION - Visual Code Export

## System Overview
Generate production-ready CSS, HTML, and framework-specific animation code from visual editor. Supports 6+ frameworks and pure CSS/HTML.

## What Goes In This System
- Visual to code translation
- CSS animation generation
- React component generation (with animation libraries)
- Vue composition generation
- Svelte animation generation
- HTML + CSS-only export
- JavaScript animation export
- Code minification and optimization

## Files to Create
- `lib/codegen/engine.ts` - Code generation engine
- `lib/codegen/css-generator.ts` - CSS animations
- `lib/codegen/react-generator.ts` - React code
- `lib/codegen/vue-generator.ts` - Vue code
- `lib/codegen/svelte-generator.ts` - Svelte code
- `lib/codegen/html-generator.ts` - HTML + CSS
- `lib/codegen/formatter.ts` - Code formatting
- `lib/codegen/types.ts` - Type definitions
- `python-service/routes/codegen.py` - CodeGen API
- `components/codegen/CodePreview.tsx` - Preview panel
- `tests/codegen.test.ts` - Tests (70%+ coverage)

## LOC Target: 3000-3500 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: < 500ms code generation

## Code Export Targets

### CSS-only
1. Pure CSS animations (@keyframes)
2. Tailwind CSS classes
3. SCSS with variables
4. CSS Modules
5. CSS-in-JS (styled-components, Emotion)

### React
6. React + Framer Motion (most popular)
7. React + GSAP (complex animations)
8. React + Motion One (lightweight)
9. React + Anime.js

### Other Frameworks
10. Vue + GSAP
11. Svelte with store animations
12. HTML + Canvas API
13. HTML + Three.js

### Special Exports
14. SVG with SMIL animations
15. SVG with CSS animations
16. Web Animations API
17. Canvas animation code

## Features Required
1. Visual editor → clean code
2. Component extraction
3. Variable extraction (colors, timing, etc)
4. Responsive breakpoints
5. Media queries
6. Accessibility (ARIA, labels)
7. Performance optimization
8. Tree-shaking ready
9. Type-safe (TypeScript output)
10. JSDoc comments
11. ESLint compliant
12. Prettier formatted

## CSS Generation Features
- CSS variables for colors, timings
- Animation composition
- Delay sequences
- Stagger patterns
- Cubic bezier curves
- Spring physics (where applicable)
- Reduced motion support
- Dark mode support

## React Generation Features
- Functional components
- Hooks (useState, useEffect)
- Props interface
- TypeScript types
- Props documentation
- Storybook-ready
- Theme support
- Performance optimized

## API Endpoints
- POST /api/codegen/generate - Generate code
- POST /api/codegen/format - Format code
- GET /api/codegen/templates - Get code templates
- POST /api/codegen/preview - Get preview
- GET /api/codegen/frameworks - Supported frameworks
- POST /api/codegen/validate - Validate generated code

## Code Quality
- ESLint rules applied
- Prettier formatting
- TypeScript strict mode (TypeScript output)
- No console.log statements
- No magic numbers
- Proper error handling
- No unused variables

## State Integration
Use Zustand store:
- `editorStore.getCodeGenOptions()`
- `editorStore.exportAsCode()`
- Track selected export framework
- Store generated code

## Example Output
```typescript
// React + Framer Motion example
import { motion } from 'framer-motion';

export const MyAnimation = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, easing: 'easeOut' }}
    >
      Content
    </motion.div>
  );
};
```

## Deliverables Checklist
- CSS generation working
- React generation working
- Vue generation working
- Svelte generation working
- HTML generation working
- Code formatting working
- Variable extraction working
- Component extraction working
- All frameworks supported
- Accessibility features working
- Performance optimization working
- Preview working
- All API endpoints working
- All tests passing
- JSDoc complete
