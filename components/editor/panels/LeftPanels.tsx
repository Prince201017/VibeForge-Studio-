/**
 * [V0.A1] Left-side panels: Layers, Assets, Project explorer
 */

'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/store';

export function LeftPanels() {
  const [activeTab, setActiveTab] = useState<'layers' | 'assets' | 'explorer'>(
    'layers'
  );
  const layers = useEditorStore((state) => state.layers);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(['layers', 'assets', 'explorer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-md py-md text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-panel border-b-2 border-primary'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-md">
        {activeTab === 'layers' && (
          <div className="space-y-sm">
            <div className="text-xs font-semibold text-foreground/60 uppercase">
              Layers ({layers.size})
            </div>
            {layers.size === 0 ? (
              <div className="text-xs text-foreground/40">No layers yet</div>
            ) : (
              <div className="space-y-xs">
                {Array.from(layers.values()).map((layer) => (
                  <div
                    key={layer.id}
                    className="px-md py-xs rounded-sm bg-hover text-xs hover:bg-hover cursor-pointer"
                  >
                    {layer.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="text-xs text-foreground/40">
            Asset manager coming soon
          </div>
        )}

        {activeTab === 'explorer' && (
          <div className="text-xs text-foreground/40">
            Project explorer coming soon
          </div>
        )}
      </div>
    </div>
  );
}
