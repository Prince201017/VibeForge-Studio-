import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Drawer } from "./Drawer";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Drawer", () => {
  it("renders nothing when closed", () => {
    render(<Drawer isOpen={false} onClose={vi.fn()} title="Settings">body</Drawer>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and content when open", () => {
    render(<Drawer isOpen onClose={vi.fn()} title="Settings">body content</Drawer>);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("calls onClose on Escape and close button", () => {
    const onClose = vi.fn();
    render(<Drawer isOpen onClose={onClose} title="Settings">body</Drawer>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /close panel/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("matches snapshot", () => {
    const { container } = render(<Drawer isOpen={false} onClose={vi.fn()} title="Settings">body</Drawer>);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Drawer isOpen={false} onClose={vi.fn()} title="Settings">body</Drawer>);
    await expectNoA11yViolations(result);
  });
});
