import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Stack } from "./Stack";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Stack", () => {
  it("defaults to a vertical flex column", () => {
    const { container } = render(<Stack><div>a</div></Stack>);
    expect(container.firstChild).toHaveClass("flex", "flex-col");
  });

  it("switches to row for horizontal direction", () => {
    const { container } = render(<Stack direction="horizontal"><div>a</div></Stack>);
    expect(container.firstChild).toHaveClass("flex-row");
  });

  it("has no a11y violations", async () => {
    const result = render(<Stack><div>a</div><div>b</div></Stack>);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Stack><div>a</div></Stack>);
    expect(container).toMatchSnapshot();
  });
});
