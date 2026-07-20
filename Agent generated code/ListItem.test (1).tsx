import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListItem } from "./ListItem";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("ListItem", () => {
  it("renders title and subtitle", () => {
    render(<ListItem title="Layer 1" subtitle="Group" />);
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
    expect(screen.getByText("Group")).toBeInTheDocument();
  });

  it("calls onClick when interactive", () => {
    const onClick = vi.fn();
    render(<ListItem title="Layer 1" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("matches snapshot", () => {
    const { container } = render(<ListItem title="Layer 1" subtitle="Group" />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<ListItem title="Layer 1" subtitle="Group" />);
    await expectNoA11yViolations(result);
  });
});
