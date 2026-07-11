# Mobile & Responsive Adaptation Needs

## Scope
Mobile-first responsive design for tablet and mobile devices. Optimized touch interface, adaptive layouts, and performance tuning for smaller screens.

## Target
- 1500-2000 LOC (frontend only)
- Desktop: 1920x1080 and up
- Tablet: iPad Pro 12.9", iPad Air 10.5", 7" tablets
- Mobile: iPhone 12, 13, 14, 15 (375-430px width)
- Touch-optimized interface (48px minimum touch targets)

## Responsive Breakpoints

```typescript
// Tailwind breakpoints
{
  sm: "640px",    // Small mobile (not used in our case, start at md)
  md: "768px",    // Tablets (iPad Air 10.5")
  lg: "1024px",   // Large tablets & small desktop
  xl: "1280px",   // Desktop
  "2xl": "1536px" // Large desktop
}
```

## Mobile-Specific Needs (1500-2000 LOC)

### 1. Mobile Menu & Navigation (400 LOC)
- Hamburger menu toggle
- Slide-out drawer navigation
- Bottom tab navigation (alternative layout)
- Touch-optimized menu items
- Swipe to close drawer
- No hover states (use focus instead)

### 2. Responsive Editor Layout (300 LOC)
- **Mobile Layout:**
  - Hide left/right panels by default
  - Single-column layout
  - Viewport takes full width
  - Bottom panel on tab
  - Floating action buttons for tools

- **Tablet Layout (768px+):**
  - Show left panel (layers) sidebar
  - Right panel visible if needed
  - Bottom panel below viewport
  - Resizable splitters work smoothly

- **Desktop Layout (1024px+):**
  - Full layout with all panels
  - Optimized spacing
  - Multi-pane editor

### 3. Touch-Optimized Controls (400 LOC)
- All buttons: 48x48px minimum
- Touch-optimized sliders
- Larger text input fields
- Bigger color pickers
- Tap-to-select instead of hover

### 4. Adaptive Panels (300 LOC)
- **Mobile:**
  - Layers panel: modal or bottom sheet
  - Properties panel: modal
  - Timeline: bottom drawer
  - Commands: full-screen search

- **Tablet:**
  - Layers: 250px sidebar (collapsible)
  - Properties: 300px side panel
  - Timeline: bottom drawer

- **Desktop:**
  - All panels visible with resizing

### 5. Bottom Sheet Component (250 LOC)
- Swipeable from bottom
- Half-screen and full-screen variants
- Smooth slide animation
- Backdrop tap to close
- Safe area insets (notch, home indicator)

```typescript
<BottomSheet isOpen={isOpen} onClose={onClose}>
  {/* content */}
</BottomSheet>
```

### 6. Floating Action Button (FAB) (150 LOC)
- Circular button in corner
- Speed dial expansion menu
- Labels for actions
- Keyboard shortcut hints
- Safe area positioning (avoid notch, home indicator)

### 7. Gesture Support (350 LOC)
- Two-finger pinch to zoom (viewport)
- Swipe left/right to switch tools
- Swipe up to open command palette
- Long-press for context menu
- Double-tap to focus
- Two-finger tap to undo

Implementation: React Gesture Handler or Hammer.js

### 8. Touch Feedback (200 LOC)
- Visual ripple effect on touch
- Haptic feedback (vibration) for actions
- Touch-specific loading states
- Visual scale-down on press
- Smooth transitions

### 9. Keyboard on Mobile (200 LOC)
- Dismiss keyboard after input
- Keyboard type optimization (number, email, etc.)
- Tab key navigation between inputs
- Return/Enter key handling
- Avoid covering input with keyboard

