/**
 * Mobile & Responsive Adaptation package
 * (per specs/14_MOBILE_RESPONSIVE_NEEDS.md — needs new agent assignment
 * per INDEX.md; built to spec without an assigned agent ID.)
 *
 * Import surface for the rest of ForgeOS. Keep this file as the single
 * public entrypoint so other systems depend on stable names, not internal
 * file paths.
 */

// Components
export { SafeAreaView } from "./components/responsive/SafeAreaView";
export type { SafeAreaViewProps } from "./components/responsive/SafeAreaView";

export { TouchOptimizedButton } from "./components/responsive/TouchOptimizedButton";
export type { TouchOptimizedButtonProps } from "./components/responsive/TouchOptimizedButton";

export { BottomSheet } from "./components/responsive/BottomSheet";
export type { BottomSheetProps, BottomSheetVariant } from "./components/responsive/BottomSheet";

export { FloatingActionButton } from "./components/responsive/FloatingActionButton";
export type { FloatingActionButtonProps, FabAction } from "./components/responsive/FloatingActionButton";

export { MobileMenu, BottomTabBar } from "./components/responsive/MobileMenu";
export type {
  MobileMenuProps,
  MobileMenuItem,
  BottomTabItem,
} from "./components/responsive/MobileMenu";

export { ResponsiveLayout } from "./components/responsive/ResponsiveLayout";
export type { ResponsiveLayoutProps } from "./components/responsive/ResponsiveLayout";

export { KeyboardAwareInput } from "./components/responsive/KeyboardAwareInput";
export type {
  KeyboardAwareInputProps,
  KeyboardAwareInputKind,
} from "./components/responsive/KeyboardAwareInput";

// Hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsWide,
  useViewportInfo,
  usePrefersReducedMotion,
  useSafeAreaInsets,
  useIsTouchDevice,
  useKeyboardVisible,
} from "./lib/responsive/hooks";
export type { SafeAreaInsets } from "./lib/responsive/hooks";

// Gestures
export {
  usePinchZoom,
  useSwipe,
  useLongPress,
  useDoubleTap,
  useTwoFingerTap,
} from "./lib/responsive/gestures";
export type {
  PinchZoomOptions,
  SwipeDirection,
  SwipeOptions,
  LongPressOptions,
  DoubleTapOptions,
  TwoFingerTapOptions,
} from "./lib/responsive/gestures";

// Breakpoints
export {
  BREAKPOINTS,
  classifyWidth,
  classifyViewport,
  MIN_TOUCH_TARGET,
  MIN_INPUT_HEIGHT,
  PERFORMANCE_SLAS,
} from "./lib/responsive/breakpoints";
export type { BreakpointKey, DeviceClass, ViewportClassification } from "./lib/responsive/breakpoints";

// Style utilities
export {
  getSafeAreaPadding,
  safeAreaInsetsToStyle,
  cx,
  TOUCH_TARGET_CLASS,
  MIN_INPUT_CLASS,
  buildResponsiveImageAttrs,
  clamp,
} from "./lib/responsive/styles";
export type { ResponsiveImageSource } from "./lib/responsive/styles";
