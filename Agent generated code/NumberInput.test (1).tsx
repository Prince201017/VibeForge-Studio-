import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberInput } from "./NumberInput";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("NumberInput", () => {
  it("renders the current value", () => {
    render(<NumberInput label="Size" value={24} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Size")).toHaveValue(24);
  });

  it("increments on the up stepper", () => {
    const onChange = vi.fn();
    render(<NumberInput label="Size" value={24} onChange={onChange} step={2} />);
    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(26);
  });

  it("clamps to max", () => {
    const onChange = vi.fn();
    render(<NumberInput label="Size" value={99} onChange={onChange} max={100} step={5} />);
    fireEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("matches snapshot", () => {
    const { container } = render(<NumberInput label="Size" value={24} onChange={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<NumberInput label="Size" value={24} onChange={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
