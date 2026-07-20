import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopNav } from "./TopNav";
import { expectNoA11yViolations } from "../__tests__/testUtils";

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

  it("matches snapshot", () => {
    const { container } = render(<TopNav brand={<span>Brand</span>} items={[{ id: "a", label: "A" }]} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<TopNav brand={<span>Brand</span>} items={[{ id: "a", label: "A" }]} />);
    await expectNoA11yViolations(result);
  });
});
