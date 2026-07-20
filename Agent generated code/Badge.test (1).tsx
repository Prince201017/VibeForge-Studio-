import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "./Badge";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("calls onDismiss when the remove button is clicked", () => {
    const onDismiss = vi.fn();
    render(<Badge onDismiss={onDismiss}>Draft</Badge>);
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Badge status="success">Live</Badge>);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Badge>Draft</Badge>);
    expect(container).toMatchSnapshot();
  });
});
