// [Claude.A12] Native-backed Select (keeps a11y/keyboard nav free from the browser).
import React from "react";

export interface SelectOption { value: string; label: string; }
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, id, className = "", ...rest }, ref) => {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={selectId} className="text-sm font-medium text-slate-700">{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${className}`}
          {...rest}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";
