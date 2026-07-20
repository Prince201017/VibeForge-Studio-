import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("Button", () => {
  it("renders children and responds to click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("disables interaction while loading", () => {
    render(<Button isLoading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("has no a11y violations", async () => {
    const result = render(<Button>Save</Button>);
    await expectNoA11yViolations(result);
  });
});
