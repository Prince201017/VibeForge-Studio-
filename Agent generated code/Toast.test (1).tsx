import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";
import { expectNoA11yViolations } from "../__tests__/testUtils";

function Trigger() {
  const { show } = useToast();
  return <button onClick={() => show({ title: "Saved", status: "success", duration: 0 })}>Show</button>;
}

describe("Toast", () => {
  it("throws if useToast is used outside a provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const BadComponent = () => {
      useToast();
      return null;
    };
    expect(() => render(<BadComponent />)).toThrow();
    consoleError.mockRestore();
  });

  it("shows a toast when show() is called", async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
  });

  it("dismisses a toast on its close button", async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => screen.getByText("Saved"));
    fireEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
    await waitFor(() => expect(screen.queryByText("Saved")).not.toBeInTheDocument());
  });

  it("matches snapshot", () => {
    const { container } = render(<ToastProvider><Trigger /></ToastProvider>);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<ToastProvider><Trigger /></ToastProvider>);
    await expectNoA11yViolations(result);
  });
});
