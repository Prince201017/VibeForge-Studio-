import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Card } from "./Card";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Card", () => {
  it("renders header, body, and footer", () => {
    render(<Card header={<span>Header</span>} footer={<span>Footer</span>}>Body</Card>);
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("exposes a button role and fires onClick when interactive", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Body</Card>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("has no a11y violations when interactive", async () => {
    const result = render(<Card onClick={() => {}}>Body</Card>);
    await expectNoA11yViolations(result);
  });
});
