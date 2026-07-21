import { describe, it, expect } from "vitest";
import { generateCode, CodegenTrack } from "../src/index";

const track: CodegenTrack = {
  targetSelector: ".box",
  durationMs: 1000,
  loop: true,
  keyframes: [
    { time: 0, props: { opacity: 0, transform: "translateX(0px)" } },
    { time: 1, props: { opacity: 1, transform: "translateX(100px)" } },
  ],
};

describe("code generators", () => {
  it("generates valid CSS keyframes", () => {
    const css = generateCode(track, "css", "slideIn");
    expect(css).toContain("@keyframes slideIn");
    expect(css).toContain("0%");
    expect(css).toContain("100%");
  });
  it("generates GSAP timeline with repeat -1 for loop", () => {
    const js = generateCode(track, "gsap");
    expect(js).toContain("repeat: -1");
  });
  it("generates vanilla WAAPI with Infinity iterations for loop", () => {
    const js = generateCode(track, "vanilla-js");
    expect(js).toContain("Infinity");
  });
});
