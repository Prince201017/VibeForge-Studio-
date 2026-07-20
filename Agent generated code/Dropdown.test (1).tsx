import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dropdown } from "./Dropdown";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Dropdown", () => {
  it("opens the menu on trigger click", () => {
    render(<Dropdown trigger={<span>Open</span>} items={[{ id: "a", label: "A" }]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("calls onSelect and closes on item click", () => {
    const onSelect = vi.fn();
    render(<Dropdown trigger={<span>Open</span>} items={[{ id: "a", label: "A", onSelect }]} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("menuitem", { name: "A" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<Dropdown trigger={<span>Open</span>} items={[{ id: "a", label: "A" }]} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Dropdown trigger={<span>Open</span>} items={[{ id: "a", label: "A" }]} />);
    await expectNoA11yViolations(result);
  });
});
