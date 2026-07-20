/**
 * [ForgeOS UI] Grid
 * Responsive CSS grid layout with configurable columns and gap.
 * Column count can be a single number or a per-breakpoint map.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { BaseComponentProps } from "../types";

type ColumnConfig = number | { base?: number; sm?: number; md?: number; lg?: number };

export interface GridProps extends BaseComponentProps {
  children: ReactNode;
  columns?: ColumnConfig;
  gap?: number;
}

const colClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

const smColClass: Record<number, string> = {
  1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 6: "sm:grid-cols-6",
};
const mdColClass: Record<number, string> = {
  1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4", 6: "md:grid-cols-6",
};
const lgColClass: Record<number, string> = {
  1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 6: "lg:grid-cols-6", 12: "lg:grid-cols-12",
};

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 12,
  gap = 4,
  className,
  id,
  "data-testid": testId,
}) => {
  const classes =
    typeof columns === "number"
      ? colClass[columns] ?? "grid-cols-12"
      : cn(
          columns.base && colClass[columns.base],
          columns.sm && smColClass[columns.sm],
          columns.md && mdColClass[columns.md],
          columns.lg && lgColClass[columns.lg]
        );

  return (
    <div
      id={id}
      data-testid={testId}
      className={cn("grid", classes, `gap-${gap}`, className)}
    >
      {children}
    </div>
  );
};

Grid.displayName = "Grid";
