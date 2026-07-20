import { useMemo, useState } from "react";
import { CATEGORY_LABEL, FORMAT_CATALOG, formatsByCategory } from "../../lib/export/formats";
import type { ExportFormat } from "../../lib/export/types";

/**
 * [V0.A7] FormatSelector — categorized, searchable grid of the 27 export
 * formats. Design language: dense, technical, monospace metadata — this is
 * a render-queue tool, not a marketing surface, so the visual voice leans
 * on precision (tabular alignment, restrained color) rather than warmth.
 */
interface FormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

export default function FormatSelector({ value, onChange }: FormatSelectorProps) {
  const [query, setQuery] = useState("");
  const grouped = useMemo(() => formatsByCategory(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    const out: typeof grouped = {};
    for (const [cat, formats] of Object.entries(grouped)) {
      const matches = formats.filter((f) => f.label.toLowerCase().includes(q) || f.format.includes(q));
      if (matches.length) out[cat] = matches;
    }
    return out;
  }, [grouped, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${FORMAT_CATALOG.length} formats…`}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div className="flex flex-col gap-5 max-h-96 overflow-y-auto pr-1">
        {Object.entries(filtered).map(([category, formats]) => (
          <div key={category}>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              {CATEGORY_LABEL[category] ?? category}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {formats.map((f) => {
                const selected = f.format === value;
                return (
                  <button
                    key={f.format}
                    type="button"
                    onClick={() => onChange(f.format)}
                    aria-pressed={selected}
                    className={`group flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-colors ${
                      selected
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-neutral-800 bg-neutral-900 hover:border-neutral-700 hover:bg-neutral-800"
                    }`}
                  >
                    <span className={`text-sm font-medium ${selected ? "text-violet-300" : "text-neutral-200"}`}>
                      {f.label}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-500">{f.extension}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {Object.keys(filtered).length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-600">No formats match “{query}”.</p>
        )}
      </div>
    </div>
  );
}
