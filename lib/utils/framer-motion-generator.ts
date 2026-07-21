// [V0.A10] Framework target 3/6: Framer Motion `animate` prop / variants.
import { CodegenTrack } from "./types";

export function toFramerMotionVariants(track: CodegenTrack): string {
  const variants: Record<string, Record<string, unknown>> = {};
  track.keyframes.forEach((kf, i) => {
    variants[`step${i}`] = { ...kf.props, transition: { duration: track.durationMs / 1000 / track.keyframes.length, ease: kf.easing ?? "easeInOut" } };
  });
  const variantsJson = JSON.stringify(variants, null, 2);
  return `import { motion } from "framer-motion";

const variants = ${variantsJson};

export function AnimatedElement() {
  return (
    <motion.div
      variants={variants}
      initial="step0"
      animate="${Object.keys(variants).at(-1)}"
      ${track.loop ? `transition={{ repeat: Infinity }}` : ""}
    />
  );
}`;
}
