import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { List } from "./List";
import { ListItem } from "./ListItem";
import { expectNoA11yViolations } from "../__tests__/testUtils";

describe("List", () => {
  it("renders as a list role with items", () => {
    render(
      <List>
        <ListItem title="A" />
        <ListItem title="B" />
      </List>
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("has no a11y violations", async () => {
    const result = render(
      <List bordered>
        <ListItem title="A" />
      </List>
    );
    await expectNoA11yViolations(result);
  });
});
