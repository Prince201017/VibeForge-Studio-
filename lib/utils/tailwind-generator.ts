// [V0.A10] Framework target 2/6: Tailwind config + arbitrary-value className.
import { CodegenTrack } from "./types";

export function toTailwindConfig(track: CodegenTrack, animName: string): { configSnippet: string; className: string } {
  const frames: Record<string, Record<string, string>> = {};
  for (const kf of track.keyframes) {
    const pctKey = `${Math.round(kf.time * 100)}%`;
    frames[pctKey] = Object.fromEntries(Object.entries(kf.props).map(([k, v]) => [k, String(v)]));
  }

  const configSnippet = `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: { ${animName}: ${JSON.stringify(frames, null, 8).replace(/\n/g, "\n      ")} },
      animation: { ${animName}: '${animName} ${track.durationMs}ms ${track.loop ? "infinite" : ""} ease-in-out' },
    },
  },
};`;

  return { configSnippet, className: `animate-${animName}` };
}
