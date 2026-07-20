import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ButtonGroup } from "./ButtonGroup";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("ButtonGroup", () => {
  it("renders as a radiogroup in segmented mode", () => {
    render(<ButtonGroup segmented={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the newly selected segment", () => {
    const onChange = vi.fn();
    render(<ButtonGroup segmented={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("renders as a group when children are passed", () => {
    render(<ButtonGroup><button>One</button><button>Two</button></ButtonGroup>);
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<ButtonGroup segmented={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<ButtonGroup segmented={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} value="a" onChange={vi.fn()} />);
    await expectNoA11yViolations(result);
  });
});
