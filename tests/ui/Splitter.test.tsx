import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Splitter } from "./Splitter";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Splitter", () => {
  it("renders a separator role with correct orientation", () => {
    render(<Splitter orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("is keyboard focusable", () => {
    render(<Splitter orientation="vertical" />);
    const el = screen.getByRole("separator");
    el.focus();
    expect(el).toHaveFocus();
  });

  it("has no a11y violations", async () => {
    const result = render(<Splitter orientation="horizontal" />);
    await expectNoA11yViolations(result);
  });
});
