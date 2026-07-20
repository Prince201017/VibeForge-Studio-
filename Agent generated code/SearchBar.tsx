// [Claude.A8] Asset Manager - SearchBar
// Debounced full-text search input plus quick-access saved searches and
// a "search by color" swatch picker.

'use client';

import React, { useState } from 'react';
import { useAssetManagerStore } from '../../lib/asset-manager/store';
import { useAssetSearch } from '../../lib/asset-manager/hooks';

export function SearchBar() {
  const { query, search } = useAssetSearch();
  const [inputValue, setInputValue] = useState(query);
  const savedSearches = useAssetManagerStore((s) => s.savedSearches);
  const saveSearch = useAssetManagerStore((s) => s.saveSearch);
  const setFilter = useAssetManagerStore((s) => s.setFilter);
  const filter = useAssetManagerStore((s) => s.filter);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    search(e.target.value);
  };

  const swatches = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#111827', '#FFFFFF'];

  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center gap-2 rounded-md border border-[var(--am-border)] px-3 py-1.5">
        <span aria-hidden className="text-[var(--am-muted)]">⌕</span>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder="Search assets, tags, descriptions…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--am-muted)]"
          aria-label="Search assets"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              search('');
            }}
            aria-label="Clear search"
            className="text-[var(--am-muted)]"
          >
            ×
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowColorPicker((v) => !v)}
          aria-label="Search by color"
          aria-expanded={showColorPicker}
          className="h-4 w-4 shrink-0 rounded-full border border-[var(--am-border)]"
          style={{ background: filter.color ?? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => saveSearch(query)}
            aria-label="Save this search"
            className="text-xs text-[var(--am-muted)]"
          >
            ☆ Save
          </button>
        )}
      </div>

      {showColorPicker && (
        <div className="absolute z-10 mt-1 flex flex-wrap gap-1.5 rounded-md border border-[var(--am-border)] bg-[var(--am-surface)] p-2 shadow-lg">
          {swatches.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => {
                setFilter({ color: filter.color === hex ? undefined : hex });
                setShowColorPicker(false);
              }}
              aria-label={`Filter by color ${hex}`}
              className="h-6 w-6 rounded-full border border-[var(--am-border)]"
              style={{ background: hex }}
            />
          ))}
        </div>
      )}

      {savedSearches.length > 0 && !inputValue && (
        <div className="mt-1 flex flex-wrap gap-1">
          {savedSearches.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                setInputValue(s.name);
                search(s.name);
                setFilter(s.filter);
              }}
              className="rounded-full border border-[var(--am-border)] px-2 py-0.5 text-xs text-[var(--am-muted)]"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
