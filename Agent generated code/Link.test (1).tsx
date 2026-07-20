import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Link } from "./Link";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Link", () => {
  it("renders an anchor with the given href", () => {
    render(<Link href="/docs">Docs</Link>);
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/docs");
  });

  it("adds target and rel for external links", () => {
    render(<Link href="https://example.com" external>Example</Link>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has no a11y violations", async () => {
    const result = render(<Link href="/docs">Docs</Link>);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Link href="/docs">Docs</Link>);
    expect(container).toMatchSnapshot();
  });
});