### 10. Viewport Optimization Mobile (300 LOC)
- Pinch-zoom enabled (scale=1 to 2)
- No auto-zoom on double-tap
- Hide browser UI when possible (fullscreen mode)
- Landscape and portrait support
- Safe viewport configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">
```

### 11. Performance for Mobile (300 LOC)
- Image optimization (srcset for different DPI)
- Lazy loading for off-screen elements
- CSS media queries for smaller builds
- Prefers-reduced-motion support
- Smaller initial bundle
- Service worker for offline capability

### 12. Safe Area Insets (150 LOC)
- Account for notch, home indicator, action bar
- Padding adjustments for safe zones
- CSS environment variables

```css
padding-bottom: max(1rem, env(safe-area-inset-bottom));
```

## Layout Variations

### Mobile (375-430px)
```
┌─────────────────┐
│  Hamburger | 🔍 │  <- Top bar with menu
├─────────────────┤
│                 │
│  Viewport Full  │
│     Width       │
│                 │
├─────────────────┤
│ 🔧 🎨 ✏️ 🚀     │  <- Tool tabs or FAB
└─────────────────┘
```

### Tablet (768px)
```
┌──────┬───────────────────┬──────┐
│      │                   │      │
│ Left │    Viewport       │Right │
│ 250px│                   │ 300px│
│      │                   │      │
└──────┴───────────────────┴──────┘
│─────────────────────────────────│
│  Timeline / Bottom Panel        │
└─────────────────────────────────┘
```

### Desktop (1280px+)
```
┌──────┬───────────────────────┬──────┐
│      │                       │      │
│ Left │    Viewport           │Right │
│ 280px│                       │ 320px│
│      │                       │      │
└──────┴───────────────────────┴──────┘
│─────────────────────────────────────│
│  Timeline / Bottom Panel            │
└─────────────────────────────────────┘
```

## Touch Targets

### Minimum Sizes
- Buttons: 48x48px
- Input fields: 44px height
- Menu items: 44px height
- Sliders: 48px track width, 20px handle
- Tap areas: 10-15px padding around

## Responsive Images

```html
<img 
  srcset="image-mobile.png 375w, image-tablet.png 768w, image-desktop.png 1280w"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1280px"
  src="image-desktop.png"
  alt="Description"
/>
```

## Media Query Helpers

```typescript
// lib/responsive.ts
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const useMediaQuery = (minWidth: number) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [minWidth]);
  return matches;
};
```

## Mobile-First CSS Strategy

```css
/* Mobile first (default) */
.panel {
  width: 100%;
  height: auto;
}

/* Tablet */
@media (min-width: 768px) {
  .panel {
    width: 300px;
    height: 100vh;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .panel {
    width: 320px;
  }
}
```

## Touch Gestures Implementation

```typescript
// lib/gestures.ts
import { GestureHandler } from 'react-native-gesture-handler';

export const usePinch = (onZoom: (scale: number) => void) => {
  // Pinch to zoom implementation
};

export const useSwipe = (onSwipeDirection: (dir: 'left'|'right'|'up'|'down') => void) => {
  // Swipe gesture detection
};

export const useLongPress = (onLongPress: () => void, duration = 500) => {
  // Long press detection
};
```

## File Structure
```
components/responsive/
├── MobileMenu.tsx (hamburger + drawer)
├── BottomSheet.tsx (bottom drawer)
├── FloatingActionButton.tsx (FAB)
├── ResponsiveLayout.tsx (layout switcher)
├── TouchOptimizedButton.tsx
└── SafeAreaView.tsx

lib/responsive/
├── hooks.ts (useMediaQuery, useIsMobile, etc.)
├── gestures.ts (pinch, swipe, long-press)
├── breakpoints.ts (constant breakpoint values)
└── styles.ts (responsive utility functions)

styles/responsive.css
└── Media query utilities
```

## Prefers-Reduced-Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Landscape Mode Support

```css
@media (orientation: landscape) and (max-height: 600px) {
  .viewport {
    max-height: 60vh;
  }
}
```

## Safe Area Padding Helper

```typescript
const getSafeAreaPadding = () => {
  return {
    top: 'max(1rem, env(safe-area-inset-top))',
    left: 'max(1rem, env(safe-area-inset-left))',
    right: 'max(1rem, env(safe-area-inset-right))',
    bottom: 'max(1rem, env(safe-area-inset-bottom))',
  };
};
```

## Performance Targets (Hard SLAs)
- Mobile viewport: 60 FPS
- Touch response: < 100ms
- Layout shift: CLS < 0.1
- Mobile LCP: < 2.5s
- Touch gesture recognition: < 200ms

## Testing Requirements
- Test on real devices (iPhone, iPad, Android)
- Visual regression tests for all breakpoints
- Gesture tests for touch interactions
- Accessibility tests (WCAG 2.1 AA)
- Performance profiling on 4G network
- Landscape/portrait rotation tests

## Quality Standards
- 100% responsive at all breakpoints
- All touch targets 48x48px minimum
- No horizontal scrolling
- Safe area insets handled
- Gesture feedback provided
- Keyboard-accessible on mobile
- Performance benchmarks met

## Deliverables
- Fully responsive layout
- Mobile-specific UI components
- Touch gesture support
- Responsive images
- Performance optimizations
- Comprehensive testing
