/**
 * [ForgeOS UI] Table
 * Data table with sortable columns, a text filter, checkbox row
 * selection, client-side pagination, and optional expandable row
 * detail panels. Designed for moderate (hundreds, not 100K+) row
 * counts; pair with VirtualizedList for larger datasets.
 */
import React, { useMemo, useState, type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  width?: string;
}

export interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  pageSize?: number;
  filterable?: boolean;
  renderExpanded?: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  getRowId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  pageSize = 20,
  filterable = false,
  renderExpanded,
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const internalSelected = selectedIds ?? new Set<string>();

  const filtered = useMemo(() => {
    if (!filterable || !filter) return data;
    const q = filter.toLowerCase();
    return data.filter((row) => columns.some((c) => String(c.render(row)).toLowerCase().includes(q)));
  }, [data, filter, filterable, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortAccessor) return filtered;
    const accessor = col.sortAccessor;
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(internalSelected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange?.(next);
  };

  const toggleAll = () => {
    if (internalSelected.size === pageRows.length) onSelectionChange?.(new Set());
    else onSelectionChange?.(new Set(pageRows.map(getRowId)));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {filterable && (
        <input
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Filter rows..."
          className="h-8 w-64 px-2 text-xs rounded bg-neutral-900 border border-neutral-700 text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        />
      )}
      <div className="overflow-x-auto rounded-md border border-neutral-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
            <tr>
              {selectable && (
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={pageRows.length > 0 && internalSelected.size === pageRows.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {renderExpanded && <th className="w-8" />}
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }} className="px-3 py-2 font-medium">
                  <button
                    type="button"
                    disabled={!col.sortable}
                    onClick={() => toggleSort(col)}
                    className={cn("flex items-center gap-1", col.sortable && "hover:text-neutral-200")}
                  >
                    {col.header}
                    {col.sortable && sortKey === col.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {pageRows.map((row) => {
              const id = getRowId(row);
              const isExpanded = expanded.has(id);
              return (
                <React.Fragment key={id}>
                  <tr className="hover:bg-neutral-900/60">
                    {selectable && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={internalSelected.has(id)}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    )}
                    {renderExpanded && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label="Toggle row detail"
                          onClick={() => {
                            const next = new Set(expanded);
                            next.has(id) ? next.delete(id) : next.add(id);
                            setExpanded(next);
                          }}
                          className="text-neutral-400 hover:text-neutral-100"
                        >
                          <span className={cn("inline-block transition-transform", isExpanded && "rotate-90")}>›</span>
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 text-neutral-200">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                  {renderExpanded && isExpanded && (
                    <tr>
                      <td colSpan={columns.length + 2} className="bg-neutral-900/40 px-3 py-3">
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-neutral-500">
                  No rows to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 hover:text-neutral-200">
              Previous
            </button>
            <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 hover:text-neutral-200">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Table.displayName = "Table";
