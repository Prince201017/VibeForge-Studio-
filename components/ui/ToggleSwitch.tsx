/**
 * [ForgeOS UI] ToggleSwitch
 * Binary on/off switch built with role="switch" for correct screen
 * reader announcements, with optional on/off text labels.
 */
import React from "react";
import { cn } from "../utils/classNames";
import type { Size } from "../types";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  onLabel?: string;
  offLabel?: string;
  size?: Size;
  disabled?: boolean;
  className?: string;
}

const trackSize: Record<Size, string> = {
  sm: "h-4 w-7",
  md: "h-5 w-9",
  lg: "h-6 w-11",
};

const thumbSize: Record<Size, string> = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const thumbTravel: Record<Size, string> = {
  sm: "translate-x-3",
  md: "translate-x-4",
  lg: "translate-x-5",
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  onLabel,
  offLabel,
  size = "md",
  disabled = false,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-sm text-neutral-200">{label}</span>}
      {offLabel && <span className={cn("text-xs", !checked ? "text-neutral-200" : "text-neutral-500")}>{offLabel}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          checked ? "bg-indigo-500" : "bg-neutral-700",
          trackSize[size]
        )}
      >
        <span
          className={cn(
            "inline-block transform rounded-full bg-white shadow transition-transform duration-200 translate-x-1",
            thumbSize[size],
            checked && thumbTravel[size]
          )}
        />
      </button>
      {onLabel && <span className={cn("text-xs", checked ? "text-neutral-200" : "text-neutral-500")}>{onLabel}</span>}
    </div>
  );
};

ToggleSwitch.displayName = "ToggleSwitch";
