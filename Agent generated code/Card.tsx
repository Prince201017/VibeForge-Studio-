/**
 * [ForgeOS UI] Card
 * Generic surface container with optional header/footer sections,
 * hover elevation, and padding variants.
 */
import React, { type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const paddingClass = { none: "p-0", sm: "p-3", md: "p-4", lg: "p-6" } as const;

export const Card: React.FC<CardProps> = ({ children, header, footer, hoverable = false, padding = "md", className, onClick }) => {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "rounded-lg border border-neutral-800 bg-neutral-900 shadow-sm transition-all",
        hoverable && "hover:border-neutral-700 hover:shadow-lg hover:-translate-y-0.5",
        interactive && "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
        className
      )}
    >
      {header && <div className="px-4 py-3 border-b border-neutral-800">{header}</div>}
      <div className={paddingClass[padding]}>{children}</div>
      {footer && <div className="px-4 py-3 border-t border-neutral-800">{footer}</div>}
    </div>
  );
};

Card.displayName = "Card";
