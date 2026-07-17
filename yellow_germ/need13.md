# NEED 13: MOBILE & RESPONSIVE DESIGN - Full Mobile Adaptation

## System Overview
Complete mobile-first responsive design with touch optimizations, mobile layouts, and adaptive UI for all screen sizes from 320px to 4K.

## What Goes In This System
- Mobile-first responsive layouts
- Touch gesture handling (swipe, pinch, long-press)
- Mobile-optimized UI components
- Adaptive navigation (hamburger menu on mobile)
- Safe area support (notches, etc)
- Bottom sheet components
- Mobile viewport optimization
- Breakpoint system

## Files to Create
- `lib/responsive/hooks.ts` - useResponsive, useBreakpoint hooks
- `lib/responsive/constants.ts` - Breakpoint definitions
- `lib/touch/gestures.ts` - Gesture recognition
- `lib/touch/hook.ts` - useGestures hook
- `components/mobile/MobileMenu.tsx` - Mobile navigation
- `components/mobile/BottomSheet.tsx` - Bottom sheet
- `components/mobile/SafeAreaProvider.tsx` - Safe area wrapper
- `components/mobile/TouchableOpacity.tsx` - Touch feedback
- `components/mobile/MobileViewport.tsx` - Mobile viewport
- `app/layout.tsx` - Responsive layout updates
- `styles/responsive.css` - Responsive utilities
- `tests/responsive.test.ts` - Tests (70%+ coverage)

## LOC Target: 1500-2000 lines

## Quality Standards
- 100% TypeScript strict mode
- 70% test coverage minimum
- JSDoc on all exports
- [AgentName] tags on functions
- Performance: smooth 60 FPS on mobile

## Breakpoints
```
xs: 320px   (very small phones)
sm: 480px   (small phones)
md: 768px   (tablets)
lg: 1024px  (small laptops)
xl: 1280px  (laptops)
2xl: 1536px (desktops)
3xl: 1920px (large displays)
4k: 2560px  (4K displays)
```

## Responsive Features
1. Flexible grid layouts
2. Responsive typography (scales with viewport)
3. Adaptive spacing
4. Touch-friendly UI (44x44px minimum)
5. Optimized images (srcset)
6. Hamburger menu on mobile
7. Bottom navigation on mobile
8. Stack layouts vertically on small screens
9. Collapsible panels on mobile
10. Full-screen modals on mobile

## Mobile-Specific Components
1. **MobileMenu** - Hamburger navigation
2. **BottomSheet** - Modal from bottom
3. **BottomNavigation** - Tab bar navigation
4. **SafeAreaProvider** - Handle notches/safe areas
5. **MobileViewport** - Mobile-optimized canvas
6. **TouchableOpacity** - Touch feedback component
7. **Drawer** - Slide-out drawer menu
8. **FullScreenModal** - Full-screen dialog

## Touch Gestures
- Tap (single click)
- Double tap (zoom on images)
- Long press (context menu)
- Swipe left/right (navigate)
- Swipe up/down (scroll)
- Pinch zoom (scale content)
- Two-finger rotation (rotate elements)

## Responsive Grid
```css
/* Example: 2 columns on desktop, 1 on mobile */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 1rem;
```

## Typography Scaling
```
Headings: Scale from 24px (mobile) to 42px (desktop)
Body: Scale from 14px (mobile) to 16px (desktop)
Small: Scale from 12px (mobile) to 14px (desktop)
```

## Mobile Navigation
- Desktop: Top menu bar
- Tablet: Side navigation
- Mobile: Hamburger menu + bottom navigation

## Safe Areas (Notches)
- Support iPhone notches
- Support Android system bars
- Safe area insets for critical content
- Custom safe area overlay

## Performance on Mobile
- Code splitting per route
- Image optimization (WebP, AVIF)
- Lazy loading
- Virtual scrolling for lists
- Gesture debouncing
- Touch feedback (< 200ms)
- No hover effects on mobile

## Screen Size Optimizations

### 320-480px (Mobile)
- Single column layout
- Stacked components
- Large touch targets
- Bottom sheet modals
- Hamburger menu
- Bottom navigation

### 480-768px (Small Tablet)
- 2-column grid
- Optimized spacing
- Larger text
- Side drawer option

### 768-1024px (Tablet)
- 2-3 column layout
- Comfortable spacing
- iPad support
- Stylus support

### 1024px+ (Desktop)
- Full 3-4 column layout
- Docked panels
- Hover effects
- Keyboard shortcuts

## Testing on Mobile
- Test all breakpoints
- Test touch gestures
- Test on real devices (iPhone, Android)
- Test on simulators/emulators
- Test landscape/portrait
- Test notches/safe areas
- Test low-end devices
- Test high DPI displays

## Browser Support
- iOS Safari 12+
- Android Chrome 80+
- Edge Mobile
- Firefox Mobile
- Samsung Internet

## Deliverables Checklist
- All breakpoints working
- Mobile layouts responsive
- Touch gestures working
- Safe area support working
- Mobile menu working
- Bottom sheet working
- All components responsive
- Typography scaling working
- Images optimized
- Performance optimized on mobile
- No layout shifts
- All tests passing
- All screen sizes tested
- JSDoc complete
