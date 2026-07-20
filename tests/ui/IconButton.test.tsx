import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconButton } from "./IconButton";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("IconButton", () => {
  it("requires and exposes an accessible name via aria-label", () => {
    render(<IconButton icon={<span />} aria-label="Delete" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<IconButton icon={<span />} aria-label="Delete" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<IconButton icon={<span />} aria-label="Delete" onClick={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
