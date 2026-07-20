// [Claude.A12] Range slider — used for e.g. animation timeline scrubbing, opacity.
import React from "react";

export interface SliderProps {
  value: number; min: number; max: number; step?: number;
  onChange: (value: number) => void;
  label?: string;
}

export function Slider({ value, min, max, step = 1, onChange, label }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <div className="flex justify-between text-sm"><span>{label}</span><span className="text-slate-500">{value}</span></div>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
      />
    </div>
  );
}
