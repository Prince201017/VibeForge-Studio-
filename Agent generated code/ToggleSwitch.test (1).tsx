import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleSwitch } from "./ToggleSwitch";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("ToggleSwitch", () => {
  it("renders role switch with correct aria-checked", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Auto-save" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with toggled value on click", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Auto-save" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled label="Locked" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<ToggleSwitch checked onChange={vi.fn()} label="Auto-save" />);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Auto-save" />);
    expect(container).toMatchSnapshot();
  });
});
