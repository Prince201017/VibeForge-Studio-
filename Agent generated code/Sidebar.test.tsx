import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const items = [
  { id: "a", label: "A", icon: <span /> },
  { id: "b", label: "B", icon: <span />, children: [{ id: "b1", label: "B1", icon: <span /> }] },
];

describe("Sidebar", () => {
  it("marks the active item with aria-current", () => {
    render(<Sidebar items={items} activeId="a" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-current", "page");
  });

  it("calls onSelect for a leaf item", () => {
    const onSelect = vi.fn();
    render(<Sidebar items={items} activeId="a" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("expands a group to reveal children", () => {
    render(<Sidebar items={items} activeId="a" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "B1" })).toBeInTheDocument();
  });
});
