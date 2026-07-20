/**
 * [ForgeOS UI] Lightweight class name combinator.
 * Accepts strings, falsy values, and objects mapping class -> boolean.
 * Avoids pulling in `clsx`/`tailwind-merge` as a hard dependency so the
 * component library has zero required peer deps beyond React.
 */

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | undefined | null>
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue) => {
    if (!value && value !== 0) return;

    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (typeof value === "object") {
      for (const key in value) {
        if (value[key]) out.push(key);
      }
    }
  };

  inputs.forEach(walk);
  return out.join(" ").trim();
}

/** Merge a base class string with an optional user-supplied override. */
export function mergeClassName(base: string, override?: string): string {
  return override ? `${base} ${override}` : base;
}
