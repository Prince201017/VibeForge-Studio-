/**
 * [ForgeOS UI] Checkbox
 * Custom-styled checkbox built on a real <input type="checkbox"> for
 * native semantics/keyboard support, with an indeterminate visual state.
 */
import React, { forwardRef, useEffect, useRef } from "react";
import { cn } from "../utils/classNames";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  indeterminate?: boolean;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate = false, error, id, disabled, className, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const checkboxId = id ?? React.useId();

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={checkboxId} className={cn("flex items-center gap-2 text-sm text-neutral-200", disabled && "opacity-40 cursor-not-allowed")}>
          <span className="relative inline-flex h-4 w-4 shrink-0">
            <input
              ref={(node) => {
                innerRef.current = node;
                if (typeof forwardedRef === "function") forwardedRef(node);
                else if (forwardedRef) forwardedRef.current = node;
              }}
              id={checkboxId}
              type="checkbox"
              disabled={disabled}
              aria-invalid={!!error}
              className={cn(
                "peer h-4 w-4 appearance-none rounded border bg-neutral-900 border-neutral-600 cursor-pointer",
                "checked:bg-indigo-500 checked:border-indigo-500 indeterminate:bg-indigo-500 indeterminate:border-indigo-500",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-1",
                "disabled:cursor-not-allowed",
                error && "border-rose-500",
                className
              )}
              {...rest}
            />
            <svg
              className="pointer-events-none absolute inset-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {label}
        </label>
        {error && <p role="alert" className="text-xs text-rose-400 pl-6">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
