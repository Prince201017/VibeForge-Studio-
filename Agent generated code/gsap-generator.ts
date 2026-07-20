// [V0.A10] Framework target 4/6: GSAP timeline.
import { CodegenTrack } from "./types";

export function toGsapTimeline(track: CodegenTrack): string {
  const lines = track.keyframes.map((kf, i) => {
    const props = JSON.stringify(kf.props);
    const dur = track.durationMs / 1000 / Math.max(1, track.keyframes.length - 1);
    return i === 0
      ? `tl.set("${track.targetSelector}", ${props});`
      : `tl.to("${track.targetSelector}", { ...${props}, duration: ${dur.toFixed(3)}, ease: "${kf.easing ?? "power1.inOut"}" });`;
  });
  return `import gsap from "gsap";

const tl = gsap.timeline({ repeat: ${track.loop ? -1 : 0} });
${lines.join("\n")}
`;
}
