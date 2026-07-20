export * from "./types";
export * from "./css-generator";
export * from "./tailwind-generator";
export * from "./framer-motion-generator";
export * from "./gsap-generator";
export * from "./react-spring-generator";
export * from "./vanilla-js-generator";

import { Framework, CodegenTrack } from "./types";
import { toCSSKeyframes } from "./css-generator";
import { toTailwindConfig } from "./tailwind-generator";
import { toFramerMotionVariants } from "./framer-motion-generator";
import { toGsapTimeline } from "./gsap-generator";
import { toReactSpring } from "./react-spring-generator";
import { toVanillaJS } from "./vanilla-js-generator";

export function generateCode(track: CodegenTrack, framework: Framework, animName = "forgeosAnim"): string {
  switch (framework) {
    case "css": return toCSSKeyframes(track, animName);
    case "tailwind": return toTailwindConfig(track, animName).configSnippet;
    case "framer-motion": return toFramerMotionVariants(track);
    case "gsap": return toGsapTimeline(track);
    case "react-spring": return toReactSpring(track);
    case "vanilla-js": return toVanillaJS(track);
    default: throw new Error(`Unsupported framework: ${framework}`);
  }
}
