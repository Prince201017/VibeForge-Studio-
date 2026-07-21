import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualizedList } from "./VirtualizedList";

const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row ${i}` }));

describe("VirtualizedList", () => {
  it("renders only a windowed subset of rows, not all 1000", () => {
    render(
      <VirtualizedList
        items={items}
        itemHeight={30}
        height={300}
        getKey={(item) => item.id}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );
    const rendered = screen.getAllByText(/Row \d+/);
    expect(rendered.length).toBeLessThan(items.length);
    expect(rendered.length).toBeGreaterThan(0);
  });

  it("renders the first row's content", () => {
    render(
      <VirtualizedList
        items={items}
        itemHeight={30}
        height={300}
        getKey={(item) => item.id}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );
    expect(screen.getByText("Row 0")).toBeInTheDocument();
  });
});
