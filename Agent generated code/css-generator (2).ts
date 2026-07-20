// [V0.A10] Framework target 1/6: raw CSS @keyframes.
import { CodegenTrack } from "./types";

export function toCSSKeyframes(track: CodegenTrack, animName: string): string {
  const frames = track.keyframes
    .map((kf) => {
      const pct = Math.round(kf.time * 100);
      const decls = Object.entries(kf.props).map(([k, v]) => `  ${camelToKebab(k)}: ${v};`).join("\n");
      return `  ${pct}% {\n${decls}\n  }`;
    })
    .join("\n");

  const rule = `@keyframes ${animName} {\n${frames}\n}`;
  const usage = `${track.targetSelector} {\n  animation: ${animName} ${track.durationMs}ms ${track.loop ? "infinite" : "1"} ${defaultEasing(track)};\n}`;
  return `${rule}\n\n${usage}`;
}

function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function defaultEasing(track: CodegenTrack): string {
  return track.keyframes[0]?.easing ?? "ease-in-out";
}
