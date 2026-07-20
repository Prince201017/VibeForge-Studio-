# Mobile & Responsive Adaptation — ForgeOS

Implementation of `14_MOBILE_RESPONSIVE_NEEDS.md`. Delivers mobile-first
responsive layout, touch-optimized components, and gesture support for
the ForgeOS editor shell.

## File structure

```
lib/responsive/
├── breakpoints.ts   # breakpoint constants, device classification
├── hooks.ts         # useMediaQuery, useIsMobile/Tablet/Desktop, useViewportInfo,
│                     # usePrefersReducedMotion, useSafeAreaInsets, useIsTouchDevice,
│                     # useKeyboardVisible
├── gestures.ts       # usePinchZoom, useSwipe, useLongPress, useDoubleTap, useTwoFingerTap
└── styles.ts         # safe-area padding helpers, touch-target classes, cx(), clamp()

components/responsive/
├── SafeAreaView.tsx           # safe-area-aware padding container
├── TouchOptimizedButton.tsx   # 48px min target, ripple + haptic feedback
├── BottomSheet.tsx            # swipeable half/full sheet, backdrop close
├── FloatingActionButton.tsx   # corner FAB with speed-dial menu
├── MobileMenu.tsx             # hamburger + drawer, and BottomTabBar alternative
├── KeyboardAwareInput.tsx     # correct keyboard type, scroll-into-view, Enter-to-submit
└── ResponsiveLayout.tsx       # mobile/tablet/desktop layout switcher (the shell)

styles/
└── responsive.css   # ripple keyframes, reduced-motion, landscape, safe-area vars

index.ts             # the ONE public entrypoint — barrel-exports everything above
```

## Wiring it up

1. Import the stylesheet once at the app root, after Tailwind's base layer:

   ```ts
   import "styles/responsive.css";
   ```

2. Set the viewport meta tag in your document head (per spec section 10):

   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">
   ```

3. Render the editor shell through `ResponsiveLayout`:

   ```tsx
   import { ResponsiveLayout } from "@forgeos/mobile-responsive";

   <ResponsiveLayout
     topBar={<MobileMenu items={navItems} />}
     viewport={<Viewport />}
     leftPanel={<LayersPanel />}
     rightPanel={<PropertiesPanel />}
     bottomPanel={<Timeline />}
     mobileToolActions={[
       { id: "select", label: "Select", icon: <CursorIcon />, onSelect: selectTool },
       { id: "shape", label: "Shape", icon: <ShapeIcon />, onSelect: shapeTool },
     ]}
   />
   ```

   `ResponsiveLayout` reads live viewport width via `useViewportInfo()` and
   switches between the three layouts described in the spec's "Layout
   Variations" diagrams — no manual breakpoint checks needed at the call site.

## Design tokens

Components read color via CSS custom properties with fallbacks
(`var(--accent, #5b8def)`, `var(--surface, #1c1c1f)`, etc.) so they drop
into ForgeOS's existing theme without modification — set the real values
on `:root` (or a themed ancestor) and every component in this package
picks them up automatically.

## Notes on scope vs. the spec

- Gestures (`gestures.ts`) are implemented on native Pointer Events
  rather than pulling in `react-native-gesture-handler` or Hammer.js —
  those are meant for React Native / non-React-DOM contexts and are
  heavier than this surface area needs. If the broader ForgeOS frontend
  already standardizes on one of those for other systems (e.g. the
  Viewport Renderer), swap the internals of `gestures.ts` without
  changing its public hook signatures.
- Service-worker/offline support and image `srcset` generation
  (`buildResponsiveImageAttrs` in `styles.ts`) are provided as
  utilities; wiring an actual service worker is an app-shell-level
  decision that depends on the build tool (Vite PWA plugin, Next PWA,
  etc.) and isn't opinionated here.
- All interactive components target WCAG 2.1 AA: 48px touch targets,
  visible focus rings via `:focus-visible`, `aria-*` attributes on
  drawers/sheets/menus, and full `prefers-reduced-motion` compliance.
