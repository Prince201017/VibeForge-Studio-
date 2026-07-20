import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";

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
});
