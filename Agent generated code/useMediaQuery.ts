/**
 * [ForgeOS UI] Subscribes to a CSS media query and returns whether it
 * currently matches. Backs the responsive variants of Stack, Grid,
 * Sidebar, and TopNav.
 */
import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export const breakpoints = {
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
} as const;
