import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Popover } from "./Popover";
import { expectNoA11yViolations } from "../__tests__/testUtils";

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

  it("matches snapshot", () => {
    const { container } = render(<Popover trigger={<span>Open</span>}><p>Popover body</p></Popover>);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Popover trigger={<span>Open</span>}><p>Popover body</p></Popover>);
    await expectNoA11yViolations(result);
  });
});
