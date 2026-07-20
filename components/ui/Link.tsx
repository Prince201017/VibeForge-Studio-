/**
 * [ForgeOS UI] Link
 * Text link for internal or external navigation. External links get
 * rel="noopener noreferrer" automatically and an icon affordance.
 */
import React, { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/classNames";

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  external?: boolean;
  underline?: "always" | "hover" | "none";
  icon?: ReactNode;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ external = false, underline = "hover", icon, className, children, target, rel, ...rest }, ref) => {
    const underlineClass = {
      always: "underline",
      hover: "no-underline hover:underline",
      none: "no-underline",
    }[underline];

    return (
      <a
        ref={ref}
        target={external ? target ?? "_blank" : target}
        rel={external ? rel ?? "noopener noreferrer" : rel}
        className={cn(
          "inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded",
          underlineClass,
          className
        )}
        {...rest}
      >
        {children}
        {icon}
        {external && !icon && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3h7v7M13 3L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </a>
    );
  }
);

Link.displayName = "Link";
