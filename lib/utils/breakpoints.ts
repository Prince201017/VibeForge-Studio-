// [V0.A13] Breakpoint system + hook for mobile/tablet/desktop layouts.
import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

export function getBreakpoint(width: number): BreakpointName {
  if (width >= BREAKPOINTS.wide) return "wide";
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function useBreakpoint(): BreakpointName {
  const [bp, setBp] = useState<BreakpointName>(() =>
    typeof window !== "undefined" ? getBreakpoint(window.innerWidth) : "desktop"
  );

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  return useBreakpoint() === "mobile";
}
