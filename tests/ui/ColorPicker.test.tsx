import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColorPicker } from "./ColorPicker";

describe("ColorPicker", () => {
  it("displays the current hex value", () => {
    render(<ColorPicker value="#6366F1" onChange={vi.fn()} />);
    expect(screen.getByText("#6366F1")).toBeInTheDocument();
  });

  it("opens the popover on trigger click", () => {
    render(<ColorPicker value="#6366F1" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /#6366F1/i }));
    expect(screen.getByRole("dialog", { name: /color picker/i })).toBeInTheDocument();
  });

  it("commits a preset swatch selection", () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#000000" onChange={onChange} presets={["#FF0000"]} />);
    fireEvent.click(screen.getByRole("button", { name: /#000000/i }));
    fireEvent.click(screen.getByRole("option", { name: "#FF0000" }));
    expect(onChange).toHaveBeenCalledWith("#FF0000");
  });
});
