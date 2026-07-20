// [Claude.A12] Text input with label, error state, and helper text.
import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", ...rest }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${error ? "border-red-500 focus:ring-red-300" : "border-slate-300 focus:ring-indigo-300"} ${className}`}
          {...rest}
        />
        {error ? (
          <span id={`${inputId}-error`} className="text-xs text-red-600">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
