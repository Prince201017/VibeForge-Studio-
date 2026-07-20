import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileInput } from "./FileInput";

describe("FileInput", () => {
  it("renders the drop zone label", () => {
    render(<FileInput onFilesSelected={vi.fn()} label="Drop files here" />);
    expect(screen.getByText("Drop files here")).toBeInTheDocument();
  });

  it("calls onFilesSelected when a file is chosen via input", () => {
    const onFilesSelected = vi.fn();
    render(<FileInput onFilesSelected={onFilesSelected} />);
    const file = new File(["content"], "test.png", { type: "image/png" });
    const input = screen.getByRole("button").querySelector("input")!;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("is keyboard activatable", () => {
    render(<FileInput onFilesSelected={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabIndex", "0");
  });
});
