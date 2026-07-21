import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabGroup } from "./TabGroup";
import { expectNoA11yViolations } from "../__tests__/testUtils";

const tabs = [
  { id: "a", label: "A", content: <p>Content A</p> },
  { id: "b", label: "B", content: <p>Content B</p> },
];

describe("TabGroup", () => {
  it("shows the default active panel", () => {
    render(<TabGroup tabs={tabs} defaultActiveId="a" />);
    expect(screen.getByText("Content A")).toBeVisible();
  });

  it("switches panels on click and calls onChange", () => {
    const onChange = vi.fn();
    render(<TabGroup tabs={tabs} defaultActiveId="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("navigates with ArrowRight", () => {
    render(<TabGroup tabs={tabs} defaultActiveId="a" />);
    const tabA = screen.getByRole("tab", { name: "A" });
    tabA.focus();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();
  });

  it("has no a11y violations", async () => {
    const result = render(<TabGroup tabs={tabs} defaultActiveId="a" />);
    await expectNoA11yViolations(result);
  });
});
