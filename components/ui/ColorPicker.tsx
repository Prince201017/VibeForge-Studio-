/**
 * [ForgeOS UI] ColorPicker
 * Popover-based color input supporting HEX text entry, a native color
 * wheel fallback, preset swatches, and the browser EyeDropper API where
 * available (Chromium-based browsers; gracefully hidden elsewhere).
 */
import React, { useRef, useState } from "react";
import { cn } from "../utils/classNames";
import { useClickOutside } from "../hooks/useClickOutside";

export interface ColorPickerProps {
  value: string; // hex, e.g. "#6366F1"
  onChange: (hex: string) => void;
  presets?: string[];
  label?: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PRESETS = [
  "#EF4444", "#F59E0B", "#EAB308", "#22C55E", "#06B6D4",
  "#6366F1", "#A855F7", "#EC4899", "#FFFFFF", "#71717A", "#18181B",
];

const isValidHex = (hex: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  label,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  useClickOutside(rootRef, () => setOpen(false), open);

  const commit = (hex: string) => {
    setDraft(hex);
    if (isValidHex(hex)) onChange(hex);
  };

  const useEyeDropper = async () => {
    try {
      // @ts-expect-error EyeDropper is not yet in the standard DOM lib types
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      commit(result.sRGBHex);
    } catch {
      // user cancelled the pick; no-op
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label && <label className="block text-xs font-medium text-neutral-300 mb-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 h-9 px-2 rounded-md border border-neutral-700 bg-neutral-900 hover:border-neutral-600 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        <span className="h-5 w-5 rounded border border-neutral-600" style={{ backgroundColor: value }} />
        <span className="text-sm text-neutral-200 tabular-nums">{value.toUpperCase()}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Color picker" className="absolute z-40 mt-1 w-56 rounded-md border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="color"
              value={isValidHex(value) ? value : "#000000"}
              onChange={(e) => commit(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-neutral-700 bg-transparent"
              aria-label="Pick a color"
            />
            <input
              value={draft}
              onChange={(e) => commit(e.target.value)}
              placeholder="#000000"
              className={cn(
                "flex-1 h-8 px-2 text-xs rounded bg-neutral-800 border text-neutral-100 tabular-nums",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                isValidHex(draft) ? "border-neutral-700" : "border-rose-500"
              )}
            />
            {hasEyeDropper && (
              <button
                type="button"
                onClick={useEyeDropper}
                aria-label="Pick color from screen"
                className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M11 2l3 3-6.5 6.5-3-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M4.5 9.5L2 14l4.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="listbox" aria-label="Color presets">
            {presets.map((hex) => (
              <button
                key={hex}
                type="button"
                role="option"
                aria-selected={hex.toLowerCase() === value.toLowerCase()}
                aria-label={hex}
                onClick={() => {
                  commit(hex);
                  setOpen(false);
                }}
                style={{ backgroundColor: hex }}
                className={cn(
                  "h-6 w-6 rounded border focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                  hex.toLowerCase() === value.toLowerCase() ? "border-indigo-400 ring-2 ring-indigo-500/40" : "border-neutral-700"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

ColorPicker.displayName = "ColorPicker";
