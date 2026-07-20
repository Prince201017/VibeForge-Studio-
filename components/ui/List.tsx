/**
 * [ForgeOS UI] List
 * Simple vertical list container. Pair with ListItem for rows; see
 * VirtualizedList for large (10K+ row) collections.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface ListProps {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
  "aria-label"?: string;
}

export const List: React.FC<ListProps> = ({ children, bordered = false, className, ...rest }) => (
  <ul
    role="list"
    className={cn("flex flex-col divide-y divide-neutral-800", bordered && "rounded-md border border-neutral-800 overflow-hidden", className)}
    {...rest}
  >
    {children}
  </ul>
);

List.displayName = "List";
