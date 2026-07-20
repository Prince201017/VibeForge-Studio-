import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./Dialog";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(<ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Delete?" />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls onConfirm with the dontAskAgain flag", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} title="Delete?" showDontAskAgain />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={vi.fn()} title="Delete?" />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("matches snapshot", () => {
    const { container } = render(<ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Delete?" />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Delete?" />);
    await expectNoA11yViolations(result);
  });
});
