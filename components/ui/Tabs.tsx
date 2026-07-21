// [Claude.A12] Tabs with roving-tabindex keyboard navigation (arrow keys).
import React, { useState } from "react";

export interface Tab { id: string; label: string; content: React.ReactNode; }
export interface TabsProps { tabs: Tab[]; defaultTabId?: string; }

export function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const activeIndex = tabs.findIndex((t) => t.id === activeId);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setActiveId(tabs[(activeIndex + 1) % tabs.length].id);
    if (e.key === "ArrowLeft") setActiveId(tabs[(activeIndex - 1 + tabs.length) % tabs.length].id);
  };

  return (
    <div>
      <div role="tablist" onKeyDown={onKeyDown} className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={t.id === activeId}
            tabIndex={t.id === activeId ? 0 : -1}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-2 text-sm font-medium ${t.id === activeId ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {tabs.find((t) => t.id === activeId)?.content}
      </div>
    </div>
  );
}
