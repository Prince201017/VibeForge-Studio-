import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopNav } from "./TopNav";

describe("TopNav", () => {
  it("renders the brand and nav items", () => {
    render(<TopNav brand={<span>Brand</span>} items={[{ id: "a", label: "A" }]} />);
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
  });

  it("calls the mobile menu toggle handler", () => {
    const onToggle = vi.fn();
    render(<TopNav brand={<span>Brand</span>} onMobileMenuToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /toggle navigation menu/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
