/**
 * [ForgeOS UI] NumberInput
 * Numeric field with up/down stepper buttons, min/max clamping, and
 * optional unit suffix (e.g. "px", "%") common in property inspectors.
 */
import React, { forwardRef } from "react";
import { cn } from "../utils/classNames";
import type { Size } from "../types";

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  size?: Size;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const sizeClass: Record<Size, string> = { sm: "h-7 text-xs", md: "h-9 text-sm", lg: "h-11 text-base" };

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min = -Infinity, max = Infinity, step = 1, precision, unit, size = "md", disabled, label, className }, ref) => {
    const clamp = (v: number) => {
      const clamped = Math.min(max, Math.max(min, v));
      return precision !== undefined ? Number(clamped.toFixed(precision)) : clamped;
    };

    const id = React.useId();

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        {label && <label htmlFor={id} className="text-xs font-medium text-neutral-300">{label}</label>}
        <div className={cn("flex items-stretch rounded-md border border-neutral-700 bg-neutral-900 overflow-hidden", disabled && "opacity-40")}>
          <input
            ref={ref}
            id={id}
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className={cn(
              "w-full min-w-0 flex-1 bg-transparent px-2 text-neutral-100 tabular-nums outline-none",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:-outline-offset-2",
              sizeClass[size],
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
          />
          {unit && <span className="flex items-center px-2 text-xs text-neutral-500 border-l border-neutral-800">{unit}</span>}
          <div className="flex flex-col border-l border-neutral-800">
            <button type="button" disabled={disabled} aria-label="Increment" onClick={() => onChange(clamp(value + step))} className="flex-1 px-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 text-[9px] leading-none">▲</button>
            <button type="button" disabled={disabled} aria-label="Decrement" onClick={() => onChange(clamp(value - step))} className="flex-1 px-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 text-[9px] leading-none border-t border-neutral-800">▼</button>
          </div>
        </div>
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
