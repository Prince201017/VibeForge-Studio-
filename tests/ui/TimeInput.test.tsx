import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeInput } from "./TimeInput";

describe("TimeInput", () => {
  it("renders hours and minutes segments", () => {
    render(<TimeInput value={{ hours: 9, minutes: 5 }} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Hours")).toHaveValue("09");
    expect(screen.getByLabelText("Minutes")).toHaveValue("05");
  });

  it("increments hours on ArrowUp", () => {
    const onChange = vi.fn();
    render(<TimeInput value={{ hours: 9, minutes: 5 }} onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("Hours"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith({ hours: 10, minutes: 5 });
  });
});
