/**
 * [V0.A1] Top menu bar for ForgeOS editor
 * File operations, edit menu, view options, export, help
 */

'use client';

import React from 'react';
import { useEditorStore } from '@/lib/store';

export function TopMenuBar() {
  const [fileMenuOpen, setFileMenuOpen] = React.useState(false);
  const [editMenuOpen, setEditMenuOpen] = React.useState(false);
  const [viewMenuOpen, setViewMenuOpen] = React.useState(false);

  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <div className="h-12 bg-panel border-b border-border flex items-center px-lg gap-lg">
      {/* [V0.A1] ForgeOS Logo/Brand */}
      <div className="font-semibold text-sm">ForgeOS</div>

      {/* [V0.A1] Menu bar */}
      <div className="flex gap-md text-xs">
        {/* File menu */}
        <div className="relative">
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className="hover:bg-hover px-md py-xs rounded-sm"
          >
            File
          </button>
          {fileMenuOpen && (
            <div className="absolute top-full left-0 bg-panel border border-border rounded-md mt-md shadow-panel z-50 w-48">
              <div className="py-sm">
                <button className="w-full text-left px-md py-xs hover:bg-hover">
                  New Project
                </button>
                <button className="w-full text-left px-md py-xs hover:bg-hover">
                  Open...
                </button>
                <button className="w-full text-left px-md py-xs hover:bg-hover">
                  Save
                </button>
                <button className="w-full text-left px-md py-xs hover:bg-hover">
                  Export...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit menu */}
        <div className="relative">
          <button
            onClick={() => setEditMenuOpen(!editMenuOpen)}
            className="hover:bg-hover px-md py-xs rounded-sm"
          >
            Edit
          </button>
          {editMenuOpen && (
            <div className="absolute top-full left-0 bg-panel border border-border rounded-md mt-md shadow-panel z-50 w-48">
              <div className="py-sm">
                <button
                  onClick={() => {
                    undo();
                    setEditMenuOpen(false);
                  }}
                  className="w-full text-left px-md py-xs hover:bg-hover"
                >
                  Undo
                </button>
                <button
                  onClick={() => {
                    redo();
                    setEditMenuOpen(false);
                  }}
                  className="w-full text-left px-md py-xs hover:bg-hover"
                >
                  Redo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View menu */}
        <div className="relative">
          <button
            onClick={() => setViewMenuOpen(!viewMenuOpen)}
            className="hover:bg-hover px-md py-xs rounded-sm"
          >
            View
          </button>
          {viewMenuOpen && (
            <div className="absolute top-full left-0 bg-panel border border-border rounded-md mt-md shadow-panel z-50 w-48">
              <div className="py-sm">
                <button
                  onClick={() => {
                    togglePanel('layers');
                    setViewMenuOpen(false);
                  }}
                  className="w-full text-left px-md py-xs hover:bg-hover"
                >
                  Toggle Layers Panel
                </button>
                <button
                  onClick={() => {
                    togglePanel('properties');
                    setViewMenuOpen(false);
                  }}
                  className="w-full text-left px-md py-xs hover:bg-hover"
                >
                  Toggle Properties
                </button>
                <button
                  onClick={() => {
                    togglePanel('timeline');
                    setViewMenuOpen(false);
                  }}
                  className="w-full text-left px-md py-xs hover:bg-hover"
                >
                  Toggle Timeline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* [V0.A1] Spacer */}
      <div className="flex-1" />

      {/* [V0.A1] Right side actions */}
      <div className="flex gap-md">
        <button className="px-md py-xs bg-primary text-background rounded-sm text-xs font-medium hover:opacity-90">
          Export
        </button>
        <button className="px-md py-xs border border-border rounded-sm text-xs hover:bg-hover">
          Preview
        </button>
      </div>
    </div>
  );
}
