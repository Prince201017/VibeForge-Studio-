import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Breadcrumb", () => {
  it("marks the last item as the current page", () => {
    render(<Breadcrumb items={[{ label: "Home" }, { label: "Settings" }]} />);
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
  });

  it("calls onClick for non-final items", () => {
    const onClick = vi.fn();
    render(<Breadcrumb items={[{ label: "Home", onClick }, { label: "Settings" }]} />);
    fireEvent.click(screen.getByText("Home"));
    expect(onClick).toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Breadcrumb items={[{ label: "Home", onClick: vi.fn() }, { label: "Settings" }]} />);
    await expectNoA11yViolations(result);
  });
});
