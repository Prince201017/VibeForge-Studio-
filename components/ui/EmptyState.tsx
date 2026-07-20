/**
 * [ForgeOS UI] EmptyState
 * Placeholder shown when a list, panel, or search result set is empty.
 * Written as an invitation to act, per interface-copy guidelines: pair
 * a plain description with a single primary action where one exists.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-10", className)}>
      {icon && <div className="mb-3 text-neutral-600">{icon}</div>}
      <p className="text-sm font-semibold text-neutral-200">{title}</p>
      {description && <p className="mt-1 text-xs text-neutral-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

EmptyState.displayName = "EmptyState";
