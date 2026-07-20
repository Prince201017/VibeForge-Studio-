import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./Input";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Input", () => {
  it("renders a label associated with the input", () => {
    render(<Input label="Layer name" />);
    expect(screen.getByLabelText("Layer name")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("shows error message and marks aria-invalid", () => {
    render(<Input label="Email" error="Invalid" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid");
  });

  it("disables the input when disabled", () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Input label="Name" helperText="Helper" />);
    await expectNoA11yViolations(result);
  });
});
