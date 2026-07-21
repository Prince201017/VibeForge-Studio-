/**
 * [V0.A1] Right-side panels: Properties, AI Chat, Inspector
 */

'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/store';

export function RightPanels() {
  const [activeTab, setActiveTab] = useState<'properties' | 'ai'>(
    'properties'
  );
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(['properties', 'ai'] as const).map((tab) => (
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
      <div className="flex-1 overflow-y-auto p-md flex flex-col">
        {activeTab === 'properties' && (
          <div className="space-y-md">
            {selectedLayerIds.length === 0 ? (
              <div className="text-xs text-foreground/40">
                Select a layer to view properties
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-foreground/60 uppercase">
                  Selected ({selectedLayerIds.length})
                </div>
                <div className="space-y-sm">
                  {['Position', 'Rotation', 'Scale', 'Opacity'].map((prop) => (
                    <div key={prop} className="space-y-xs">
                      <label className="label-base block">{prop}</label>
                      <input
                        type="text"
                        placeholder="Value"
                        className="input-base w-full"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-hover/30 rounded-sm p-md mb-md text-xs text-foreground/60 min-h-20">
              <p>AI assistant ready for commands. Try:</p>
              <p className="mt-md">• &quot;Generate a premium design&quot;</p>
              <p>• &quot;Add a wave animation&quot;</p>
              <p>• &quot;Apply Voronoi geometry&quot;</p>
            </div>
            <input
              type="text"
              placeholder="Describe your design..."
              className="input-base w-full text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
