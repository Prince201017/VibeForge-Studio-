import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Panel } from "./Panel";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Panel", () => {
  it("renders title and children", () => {
    render(<Panel title="Layers">content</Panel>);
    expect(screen.getByText("Layers")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("collapses and calls onToggle", () => {
    const onToggle = vi.fn();
    render(
      <Panel title="Layers" collapsible onToggle={onToggle}>
        content
      </Panel>
    );
    fireEvent.click(screen.getByRole("button", { name: /collapse layers/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const result = render(
      <Panel title="Layers" collapsible>
        content
      </Panel>
    );
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Panel title="Layers">content</Panel>);
    expect(container).toMatchSnapshot();
  });
});
