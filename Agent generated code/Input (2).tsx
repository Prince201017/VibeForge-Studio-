/**
 * [ForgeOS UI] Input
 * Standard text input with leading/trailing icon slots, size variants,
 * and validation states. Forwards refs so it composes with react-hook-form
 * and similar libraries.
 */
import React, { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/classNames";
import type { Size } from "../types";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: Size;
  error?: string;
  helperText?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  label?: string;
}

const sizeClass: Record<Size, string> = {
  sm: "h-8 text-xs px-2",
  md: "h-9 text-sm px-3",
  lg: "h-11 text-base px-4",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = "md",
      error,
      helperText,
      leadingIcon,
      trailingIcon,
      label,
      id,
      className,
      disabled,
      required,
      ...rest
    },
    ref
  ) => {
    const inputId = id ?? React.useId();
    const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-neutral-300">
            {label}
            {required && <span className="text-rose-400 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="absolute left-2.5 text-neutral-500 pointer-events-none">{leadingIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full rounded-md bg-neutral-900 border text-neutral-100 placeholder-neutral-500 transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-0",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              error ? "border-rose-500" : "border-neutral-700 hover:border-neutral-600",
              sizeClass[size],
              leadingIcon && "pl-8",
              trailingIcon && "pr-8",
              className
            )}
            {...rest}
          />
          {trailingIcon && (
            <span className="absolute right-2.5 text-neutral-500 pointer-events-none">{trailingIcon}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
