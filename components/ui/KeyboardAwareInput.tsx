/**
 * components/responsive/KeyboardAwareInput.tsx
 *
 * Mobile keyboard handling (section 9): correct `inputMode`/`type` per
 * field kind so the OS shows the right keyboard layout, scrolls the
 * focused input above the on-screen keyboard using visualViewport,
 * dismisses on Enter/Return for single-line fields, and supports Tab-like
 * "next field" navigation via the Enter key on mobile where Tab is absent.
 */

import React, { useEffect, useRef } from "react";
import { useKeyboardVisible } from "../../lib/responsive/hooks";
import { cx, MIN_INPUT_CLASS } from "../../lib/responsive/styles";

export type KeyboardAwareInputKind = "text" | "number" | "email" | "search" | "url" | "tel";

const INPUT_MODE_MAP: Record<KeyboardAwareInputKind, React.HTMLAttributes<HTMLInputElement>["inputMode"]> = {
  text: "text",
  number: "decimal",
  email: "email",
  search: "search",
  url: "url",
  tel: "tel",
};

export interface KeyboardAwareInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onSubmitValue"> {
  kind?: KeyboardAwareInputKind;
  /** Called when Enter/Return is pressed; also blurs the field to dismiss the keyboard. */
  onSubmitValue?: (value: string) => void;
  /** Ref to the next field to focus when Enter is pressed and no onSubmitValue is given. */
  nextFieldRef?: React.RefObject<HTMLElement>;
}

export function KeyboardAwareInput({
  kind = "text",
  onSubmitValue,
  nextFieldRef,
  className,
  onKeyDown,
  ...rest
}: KeyboardAwareInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const keyboardVisible = useKeyboardVisible();

  // Scroll the input into view above the keyboard once it opens.
  useEffect(() => {
    if (keyboardVisible && document.activeElement === ref.current) {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [keyboardVisible]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.key === "Enter") {
      if (onSubmitValue) {
        onSubmitValue((e.target as HTMLInputElement).value);
      }
      if (nextFieldRef?.current) {
        nextFieldRef.current.focus();
      } else {
        (e.target as HTMLInputElement).blur(); // dismiss keyboard
      }
    }
  };

  return (
    <input
      ref={ref}
      type={kind === "number" ? "text" : kind}
      inputMode={INPUT_MODE_MAP[kind]}
      onKeyDown={handleKeyDown}
      enterKeyHint={nextFieldRef ? "next" : "done"}
      className={cx(
        MIN_INPUT_CLASS,
        "w-full rounded-md border border-white/10 bg-[var(--surface-2,#2a2a2e)] px-3 text-[var(--text,#f2f2f2)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent,#5b8def)]",
        className,
      )}
      {...rest}
    />
  );
}

export default KeyboardAwareInput;
