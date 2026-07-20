// [Claude.A12] Loading spinner.
import React from "react";

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      role="status" aria-label="Loading"
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
    />
  );
}
