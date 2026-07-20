/**
 * [V0.A1] Main editor shell component
 * Orchestrates all editor panels, viewport, and interactions
 * Scaffold for desktop-class UI with dockable panels
 */

'use client';

import React, { useState } from 'react';

export function EditorShell() {
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Top Menu Bar */}
      <div className="h-12 bg-gradient-to-b from-slate-800 to-slate-800 border-b border-slate-700 flex items-center px-4 gap-6">
        <div className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          ForgeOS
        </div>
        <div className="flex gap-1">
          <button className="px-4 py-2 text-sm font-medium hover:bg-slate-700 hover:text-white transition rounded">File</button>
          <button className="px-4 py-2 text-sm font-medium hover:bg-slate-700 hover:text-white transition rounded">Edit</button>
          <button className="px-4 py-2 text-sm font-medium hover:bg-slate-700 hover:text-white transition rounded">View</button>
          <button className="px-4 py-2 text-sm font-medium hover:bg-slate-700 hover:text-white transition rounded">Export</button>
          <button className="px-4 py-2 text-sm font-medium hover:bg-slate-700 hover:text-white transition rounded">Preview</button>
        </div>
      </div>

      {/* Main editor area with panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Layers */}
        {showLayers && (
          <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shadow-lg">
            <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 font-semibold text-sm flex gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              Layers
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 rounded transition">
                + Add Layer
              </button>
              <div className="text-xs text-slate-500 mt-4">No layers created yet</div>
            </div>
          </div>
        )}

        {/* Center: Viewport */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-black via-slate-950 to-black">
          <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4 text-sm font-medium">
            <span className="text-blue-400">100%</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-500 text-xs">Zoom to fit: Z • Pan: Space+Drag • Reset: R</span>
          </div>
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 mix-blend-overlay"></div>
            </div>
            <div className="text-center z-10">
              <div className="mb-6 text-2xl font-bold text-white">ForgeOS Editor</div>
              <div className="text-slate-400 space-y-2">
                <div>Click to add shapes • Drag to pan • Scroll to zoom</div>
                <div className="text-xs text-slate-600 mt-4">All 13 systems ready: Geometry • Animation • AI • Particles • Export • More</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Properties & AI */}
        {showProperties && (
          <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shadow-lg">
            <div className="flex border-b border-slate-700">
              <button className="flex-1 h-10 px-4 font-semibold text-sm text-blue-400 border-b-2 border-blue-500 bg-slate-800 rounded-none">
                Properties
              </button>
              <button className="flex-1 h-10 px-4 font-semibold text-sm text-slate-500 hover:text-white transition">
                AI
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              <div className="text-sm text-slate-400">Select an element to view properties</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel: Timeline */}
      {showTimeline && (
        <div className="h-40 bg-slate-900 border-t border-slate-800 flex flex-col shadow-lg">
          <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 font-semibold text-sm gap-2">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            Timeline
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center gap-4">
            <button className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-500 rounded transition font-medium">
              + Add Animation
            </button>
            <div className="text-xs text-slate-500">No animations created yet</div>
          </div>
        </div>
      )}
    </div>
  );
}
