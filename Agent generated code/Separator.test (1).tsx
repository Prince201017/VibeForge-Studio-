import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Separator } from "./Separator";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Separator", () => {
  it("renders a separator role", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders the label when provided", () => {
    render(<Separator label="OR" />);
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<Separator />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Separator />);
    await expectNoA11yViolations(result);
  });
});
