import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Menu } from "./Menu";

describe("Menu", () => {
  it("renders items with role menuitem", () => {
    render(<Menu x={0} y={0} onClose={vi.fn()} items={[{ id: "a", label: "Copy" }]} />);
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
  });

  it("calls onSelect and onClose when an item is chosen", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<Menu x={0} y={0} onClose={onClose} items={[{ id: "a", label: "Copy", onSelect }]} />);
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(onSelect).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Menu x={0} y={0} onClose={onClose} items={[{ id: "a", label: "Copy" }]} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
