/**
 * [ForgeOS UI] Select
 * Custom dropdown selector supporting single/multi-select, option
 * grouping, and a search filter. Uses simple windowing (renders only
 * the options near the viewport) rather than a full virtualization
 * library so it stays dependency-free for large (10K+) option lists.
 */
import React, { useMemo, useRef, useState } from "react";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";
import { useDebounce } from "../hooks/useDebounce";
import type { OptionGroup, OptionType, Size } from "../types";

export interface SelectProps<T = string> {
  options: OptionType<T>[] | OptionGroup<T>[];
  value: T | T[] | null;
  onChange: (value: T | T[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  size?: Size;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** Row height in px, used for the windowed render. */
  rowHeight?: number;
  maxVisibleRows?: number;
}

function isGrouped<T>(opts: OptionType<T>[] | OptionGroup<T>[]): opts is OptionGroup<T>[] {
  return opts.length > 0 && "options" in opts[0];
}

function flatten<T>(opts: OptionType<T>[] | OptionGroup<T>[]): OptionType<T>[] {
  return isGrouped(opts) ? opts.flatMap((g) => g.options) : opts;
}

export function Select<T = string>({
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  placeholder = "Select...",
  size = "md",
  error,
  disabled = false,
  className,
  rowHeight = 32,
  maxVisibleRows = 8,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 150);
  const [scrollTop, setScrollTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useClickOutside(rootRef, () => setOpen(false), open);

  const flatOptions = useMemo(() => flatten(options), [options]);
  const filtered = useMemo(() => {
    if (!searchable || !debouncedQuery) return flatOptions;
    const q = debouncedQuery.toLowerCase();
    return flatOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [flatOptions, searchable, debouncedQuery]);

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : value;

  const selectedLabel = () => {
    if (multiple) {
      const count = (selectedValues as T[]).length;
      return count === 0 ? placeholder : `${count} selected`;
    }
    return flatOptions.find((o) => o.value === value)?.label ?? placeholder;
  };

  const toggleOption = (opt: OptionType<T>) => {
    if (opt.disabled) return;
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const exists = current.includes(opt.value);
      onChange(exists ? current.filter((v) => v !== opt.value) : [...current, opt.value]);
    } else {
      onChange(opt.value);
      setOpen(false);
    }
  };

  const isSelected = (opt: OptionType<T>) =>
    multiple ? (selectedValues as T[]).includes(opt.value) : value === opt.value;

  const listHeight = Math.min(filtered.length, maxVisibleRows) * rowHeight;
  const totalHeight = filtered.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(filtered.length, startIndex + maxVisibleRows + 4);
  const visible = filtered.slice(startIndex, endIndex);

  const sizeClass: Record<Size, string> = {
    sm: "h-8 text-xs px-2",
    md: "h-9 text-sm px-3",
    lg: "h-11 text-base px-4",
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between rounded-md bg-neutral-900 border text-left text-neutral-100",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed",
          error ? "border-rose-500" : "border-neutral-700 hover:border-neutral-600",
          sizeClass[size]
        )}
      >
        <span className={cn("truncate", (multiple ? (selectedValues as T[]).length === 0 : !value) && "text-neutral-500")}>
          {selectedLabel()}
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={cn("shrink-0 transition-transform", open && "rotate-180")}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute z-40 mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 shadow-xl overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-neutral-800">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search options..."
                className="w-full h-7 px-2 text-xs rounded bg-neutral-800 border border-neutral-700 text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              />
            </div>
          )}
          <div
            style={{ maxHeight: listHeight, overflowY: "auto" }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {visible.map((opt, i) => (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected(opt)}
                  onClick={() => toggleOption(opt)}
                  style={{ position: "absolute", top: (startIndex + i) * rowHeight, height: rowHeight }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 text-sm cursor-pointer",
                    opt.disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-neutral-800",
                    isSelected(opt) && "bg-indigo-500/10 text-indigo-300"
                  )}
                >
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-500">No options found</div>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

Select.displayName = "Select";
