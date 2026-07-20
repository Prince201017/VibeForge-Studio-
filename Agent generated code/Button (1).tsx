/**
 * [ForgeOS UI] Button
 * Primary interactive control. Supports variant/size/full-width/icon
 * props and a built-in loading state that swaps the label for a
 * spinner while keeping the button's width stable.
 */
import React, { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/classNames";
import { LoadingSpinner } from "../display/LoadingSpinner";
import type { Size, Variant } from "../types";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: "leading" | "trailing";
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: "bg-indigo-500 text-white hover:bg-indigo-400 border border-transparent",
  secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700",
  tertiary: "bg-transparent text-neutral-200 hover:bg-neutral-800 border border-transparent",
  ghost: "bg-transparent text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 border border-transparent",
  danger: "bg-rose-500 text-white hover:bg-rose-400 border border-transparent",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      iconPosition = "leading",
      fullWidth = false,
      disabled,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          variantClass[variant],
          sizeClass[size],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" color={variant === "secondary" || variant === "tertiary" || variant === "ghost" ? "neutral" : "white"} />
        ) : (
          <>
            {icon && iconPosition === "leading" && icon}
            {children}
            {icon && iconPosition === "trailing" && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
