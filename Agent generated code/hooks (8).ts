/**
 * lib/responsive/hooks.ts
 *
 * Core responsive hooks (14_MOBILE_RESPONSIVE_NEEDS.md, "Media Query Helpers").
 * All hooks are SSR-safe: they default to a sane value on the server and
 * reconcile to the real value on mount, so nothing throws when `window`
 * is undefined during a server render.
 */

import { useCallback, useEffect, useState } from "react";
import { BREAKPOINTS, classifyViewport, ViewportClassification } from "./breakpoints";

const isBrowser = typeof window !== "undefined";

/** Subscribes to a `min-width` media query and returns whether it matches. */
export function useMediaQuery(minWidthPx: number): boolean {
  const query = `(min-width: ${minWidthPx}px)`;

  const getSnapshot = useCallback(() => {
    if (!isBrowser) return false;
    try {
      return window.matchMedia(query).matches;
    } catch {
      // matchMedia can throw in some embedded webview contexts.
      return false;
    }
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getSnapshot);

  useEffect(() => {
    if (!isBrowser) return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(query);
    } catch {
      return;
    }
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Safari < 14 fallback.
    // @ts-expect-error legacy API
    mql.addListener(handler);
    // @ts-expect-error legacy API
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}

export const useIsMobile = () => !useMediaQuery(BREAKPOINTS.tablet);
export const useIsTablet = () =>
  useMediaQuery(BREAKPOINTS.tablet) && !useMediaQuery(BREAKPOINTS.desktop);
export const useIsDesktop = () => useMediaQuery(BREAKPOINTS.desktop);
export const useIsWide = () => useMediaQuery(BREAKPOINTS.wide);

/** Full viewport classification (width/height/device/orientation), live-updating. */
export function useViewportInfo(): ViewportClassification {
  const [size, setSize] = useState(() => ({
    width: isBrowser ? window.innerWidth : BREAKPOINTS.desktop,
    height: isBrowser ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (!isBrowser) return;
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      // rAF-batch resize reads so we don't thrash layout mid drag-resize.
      frame = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return classifyViewport(size.width, size.height);
}

/** Reactive "reduce motion" preference. Respect this everywhere animation is optional. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!isBrowser) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Reads `env(safe-area-inset-*)` into real pixel numbers by measuring a
 * hidden probe element, since JS cannot read CSS env() directly.
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (!isBrowser) return;

    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.top = "0";
    probe.style.left = "0";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.paddingTop = "env(safe-area-inset-top)";
    probe.style.paddingRight = "env(safe-area-inset-right)";
    probe.style.paddingBottom = "env(safe-area-inset-bottom)";
    probe.style.paddingLeft = "env(safe-area-inset-left)";
    document.body.appendChild(probe);

    const measure = () => {
      const cs = getComputedStyle(probe);
      setInsets({
        top: parseFloat(cs.paddingTop) || 0,
        right: parseFloat(cs.paddingRight) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      probe.remove();
    };
  }, []);

  return insets;
}

/** True when the primary input is touch-capable (not just a narrow viewport). */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (!isBrowser) return;
    setIsTouch(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error legacy IE/Edge property, harmless fallback check
        navigator.msMaxTouchPoints > 0,
    );
  }, []);
  return isTouch;
}

/**
 * Detects likely on-screen-keyboard visibility by watching for a
 * significant shrink in `visualViewport.height`. Used to avoid the
 * keyboard covering a focused input.
 */
export function useKeyboardVisible(thresholdPx = 150): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isBrowser || !window.visualViewport) return;
    const vv = window.visualViewport;

    const handleResize = () => {
      const heightDiff = window.innerHeight - vv.height;
      setVisible(heightDiff > thresholdPx);
    };

    vv.addEventListener("resize", handleResize);
    handleResize();
    return () => vv.removeEventListener("resize", handleResize);
  }, [thresholdPx]);

  return visible;
}
