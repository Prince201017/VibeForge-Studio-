import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a single block by default", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });

  it("renders the requested number of text lines", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("is hidden from assistive tech", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
