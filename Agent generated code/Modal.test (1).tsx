import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(<Modal isOpen={false} onClose={vi.fn()} title="Test">body</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders title and content when open", () => {
    render(<Modal isOpen onClose={vi.fn()} title="Test">body content</Modal>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">body</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on close button click", () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Test">body</Modal>);
    fireEvent.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Modal isOpen onClose={vi.fn()} title="Test">body</Modal>);
    await expectNoA11yViolations(result);
  });

  it("matches snapshot", () => {
    const { container } = render(<Modal isOpen={false} onClose={vi.fn()} title="Test">body</Modal>);
    expect(container).toMatchSnapshot();
  });
});
