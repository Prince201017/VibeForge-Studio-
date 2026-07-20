import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Progress", () => {
  it("exposes aria-valuenow when determinate", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("omits aria-valuenow when indeterminate", () => {
    render(<Progress />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });

  it("shows a percentage label when requested", () => {
    render(<Progress value={75} showLabel />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<Progress value={50} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Progress value={50} />);
    await expectNoA11yViolations(result);
  });
});
