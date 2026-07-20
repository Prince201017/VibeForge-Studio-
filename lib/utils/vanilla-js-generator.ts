// [V0.A10] Framework target 6/6: dependency-free Web Animations API output.
import { CodegenTrack } from "./types";

export function toVanillaJS(track: CodegenTrack): string {
  const waapiKeyframes = track.keyframes.map((kf) => ({ ...kf.props, offset: kf.time, easing: kf.easing ?? "ease-in-out" }));
  return `const el = document.querySelector("${track.targetSelector}");
el.animate(${JSON.stringify(waapiKeyframes, null, 2)}, {
  duration: ${track.durationMs},
  iterations: ${track.loop ? "Infinity" : "1"},
  fill: "forwards",
});`;
}
