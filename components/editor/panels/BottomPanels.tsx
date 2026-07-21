/**
 * [V0.A1] Bottom panels: Timeline, Console
 */

'use client';

import React, { useState } from 'react';

export function BottomPanels() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'console'>(
    'timeline'
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-panel">
        {(['timeline', 'console'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-md py-md text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-md">
        {activeTab === 'timeline' && (
          <div className="text-xs text-foreground/40">
            Timeline editor coming soon. Will support keyframing, easing curves,
            and animation preview.
          </div>
        )}

        {activeTab === 'console' && (
          <div className="text-xs font-mono text-foreground/60 space-y-xs">
            <div>[ForgeOS] Editor initialized</div>
            <div>[ForgeOS] Python FastAPI service ready at localhost:8000</div>
            <div>[ForgeOS] Type commands here or use AI assistant above</div>
          </div>
        )}
      </div>
    </div>
  );
}
