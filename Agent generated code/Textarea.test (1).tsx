import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Textarea } from "./Textarea";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Textarea", () => {
  it("renders label and accepts input", () => {
    const onChange = vi.fn();
    render(<Textarea label="Notes" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "hi" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows the character count when maxLength is set", () => {
    render(<Textarea label="Bio" maxLength={100} value="hello" onChange={vi.fn()} />);
    expect(screen.getByText("5/100")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<Textarea label="Notes" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("has no a11y violations", async () => {
    const result = render(<Textarea label="Notes" helperText="Optional" />);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Textarea label="Notes" onChange={onChange} />);
    expect(container).toMatchSnapshot();
  });
});
