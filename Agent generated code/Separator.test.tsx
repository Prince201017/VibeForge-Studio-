import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Separator } from "./Separator";

describe("Separator", () => {
  it("renders a separator role", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders the label when provided", () => {
    render(<Separator label="OR" />);
    expect(screen.getByText("OR")).toBeInTheDocument();
  });
});
