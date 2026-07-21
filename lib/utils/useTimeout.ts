/**
 * [ForgeOS UI] Declarative setTimeout hook with automatic cleanup and
 * support for changing/canceling the delay. Used by Toast auto-dismiss
 * and Skeleton delayed-appearance logic.
 */
import { useEffect, useRef } from "react";

export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}
