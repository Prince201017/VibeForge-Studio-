/**
 * [ForgeOS UI] Slider
 * Numeric range slider. Supports a single-thumb variant (`value` is a
 * number) and a dual-thumb range variant (`value` is a [min, max]
 * tuple), both built on native <input type="range"> for keyboard and
 * screen-reader support.
 */
import React from "react";
import { cn } from "../utils/classNames";

interface SliderBaseProps {
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export interface SingleSliderProps extends SliderBaseProps {
  value: number;
  onChange: (value: number) => void;
  range?: false;
}

export interface RangeSliderProps extends SliderBaseProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  range: true;
}

export type SliderProps = SingleSliderProps | RangeSliderProps;

const trackFill = (value: number, min: number, max: number) => ((value - min) / (max - min)) * 100;

export const Slider: React.FC<SliderProps> = (props) => {
  const { min = 0, max = 100, step = 1, label, disabled, className } = props;
  const id = React.useId();

  if (props.range) {
    const [lo, hi] = props.value;
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {label && <label htmlFor={id} className="text-xs font-medium text-neutral-300">{label}</label>}
        <div className="relative h-5 flex items-center">
          <div className="absolute h-1 w-full rounded-full bg-neutral-800" />
          <div
            className="absolute h-1 rounded-full bg-indigo-500"
            style={{ left: `${trackFill(lo, min, max)}%`, right: `${100 - trackFill(hi, min, max)}%` }}
          />
          <input
            aria-label={`${label ?? "Range"} minimum`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={lo}
            disabled={disabled}
            onChange={(e) => props.onChange([Math.min(Number(e.target.value), hi), hi])}
            className="range-thumb absolute w-full appearance-none bg-transparent pointer-events-none"
          />
          <input
            aria-label={`${label ?? "Range"} maximum`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={hi}
            disabled={disabled}
            onChange={(e) => props.onChange([lo, Math.max(Number(e.target.value), lo)])}
            className="range-thumb absolute w-full appearance-none bg-transparent pointer-events-none"
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 tabular-nums">
          <span>{lo}</span>
          <span>{hi}</span>
        </div>
      </div>
    );
  }

  const { value, onChange } = props;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex justify-between">
          <label htmlFor={id} className="text-xs font-medium text-neutral-300">{label}</label>
          <span className="text-xs text-neutral-500 tabular-nums">{value}</span>
        </div>
      )}
      <div className="relative h-5 flex items-center">
        <div className="absolute h-1 w-full rounded-full bg-neutral-800" />
        <div className="absolute h-1 rounded-full bg-indigo-500" style={{ width: `${trackFill(value, min, max)}%` }} />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-thumb absolute w-full appearance-none bg-transparent"
        />
      </div>
    </div>
  );
};

Slider.displayName = "Slider";

/*
  Companion global CSS (add once to your stylesheet) to style the native
  thumb consistently across browsers, since Tailwind cannot target
  ::-webkit-slider-thumb via utility classes alone:

  .range-thumb::-webkit-slider-thumb {
    appearance: none; width: 14px; height: 14px; border-radius: 9999px;
    background: white; border: 2px solid #6366F1; cursor: pointer; pointer-events: auto;
  }
  .range-thumb::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 9999px;
    background: white; border: 2px solid #6366F1; cursor: pointer; pointer-events: auto;
  }
*/
