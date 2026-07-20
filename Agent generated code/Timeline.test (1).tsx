import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { expectNoA11yViolations } from "../__tests__/testUtils";

const entries = [
  { id: "1", title: "Event one", timestamp: "1h ago", status: "success" as const },
  { id: "2", title: "Event two", timestamp: "2h ago" },
];

describe("Timeline", () => {
  it("renders each entry's title and timestamp", () => {
    render(<Timeline entries={entries} />);
    expect(screen.getByText("Event one")).toBeInTheDocument();
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const result = render(<Timeline entries={entries} />);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Timeline entries={entries} />);
    expect(container).toMatchSnapshot();
  });
});
