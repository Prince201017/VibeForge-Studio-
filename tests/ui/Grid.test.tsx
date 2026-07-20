import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Grid } from "./Grid";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Grid", () => {
  it("applies the requested column class", () => {
    const { container } = render(<Grid columns={4}><div>a</div></Grid>);
    expect(container.firstChild).toHaveClass("grid-cols-4");
  });

  it("applies responsive column classes", () => {
    const { container } = render(<Grid columns={{ base: 1, md: 3 }}><div>a</div></Grid>);
    expect(container.firstChild).toHaveClass("grid-cols-1", "md:grid-cols-3");
  });

  it("has no a11y violations", async () => {
    const result = render(<Grid columns={2}><div>a</div><div>b</div></Grid>);
    await expectNoA11yViolations(result);
  });
});
