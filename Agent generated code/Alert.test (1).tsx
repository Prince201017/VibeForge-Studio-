import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Alert } from "./Alert";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Alert", () => {
  it("uses role alert for error/warning", () => {
    render(<Alert status="error" title="Failed" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("uses role status for success/info", () => {
    render(<Alert status="success" title="Done" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("calls onDismiss", () => {
    const onDismiss = vi.fn();
    render(<Alert status="info" title="FYI" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss alert/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Alert status="warning" title="Careful" description="Detail" />);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Alert status="error" title="Failed" />);
    expect(container).toMatchSnapshot();
  });
});
