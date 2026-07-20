import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("shows tooltip content on focus", async () => {
    render(
      <Tooltip content="Helpful hint" delayMs={0}>
        <button>Trigger</button>
      </Tooltip>
    );
    fireEvent.focus(screen.getByText("Trigger"));
    await waitFor(() => expect(screen.getByRole("tooltip")).toHaveTextContent("Helpful hint"));
  });

  it("hides tooltip content on blur", async () => {
    render(
      <Tooltip content="Helpful hint" delayMs={0}>
        <button>Trigger</button>
      </Tooltip>
    );
    const trigger = screen.getByText("Trigger");
    fireEvent.focus(trigger);
    await waitFor(() => expect(screen.getByRole("tooltip")).toBeInTheDocument());
    fireEvent.blur(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});
