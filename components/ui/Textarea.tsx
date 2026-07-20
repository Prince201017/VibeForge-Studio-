/**
 * [ForgeOS UI] Textarea
 * Multi-line text input with an optional auto-expanding height and a
 * live character counter when `maxLength` is set.
 */
import React, { forwardRef, useEffect, useRef } from "react";
import { cn } from "../utils/classNames";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
  label?: string;
  autoExpand?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, helperText, label, autoExpand = false, id, className, maxLength, value, onChange, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const textareaId = id ?? React.useId();

    const resize = () => {
      const el = innerRef.current;
      if (!el || !autoExpand) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(resize, [value, autoExpand]);

    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-neutral-300">
            {label}
          </label>
        )}
        <textarea
          ref={(node) => {
            innerRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          onChange={(e) => {
            onChange?.(e);
            resize();
          }}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-md bg-neutral-900 border text-sm text-neutral-100 placeholder-neutral-500 px-3 py-2 transition-colors resize-y min-h-[80px]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error ? "border-rose-500" : "border-neutral-700 hover:border-neutral-600",
            autoExpand && "resize-none overflow-hidden",
            className
          )}
          {...rest}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
            {!error && helperText && <p className="text-xs text-neutral-500">{helperText}</p>}
          </div>
          {maxLength && (
            <span className="text-xs text-neutral-500 tabular-nums">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
