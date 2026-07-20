import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "./LoadingSpinner";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("LoadingSpinner", () => {
  it("announces loading state via role status", () => {
    render(<LoadingSpinner label="Loading export" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading export");
  });

  it("has no a11y violations", async () => {
    const result = render(<LoadingSpinner />);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<LoadingSpinner label="Loading export" />);
    expect(container).toMatchSnapshot();
  });
});
