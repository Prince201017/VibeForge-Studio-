/**
 * [ForgeOS UI] DateInput
 * Text field backed by a calendar popup. Supports single-date and
 * range selection. The calendar grid is generated locally (no date
 * library dependency) using plain Date arithmetic in the local
 * timezone.
 */
import React, { useMemo, useRef, useState } from "react";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";

export interface DateInputProps {
  value: Date | null;
  onChange: (date: Date) => void;
  range?: false;
  label?: string;
  className?: string;
}

export interface DateRangeInputProps {
  value: [Date | null, Date | null];
  onChange: (range: [Date, Date | null]) => void;
  range: true;
  label?: string;
  className?: string;
}

const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function useCalendarGrid(monthDate: Date) {
  return useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [monthDate]);
}

export const DateInput: React.FC<DateInputProps | DateRangeInputProps> = (props) => {
  const { label, className } = props;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);

  const cells = useCalendarGrid(viewMonth);
  const id = React.useId();

  const isSelected = (d: Date) => {
    if (props.range) {
      const [start, end] = props.value;
      return (start && d.toDateString() === start.toDateString()) || (end && d.toDateString() === end.toDateString());
    }
    return props.value && d.toDateString() === props.value.toDateString();
  };

  const inRange = (d: Date) => {
    if (!props.range) return false;
    const [start, end] = props.value;
    return !!start && !!end && d > start && d < end;
  };

  const handlePick = (d: Date) => {
    if (props.range) {
      const [start, end] = props.value;
      if (!start || (start && end)) {
        props.onChange([d, null]);
      } else if (d < start) {
        props.onChange([d, start]);
      } else {
        props.onChange([start, d]);
        setOpen(false);
      }
    } else {
      props.onChange(d);
      setOpen(false);
    }
  };

  const displayValue = props.range
    ? `${props.value[0] ? fmt(props.value[0]) : "Start"} — ${props.value[1] ? fmt(props.value[1]) : "End"}`
    : props.value
    ? fmt(props.value)
    : "Select a date";

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1", className)}>
      {label && <label htmlFor={id} className="text-xs font-medium text-neutral-300">{label}</label>}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        className="h-9 px-3 rounded-md border border-neutral-700 bg-neutral-900 text-left text-sm text-neutral-100 hover:border-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        {displayValue}
      </button>

      {open && (
        <div role="dialog" aria-label="Choose date" className="absolute z-40 top-full mt-1 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <button type="button" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))} className="p-1 text-neutral-400 hover:text-neutral-100">‹</button>
            <span className="text-sm font-medium text-neutral-200">
              {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))} className="p-1 text-neutral-400 hover:text-neutral-100">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-500 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={!d}
                onClick={() => d && handlePick(d)}
                className={cn(
                  "h-7 w-7 rounded text-xs text-neutral-200",
                  !d && "invisible",
                  d && !isSelected(d) && !inRange(d) && "hover:bg-neutral-800",
                  d && isSelected(d) && "bg-indigo-500 text-white",
                  d && inRange(d) && "bg-indigo-500/20"
                )}
              >
                {d?.getDate()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

DateInput.displayName = "DateInput";
