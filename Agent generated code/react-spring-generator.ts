// [V0.A10] Framework target 5/6: react-spring `useSpring`.
import { CodegenTrack } from "./types";

export function toReactSpring(track: CodegenTrack): string {
  const from = track.keyframes[0]?.props ?? {};
  const to = track.keyframes[track.keyframes.length - 1]?.props ?? {};
  return `import { useSpring, animated } from "@react-spring/web";

export function AnimatedElement() {
  const styles = useSpring({
    from: ${JSON.stringify(from)},
    to: ${JSON.stringify(to)},
    config: { duration: ${track.durationMs} },
    loop: ${track.loop ? "true" : "false"},
  });
  return <animated.div style={styles} />;
}`;
}
