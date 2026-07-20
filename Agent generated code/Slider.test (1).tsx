import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Slider } from "./Slider";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Slider", () => {
  it("renders the current value as text", () => {
    render(<Slider label="Opacity" value={42} onChange={vi.fn()} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onChange when the single thumb moves", () => {
    const onChange = vi.fn();
    render(<Slider label="Opacity" value={10} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it("renders two sliders for range mode", () => {
    render(<Slider label="Range" range value={[10, 90]} onChange={vi.fn()} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("matches snapshot", () => {
    const { container } = render(<Slider label="Opacity" value={42} onChange={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Slider label="Opacity" value={42} onChange={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
