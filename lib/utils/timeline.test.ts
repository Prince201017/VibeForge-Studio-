// [Claude.A3] Vitest/Jest-style smoke tests for timeline evaluation.
import { describe, it, expect } from "vitest";
import { Timeline, numberInterpolator } from "../src/timeline";
import { Easing } from "../src/easing";

describe("Timeline", () => {
  it("interpolates linearly between two keyframes", () => {
    const tl = new Timeline();
    tl.addTrack({
      id: "t1", targetId: "node1", property: "transform.position.x",
      keyframes: [{ time: 0, value: 0 }, { time: 1, value: 10, easing: Easing.linear }],
      interpolate: numberInterpolator,
    });
    const result = tl.evaluateAll(0.5);
    expect(result.node1["transform.position.x"]).toBeCloseTo(5);
  });

  it("clamps to first/last keyframe outside range", () => {
    const tl = new Timeline();
    tl.addTrack({
      id: "t1", targetId: "n", property: "x",
      keyframes: [{ time: 1, value: 5 }, { time: 2, value: 15 }],
      interpolate: numberInterpolator,
    });
    expect(tl.evaluateAll(-5).n.x).toBe(5);
    expect(tl.evaluateAll(50).n.x).toBe(15);
  });
});
