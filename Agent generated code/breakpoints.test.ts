import { describe, it, expect } from "vitest";
import { getBreakpoint } from "../src/breakpoints";

describe("getBreakpoint", () => {
  it("classifies widths correctly", () => {
    expect(getBreakpoint(375)).toBe("mobile");
    expect(getBreakpoint(768)).toBe("tablet");
    expect(getBreakpoint(1024)).toBe("desktop");
    expect(getBreakpoint(1600)).toBe("wide");
  });
});
