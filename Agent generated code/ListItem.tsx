/**
 * [ForgeOS UI] ListItem
 * Single row within a List: leading icon/avatar, primary + secondary
 * text, and a trailing actions slot. Supports a selected state for
 * use in file browsers, layer panels, etc.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface ListItemProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({ leading, title, subtitle, actions, selected = false, onClick, className }) => {
  const interactive = !!onClick;
  return (
    <li
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-selected={interactive ? selected : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm",
        interactive && "cursor-pointer hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:-outline-offset-2",
        selected && "bg-indigo-500/10",
        className
      )}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate", selected ? "text-indigo-300 font-medium" : "text-neutral-100")}>{title}</p>
        {subtitle && <p className="truncate text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
    </li>
  );
};

ListItem.displayName = "ListItem";
