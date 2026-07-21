import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Video } from "./Video";

describe("Video", () => {
  it("renders a video element with the given source", () => {
    const { container } = render(<Video src="movie.mp4" />);
    expect(container.querySelector("video")).toHaveAttribute("src", "movie.mp4");
  });

  it("renders accessible play/pause and fullscreen controls", () => {
    render(<Video src="movie.mp4" />);
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fullscreen/i })).toBeInTheDocument();
  });

  it("exposes seek and volume sliders", () => {
    render(<Video src="movie.mp4" />);
    expect(screen.getByLabelText("Seek")).toBeInTheDocument();
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
  });
});
