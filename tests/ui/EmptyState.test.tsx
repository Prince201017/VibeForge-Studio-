import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No results" description="Try a different search" />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const result = render(<EmptyState title="No results" />);
    await expectNoA11yViolations(result);
  });
});
