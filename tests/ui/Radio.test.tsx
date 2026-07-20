import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RadioGroup } from "./Radio";
import { expectNoA11yViolations } from "../__tests__/testUtils";

const options = [
  { label: "A", value: "a" },
  { label: "B", value: "b" },
];

describe("RadioGroup", () => {
  it("renders a legend and options", () => {
    render(<RadioGroup name="test" legend="Choose" options={options} value="a" onChange={vi.fn()} />);
    expect(screen.getByText("Choose")).toBeInTheDocument();
    expect(screen.getByLabelText("A")).toBeChecked();
  });

  it("calls onChange with the newly selected value", () => {
    const onChange = vi.fn();
    render(<RadioGroup name="test" legend="Choose" options={options} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("has no a11y violations", async () => {
    const result = render(<RadioGroup name="test" legend="Choose" options={options} value="a" onChange={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
