/**
 * [V0.A1] Main editor shell component
 * Orchestrates all editor panels, viewport, and interactions
 * Scaffold for desktop-class UI with dockable panels
 */

'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/lib/store';
import { keyboardManager } from '@/lib/keyboard';
import { TopMenuBar } from './TopMenuBar';
import { LeftPanels } from './panels/LeftPanels';
import { RightPanels } from './panels/RightPanels';
import { BottomPanels } from './panels/BottomPanels';
import { Viewport } from './Viewport';
import { CommandPalette } from './CommandPalette';

export function EditorShell() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const panels = useEditorStore((state) => state.panels);
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const resetEditor = useEditorStore((state) => state.resetEditor);

  React.useEffect(() => {
    // [V0.A1] Initialize editor on mount
    setIsInitializing(true);

    // Register keyboard commands
    keyboardManager.registerCommand({
      id: 'command-palette',
      label: 'Open Command Palette',
      category: 'view',
      shortcuts: ['Ctrl+K', 'Cmd+K'],
      action: () => setCommandPaletteOpen(true),
    });

    keyboardManager.registerCommand({
      id: 'undo',
      label: 'Undo',
      category: 'edit',
      shortcuts: ['Ctrl+Z', 'Cmd+Z'],
      action: undo,
    });

    keyboardManager.registerCommand({
      id: 'redo',
      label: 'Redo',
      category: 'edit',
      shortcuts: ['Ctrl+Shift+Z', 'Cmd+Shift+Z', 'Ctrl+Y'],
      action: redo,
    });

    keyboardManager.registerCommand({
      id: 'toggle-layers',
      label: 'Toggle Layers Panel',
      category: 'view',
      shortcuts: ['Ctrl+/', 'Cmd+/'],
      action: () => togglePanel('layers'),
    });

    keyboardManager.registerCommand({
      id: 'toggle-properties',
      label: 'Toggle Properties Panel',
      category: 'view',
      shortcuts: ['Ctrl+Shift+P', 'Cmd+Shift+P'],
      action: () => togglePanel('properties'),
    });

    keyboardManager.registerCommand({
      id: 'toggle-timeline',
      label: 'Toggle Timeline',
      category: 'view',
      shortcuts: ['Ctrl+T', 'Cmd+T'],
      action: () => togglePanel('timeline'),
    });

    keyboardManager.registerCommand({
      id: 'toggle-console',
      label: 'Toggle Console',
      category: 'view',
      shortcuts: ['Ctrl+~', 'Cmd+~'],
      action: () => togglePanel('console'),
    });

    keyboardManager.registerCommand({
      id: 'reset',
      label: 'Reset Editor',
      category: 'file',
      shortcuts: [],
      action: resetEditor,
      enabled: () => false, // Hidden unless explicitly enabled
    });

    // Start listening for keyboard events
    keyboardManager.listen();

    setIsInitializing(false);
  }, [togglePanel, undo, redo, resetEditor]);

  if (isInitializing) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading ForgeOS...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* [V0.A1] Command palette overlay */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* [V0.A1] Top menu bar */}
      <TopMenuBar />

      {/* [V0.A1] Main editor area with panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panels: Layers, Asset manager */}
        {panels.layers && (
          <div className="w-64 border-r border-border flex flex-col">
            <LeftPanels />
          </div>
        )}

        {/* Center: Viewport and canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Viewport />
        </div>

        {/* Right panels: Properties, AI Chat, Inspector */}
        {panels.properties && (
          <div className="w-72 border-l border-border flex flex-col overflow-hidden">
            <RightPanels />
          </div>
        )}
      </div>

      {/* [V0.A1] Bottom panels: Timeline, Console */}
      {(panels.timeline || panels.console) && (
        <div className="h-56 border-t border-border flex flex-col overflow-hidden">
          <BottomPanels />
        </div>
      )}
    </div>
  );
}
