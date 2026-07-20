import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Video } from "./Video";
import { expectNoA11yViolations } from "../__tests__/testUtils";

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

  it("matches snapshot", () => {
    const { container } = render(<Video src="movie.mp4" />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Video src="movie.mp4" />);
    await expectNoA11yViolations(result);
  });
});
