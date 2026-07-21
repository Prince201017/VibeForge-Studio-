import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Image } from "./Image";

describe("Image", () => {
  it("renders an img with the given alt text", () => {
    render(<Image src="photo.png" alt="A photo" />);
    expect(screen.getByAltText("A photo")).toBeInTheDocument();
  });

  it("shows the fallback state on error", () => {
    render(<Image src="broken.png" alt="Broken" fallback={<span>Failed to load</span>} />);
    fireEvent.error(screen.getByAltText("Broken"));
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("uses native lazy loading", () => {
    render(<Image src="photo.png" alt="A photo" />);
    expect(screen.getByAltText("A photo")).toHaveAttribute("loading", "lazy");
  });
});
