// [V0.A10] Shared input contract: takes a Timeline (from 03-animation-system) and
// converts it to framework-specific animation code.
export interface CodegenKeyframe {
  time: number;   // 0-1 normalized
  props: Record<string, string | number>;
  easing?: string; // CSS-compatible easing name or cubic-bezier(...)
}

export interface CodegenTrack {
  targetSelector: string; // CSS selector or component name
  keyframes: CodegenKeyframe[];
  durationMs: number;
  loop?: boolean;
}

export type Framework = "css" | "tailwind" | "framer-motion" | "react-spring" | "gsap" | "vanilla-js";
