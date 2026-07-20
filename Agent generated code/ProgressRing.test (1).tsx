import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "./ProgressRing";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("ProgressRing", () => {
  it("exposes progressbar semantics", () => {
    render(<ProgressRing value={55} />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "55");
  });

  it("shows the rounded percentage label", () => {
    render(<ProgressRing value={54.6} />);
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<ProgressRing value={55} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<ProgressRing value={55} />);
    await expectNoA11yViolations(result);
  });
});
