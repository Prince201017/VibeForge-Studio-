# CSS/Frontend Animation Engine Needs

## Scope
Visual creation system for production-ready CSS animations, HTML pages, and React components with Tailwind CSS, Styled Components, Framer Motion, GSAP, Motion One, and Anime.js code generation. Convert visual animations to copy-paste ready code.

## Target
- 3000-3500 LOC (frontend 1200 + backend 1800)
- Support 50+ CSS properties animation
- Export to 6+ frameworks
- Code generation with TypeScript support
- Responsive animation preview

## Core Systems Required

### 1. CSS Animation Builder (600 LOC Frontend)
- Timeline editor with CSS keyframe visualization
- Property selector (translate, rotate, scale, opacity, filter, etc.)
- Easing curve editor for @keyframes
- Timing control (duration, delay, iteration)
- Multiple animation tracks
- Timeline preview with full page context
- Mobile preview alongside desktop
- Animation speed scrubber

### 2. CSS Property Support (400 LOC)
- Transform: translate, rotate, skew, scale, matrix
- Opacity/color transitions
- Filter animations (blur, brightness, contrast, hue-rotate, saturate)
- Font properties (size, weight, letter-spacing)
- Box model (width, height, margin, padding)
- Border radius animation
- Box-shadow animation
- Text-shadow animation
- Clip-path animation
- Mask animation
- Backdrop-filter
- Border color/width
- Background position/size
- Linear/radial gradient animation

### 3. Easing Functions (300 LOC)
- Linear, ease-in, ease-out, ease-in-out
- Cubic-bezier custom curves
- Steps() function for frame-based
- Custom easing curve editor (visual Bézier editor)
- Spring easing (bounce, elastic)
- Power easing (quad, cubic, quart, quint)
- Back easing (ease-back-in-out)
- Elastic easing

### 4. CSS Code Generator (700 LOC Backend)
- Generate @keyframes rules
- Generate animation shorthand
- Generate media queries for responsive
- CSS Module format
- Tailwind CSS animation class generation
- Prefixed vendor support (-webkit-, -moz-, -ms-)
- CSS custom properties (CSS variables)
- Minification option
- Pretty-print option
- Source maps

### 5. HTML/CSS Export (500 LOC Backend)
- Generate complete HTML page
- Inline or external CSS
- Reset/normalize CSS included
- Meta tags for viewport
- Base styling setup
- Ready-to-run HTML file
- Self-contained package

### 6. Styled Components Export (400 LOC Backend)
- Generate Styled Components code (JavaScript)
- TypeScript definitions
- Prop-based animation variants
- Responsive variants
- Pseudo-state animations (:hover, :focus, etc.)
- Media query integration
- Theme support

### 7. Framer Motion Export (500 LOC Backend)
- Generate React component with Framer Motion
- Animate prop generation
- Variants structure
- Initial/exit states
- Layout animations
- Gesture animation (whileHover, whileTap)
- useAnimation hook setup
- Controls export

### 8. GSAP Export (500 LOC Backend)
- Generate GSAP timeline code
- .to(), .from(), .fromTo() methods
- Timeline chaining
- Stagger effects
- ScrollTrigger integration
- MotionPath plugin
- Ease function mapping
- Complete working code

### 9. Motion One Export (400 LOC Backend)
- Generate Motion One animation code
- animate() function
- sequence() for animations
- SVG animation support
- Exit animations
- Spring physics

### 10. Anime.js Export (400 LOC Backend)
- Generate Anime.js animation code
- timeline() structure
- Property targeting
- Stagger configuration
- Complete working example

### 11. Web Animation API Export (300 LOC Backend)
- Generate native JavaScript animation
- Element.animate() API
- Keyframes object format
- Animation options
- Multiple animations composition
- No dependencies code

### 12. Interactive Preview (500 LOC Frontend)
- Live animation preview in viewport
- Speed control (0.1x to 2x)
- Pause/play/resume
- Step through frames (scrubber)
- Loop toggle
- Show bounding boxes
- Show animation paths
- Measure timing visually

### 13. Responsive Animation (300 LOC)
- Breakpoint definitions
- Different animations per breakpoint
- Mobile-first approach
- Media query generation
- Container query support

### 14. Advanced Effects (400 LOC Frontend + Backend)
- Glassmorphism (blur, backdrop-filter)
- Neumorphism (shadow)
- Liquid morphing (SVG morphing)
- Magnetic cursor effects
- Parallax scrolling
- Scroll-triggered animations
- Hover effects library
- Micro-interactions (button press, toggle, etc.)

### 15. Component Library (300 LOC)
- Pre-built animation patterns
- Button animations (hover, press, loading)
- Card animations (flip, slide, expand)
- Menu animations (slide, fade)
- Modal animations (appear, disappear)
- Loader animations (spinner, pulse, bounce)
- Transition animations (page load)
- Notification animations (toast, slide)

