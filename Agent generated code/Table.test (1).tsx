import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Table } from "./Table";
import { expectNoA11yViolations } from "../__tests__/testUtils";

interface Row { id: string; name: string; }
const data: Row[] = [{ id: "1", name: "Beta" }, { id: "2", name: "Alpha" }];
const columns = [{ key: "name", header: "Name", render: (r: Row) => r.name, sortable: true, sortAccessor: (r: Row) => r.name }];

describe("Table", () => {
  it("renders column headers and row data", () => {
    render(<Table columns={columns} data={data} getRowId={(r) => r.id} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("sorts rows when a sortable header is clicked", () => {
    render(<Table columns={columns} data={data} getRowId={(r) => r.id} />);
    fireEvent.click(screen.getByRole("button", { name: /name/i }));
    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("Alpha");
  });

  it("calls onSelectionChange when a row checkbox is toggled", () => {
    const onSelectionChange = vi.fn();
    render(<Table columns={columns} data={data} getRowId={(r) => r.id} selectable onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByLabelText("Select row 1"));
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it("filters rows by the filter input", () => {
    render(<Table columns={columns} data={data} getRowId={(r) => r.id} filterable />);
    fireEvent.change(screen.getByPlaceholderText(/filter rows/i), { target: { value: "Alpha" } });
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("matches snapshot", () => {
    const { container } = render(<Table columns={columns} data={data} getRowId={(r) => r.id} />);
    expect(container).toMatchSnapshot();
  });

  it("has no a11y violations", async () => {
    const result = render(<Table columns={columns} data={data} getRowId={(r) => r.id} />);
    await expectNoA11yViolations(result);
  });
});
