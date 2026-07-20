import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checkbox } from "./Checkbox";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Checkbox", () => {
  it("associates the label via htmlFor", () => {
    render(<Checkbox label="Accept terms" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
  });

  it("toggles checked state on click", () => {
    const onChange = vi.fn();
    render(<Checkbox label="Accept" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Accept"));
    expect(onChange).toHaveBeenCalled();
  });

  it("sets the indeterminate DOM property", () => {
    render(<Checkbox label="Select all" indeterminate onChange={vi.fn()} />);
    expect(screen.getByLabelText("Select all")).toHaveProperty("indeterminate", true);
  });

  it("has no a11y violations", async () => {
    const result = render(<Checkbox label="Accept terms" onChange={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
