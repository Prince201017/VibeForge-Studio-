/**
 * [ForgeOS UI] Radio / RadioGroup
 * Mutually-exclusive option group built on native radio inputs (`role`
 * is implicit via <fieldset>/<input type="radio">) with vertical or
 * horizontal layout.
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Orientation } from "../types";

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  legend: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  orientation?: Orientation;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  legend,
  options,
  value,
  onChange,
  orientation = "vertical",
  error,
  className,
}) => {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="text-xs font-medium text-neutral-300 mb-1">{legend}</legend>
      <div className={cn("flex gap-3", orientation === "vertical" ? "flex-col" : "flex-row flex-wrap")}>
        {options.map((opt) => {
          const id = `${name}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn("flex items-center gap-2 text-sm text-neutral-200", opt.disabled && "opacity-40 cursor-not-allowed")}
            >
              <span className="relative inline-flex h-4 w-4 shrink-0">
                <input
                  id={id}
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={value === opt.value}
                  disabled={opt.disabled}
                  onChange={() => onChange(opt.value)}
                  className={cn(
                    "peer h-4 w-4 appearance-none rounded-full border bg-neutral-900 border-neutral-600 cursor-pointer",
                    "checked:border-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-1",
                    "disabled:cursor-not-allowed",
                    error && "border-rose-500"
                  )}
                />
                <span className="pointer-events-none absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-indigo-500 opacity-0 peer-checked:opacity-100" />
              </span>
              {opt.label}
            </label>
          );
        })}
      </div>
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
    </fieldset>
  );
};

RadioGroup.displayName = "RadioGroup";
