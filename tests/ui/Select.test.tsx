import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "./Select";

const options = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
];

describe("Select", () => {
  it("shows placeholder when nothing is selected", () => {
    render(<Select options={options} value={null} onChange={vi.fn()} placeholder="Choose one" />);
    expect(screen.getByText("Choose one")).toBeInTheDocument();
  });

  it("opens the listbox on trigger click", () => {
    render(<Select options={options} value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(<Select options={options} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("beta");
  });

  it("supports multi-select accumulation", () => {
    const onChange = vi.fn();
    render(<Select options={options} value={["alpha"]} onChange={onChange} multiple />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith(["alpha", "beta"]);
  });
});
