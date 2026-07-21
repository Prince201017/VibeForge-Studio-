/**
 * components/responsive/TouchOptimizedButton.tsx
 *
 * Button guaranteed to meet the 48x48px minimum touch target (section
 * 3 "Touch-Optimized Controls"), with visual ripple + scale-down press
 * feedback and optional haptic vibration (section 8 "Touch Feedback").
 * Uses focus-visible styling instead of hover, since touch devices have
 * no hover state.
 */

import React, { useCallback, useRef, useState } from "react";
import { cx, TOUCH_TARGET_CLASS } from "../../lib/responsive/styles";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface TouchOptimizedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children: React.ReactNode;
  variant?: Variant;
  /** Vibration pattern (ms) fired via navigator.vibrate on press. Pass `false` to disable. */
  haptic?: number | number[] | false;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional keyboard shortcut hint rendered in the corner, e.g. "⌘K". */
  shortcutHint?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

let rippleCounter = 0;

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--accent,#5b8def)] text-white",
  secondary: "bg-[var(--surface-2,#2a2a2e)] text-[var(--text,#f2f2f2)]",
  ghost: "bg-transparent text-[var(--text,#f2f2f2)]",
  danger: "bg-[var(--danger,#e5484d)] text-white",
};

export function TouchOptimizedButton({
  children,
  variant = "primary",
  haptic = 10,
  className,
  disabled,
  onClick,
  shortcutHint,
  ...rest
}: TouchOptimizedButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [pressed, setPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fireHaptic = useCallback(() => {
    if (!haptic || typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate(haptic);
  }, [haptic]);

  const spawnRipple = useCallback((clientX: number, clientY: number) => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple: Ripple = {
      id: ++rippleCounter,
      x: clientX - rect.left - size / 2,
      y: clientY - rect.top - size / 2,
      size,
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 550);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      setPressed(true);
      spawnRipple(e.clientX, e.clientY);
      fireHaptic();
    },
    [disabled, fireHaptic, spawnRipple],
  );

  const handlePointerUp = useCallback(() => setPressed(false), []);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={cx(
        TOUCH_TARGET_CLASS,
        "relative overflow-hidden select-none rounded-lg px-4 font-medium",
        "transition-transform duration-100 ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,#5b8def)]",
        "disabled:opacity-40 disabled:pointer-events-none",
        pressed && "scale-95",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {shortcutHint && (
          <span className="text-xs opacity-60 font-mono ml-1">{shortcutHint}</span>
        )}
      </span>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-white/30 animate-[touch-ripple_550ms_ease-out]"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </button>
  );
}

export default TouchOptimizedButton;
