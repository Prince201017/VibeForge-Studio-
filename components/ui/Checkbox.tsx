// [Claude.A12] Checkbox with indeterminate-state support.
import React, { useEffect, useRef } from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  indeterminate?: boolean;
}

export function Checkbox({ label, indeterminate, id, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const checkboxId = id ?? `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm">
      <input ref={ref} id={checkboxId} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" {...rest} />
      {label}
    </label>
  );
}
