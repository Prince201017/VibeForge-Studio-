/**
 * [ForgeOS UI] Debounces a fast-changing value. Used by Select's
 * searchable filter, CommandPalette fuzzy search, and Table filtering.
 */
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
