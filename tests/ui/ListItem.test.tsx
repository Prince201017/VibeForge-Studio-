import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListItem } from "./ListItem";

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
});
