import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Popover } from "./Popover";

describe("Popover", () => {
  it("opens content on trigger click", () => {
    render(<Popover trigger={<span>Open</span>}><p>Popover body</p></Popover>);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Popover body")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<Popover trigger={<span>Open</span>}><p>Popover body</p></Popover>);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();
  });
});
