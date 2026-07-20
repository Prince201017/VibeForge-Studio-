// [V0.A13] Layout switcher: renders the appropriate editor shell per breakpoint.
// Mobile gets a simplified single-panel layout (per constraint: touch targets, no
// hover-dependent UI); desktop gets the full multi-panel editor.
import React from "react";
import { useBreakpoint } from "./breakpoints";

export interface ResponsiveLayoutProps {
  mobile: React.ReactNode;
  tablet?: React.ReactNode;
  desktop: React.ReactNode;
}

export function ResponsiveLayout({ mobile, tablet, desktop }: ResponsiveLayoutProps) {
  const bp = useBreakpoint();
  if (bp === "mobile") return <>{mobile}</>;
  if (bp === "tablet") return <>{tablet ?? desktop}</>;
  return <>{desktop}</>;
}

/** Minimum touch target size per WCAG 2.5.5 — enforced via this helper rather than
 * scattered magic numbers across component styles. */
export const MIN_TOUCH_TARGET_PX = 44;

export function touchTargetStyle(): React.CSSProperties {
  return { minWidth: MIN_TOUCH_TARGET_PX, minHeight: MIN_TOUCH_TARGET_PX };
}
