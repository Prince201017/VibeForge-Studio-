/**
 * [ForgeOS UI] IconButton
 * Icon-only button. Always requires an `aria-label` since there is no
 * visible text for assistive tech to read.
 */
import React, { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Size, Variant } from "../types";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  icon: ReactNode;
  "aria-label": string;
  variant?: Variant;
  size?: Size;
  circular?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "bg-indigo-500 text-white hover:bg-indigo-400",
  secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
  tertiary: "bg-transparent text-neutral-300 hover:bg-neutral-800",
  ghost: "bg-transparent text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
};

const sizeClass: Record<Size, string> = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = "ghost", size = "md", circular = false, disabled, className, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        circular ? "rounded-full" : "rounded-md",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    >
      {icon}
    </button>
  )
);

IconButton.displayName = "IconButton";
