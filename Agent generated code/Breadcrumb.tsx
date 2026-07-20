/**
 * [ForgeOS UI] Breadcrumb
 * Navigation trail showing the user's location within a hierarchy.
 * The final item renders as the non-interactive current page.
 */
import React from "react";
import { cn } from "../utils/classNames";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, separator = "/", className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm text-neutral-400", className)}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-neutral-100 font-medium">
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded"
                >
                  {item.label}
                </button>
              )}
              {!isLast && <span aria-hidden="true" className="text-neutral-600">{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = "Breadcrumb";
