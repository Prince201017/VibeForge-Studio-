/**
 * [ForgeOS UI] TimeInput
 * Hour/minute/(optional) second time entry with 12h or 24h display.
 * Each segment is independently keyboard-editable (Up/Down to
 * increment, digits to type directly), similar to native time inputs
 * but themeable to match the rest of the library.
 */
import React, { useState } from "react";
import { cn } from "../utils/classNames";

export interface TimeValue {
  hours: number; // 0-23, always stored in 24h form
  minutes: number;
  seconds?: number;
}

export interface TimeInputProps {
  value: TimeValue;
  onChange: (value: TimeValue) => void;
  showSeconds?: boolean;
  format?: "12h" | "24h";
  label?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, showSeconds = false, format = "24h", label, className }) => {
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(value.hours >= 12 ? "PM" : "AM");

  const displayHours = format === "12h" ? (value.hours % 12 === 0 ? 12 : value.hours % 12) : value.hours;

  const setHours = (h: number) => {
    if (format === "12h") {
      const base = h % 12;
      onChange({ ...value, hours: meridiem === "PM" ? base + 12 : base });
    } else {
      onChange({ ...value, hours: ((h % 24) + 24) % 24 });
    }
  };

  const segmentInput = (
    val: number,
    max: number,
    onSet: (v: number) => void,
    ariaLabel: string
  ) => (
    <input
      aria-label={ariaLabel}
      value={pad(val)}
      onChange={(e) => {
        const num = Number(e.target.value.replace(/\D/g, "").slice(-2));
        if (!Number.isNaN(num)) onSet(Math.min(max, num));
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") onSet((val + 1) % (max + 1));
        if (e.key === "ArrowDown") onSet((val - 1 + max + 1) % (max + 1));
      }}
      className="w-7 bg-transparent text-center text-neutral-100 tabular-nums outline-none focus-visible:bg-neutral-800 rounded"
    />
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <span className="text-xs font-medium text-neutral-300">{label}</span>}
      <div className="flex items-center gap-1 h-9 px-2 rounded-md border border-neutral-700 bg-neutral-900 w-fit focus-within:outline focus-within:outline-2 focus-within:outline-indigo-500">
        {segmentInput(displayHours, format === "12h" ? 12 : 23, setHours, "Hours")}
        <span className="text-neutral-500">:</span>
        {segmentInput(value.minutes, 59, (m) => onChange({ ...value, minutes: m }), "Minutes")}
        {showSeconds && (
          <>
            <span className="text-neutral-500">:</span>
            {segmentInput(value.seconds ?? 0, 59, (s) => onChange({ ...value, seconds: s }), "Seconds")}
          </>
        )}
        {format === "12h" && (
          <button
            type="button"
            onClick={() => {
              const next = meridiem === "AM" ? "PM" : "AM";
              setMeridiem(next);
              const base = value.hours % 12;
              onChange({ ...value, hours: next === "PM" ? base + 12 : base });
            }}
            className="ml-1 text-xs font-medium text-neutral-400 hover:text-neutral-100"
          >
            {meridiem}
          </button>
        )}
      </div>
    </div>
  );
};

TimeInput.displayName = "TimeInput";