### 16. Performance Optimization (300 LOC)
- GPU-accelerated properties only (transform, opacity)
- Will-change hints generation
- Performance recommendations
- Bundle size analysis
- CSS file size calculator
- Duplicate animation detection
- Code optimization suggestions

### 17. Testing & Documentation (300 LOC)
- Unit tests for code generators
- Integration tests for each framework
- Generated code validation
- Browser compatibility tests
- Performance benchmarks
- Documentation for each export format

## File Structure

### Frontend (1200 LOC)
```
components/css-animation/
├── CSSAnimationEditor.tsx (main component)
├── PropertySelector.tsx (which properties to animate)
├── EasingEditor.tsx (Bézier curve editor)
├── TimelineEditor.tsx (CSS timeline)
├── CodeGenerator.tsx (framework selector)
├── GeneratedCodePreview.tsx (show generated code)
├── LivePreview.tsx (animation preview)
├── FrameworkSelector.tsx (CSS, Tailwind, Styled, Framer, GSAP)
├── ExportDialog.tsx (download code)
└── ResponsivePreview.tsx (mobile/tablet/desktop)

lib/css-animation/
├── css-generator.ts (CSS @keyframes)
├── easing.ts (easing functions + curves)
├── properties.ts (animatable properties)
├── types.ts (CSSAnimation interface)
├── hooks.ts (useCSSAnimation, useCodeGen)
└── store.ts (Zustand for animation state)
```

### Backend (1800 LOC)
```
python-service/routes/
└── css_animation.py (code generation endpoints)

python-service/services/
├── css_generator.py (CSS @keyframes)
├── html_generator.py (HTML page generation)
├── styled_components_gen.py (Styled Components)
├── framer_motion_gen.py (Framer Motion React)
├── gsap_generator.py (GSAP code)
├── motion_one_generator.py (Motion One)
├── anime_js_generator.py (Anime.js)
├── web_animation_gen.py (Web Animation API)
├── easing_calculator.py (easing timing)
└── code_formatter.py (prettier integration)

python-service/templates/
├── html_template.jinja2
├── styled_component.jinja2
├── framer_motion.jinja2
├── gsap_template.jinja2
├── motion_one.jinja2
├── anime_js.jinja2
└── web_animation.jinja2
```

## Supported CSS Properties

### Transform
- translateX, translateY, translateZ, translate3d
- rotateX, rotateY, rotateZ, rotate3d
- scaleX, scaleY, scaleZ, scale3d
- skewX, skewY
- perspective

### Opacity & Colors
- opacity
- color, backgroundColor
- borderColor
- textColor

### Filters
- blur, brightness, contrast
- dropShadow, grayscale, hueRotate
- invert, opacity (filter), saturate, sepia

### Geometry
- width, height, maxWidth, maxHeight
- borderRadius
- borderWidth

### Shadows & Effects
- boxShadow, textShadow
- backdropFilter
- filter

### Advanced
- clipPath
- mask, maskImage
- linearGradient, radialGradient (animated positions)
- backgroundSize, backgroundPosition

## Export Format Specifications

### Pure CSS
```css
@keyframes slide {
  from { transform: translateX(0); }
  to { transform: translateX(100px); }
}
.element { animation: slide 1s ease-in-out; }
```

### Tailwind CSS
```tsx
<div className="animate-slide"></div>
// tailwind.config.js extends animation
```

### Styled Components
```tsx
const Animated = styled.div`
  animation: ${keyframes} 1s ease-in-out;
`;
```

### Framer Motion
```tsx
<motion.div animate={{ x: 100 }} transition={{ duration: 1 }} />
```

### GSAP
```js
gsap.to(element, { x: 100, duration: 1, ease: "power2.inOut" });
```

## Performance Targets (Hard SLAs)
- Code generation: < 200ms
- CSS parsing: < 100ms
- Live preview: 60 FPS
- Animation playback: < 16ms per frame
- Generated code size: < 50KB for typical animation

## API Endpoints Required
```
POST /api/css-animation/generate-css
- Payload: animation config
- Response: CSS code

POST /api/css-animation/generate-html
- Response: complete HTML file

POST /api/css-animation/generate-framer
- Response: React component code

POST /api/css-animation/generate-gsap
- Response: JavaScript with GSAP

GET /api/css-animation/presets
- Response: animation library
```

## Quality Standards
- 70%+ test coverage
- Generated code runs without errors
- CSS validation for all output
- Browser compatibility testing
- [AgentName] tags mandatory
- Performance benchmarks

## Integration Points
- Export animations to CSS/HTML/React/GSAP
- Copy generated code to clipboard
- Import preset animations
- Track animation timeline in project
- Sync with geometry/particle animations

## Constraints
- Max animation duration: 10 minutes
- Max properties per animation: 50
- CSS file size limit: 5MB
- Browser support: last 2 versions
