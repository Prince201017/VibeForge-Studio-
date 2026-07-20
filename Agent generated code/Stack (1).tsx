/**
 * [ForgeOS UI] Stack
 * Vertical or horizontal flex stack with configurable spacing and
 * alignment. Optionally switches direction at the `sm` breakpoint for
 * simple responsive layouts (e.g. toolbar -> column on mobile).
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Alignment, BaseComponentProps, Orientation } from "../types";

export interface StackProps extends BaseComponentProps {
  children: ReactNode;
  direction?: Orientation;
  /** Collapse to vertical stacking below the `sm` breakpoint. */
  responsive?: boolean;
  gap?: number;
  align?: Alignment;
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
}

const alignMap: Record<Alignment, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyMap: Record<NonNullable<StackProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export const Stack: React.FC<StackProps> = ({
  children,
  direction = "vertical",
  responsive = false,
  gap = 2,
  align = "stretch",
  justify = "start",
  wrap = false,
  className,
  id,
  "data-testid": testId,
}) => {
  const base = direction === "horizontal" ? "flex-row" : "flex-col";
  const responsiveClass = responsive
    ? direction === "horizontal"
      ? "flex-col sm:flex-row"
      : "flex-row sm:flex-col"
    : base;

  return (
    <div
      id={id}
      data-testid={testId}
      className={cn(
        "flex",
        responsive ? responsiveClass : base,
        `gap-${gap}`,
        alignMap[align],
        justifyMap[justify],
        wrap && "flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
};

Stack.displayName = "Stack";
