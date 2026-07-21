import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateInput } from "./DateInput";

describe("DateInput", () => {
  it("shows placeholder text when no date is selected", () => {
    render(<DateInput value={null} onChange={vi.fn()} />);
    expect(screen.getByText("Select a date")).toBeInTheDocument();
  });

  it("opens the calendar dialog on click", () => {
    render(<DateInput value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog", { name: /choose date/i })).toBeInTheDocument();
  });
});
