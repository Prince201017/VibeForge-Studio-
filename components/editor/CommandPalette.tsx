/**
 * [V0.A1] Command palette for quick access to all editor functions
 * Triggered with Cmd/Ctrl + K
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { keyboardManager } from '@/lib/keyboard';
import type { Command } from '@/lib/keyboard';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands = query
    ? keyboardManager.search(query)
    : keyboardManager.getCommands();

  // [V0.A1] Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // [V0.A1] Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commands[selectedIndex]) {
        commands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // [V0.A1] Scroll selected item into view
  useEffect(() => {
    const selected = containerRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // [V0.A1] Group commands by category
  const grouped = commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-panel border border-border rounded-lg shadow-panel w-full max-w-2xl max-h-96 flex flex-col overflow-hidden">
        {/* Search input */}
        <div className="px-lg py-md border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="input-base w-full text-sm"
          />
        </div>

        {/* Command list */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto divide-y divide-border"
        >
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-lg py-md text-xs font-semibold text-foreground/50 uppercase sticky top-0 bg-panel/80 backdrop-blur">
                {category}
              </div>
              {cmds.map((cmd, i) => {
                const globalIndex = commands.indexOf(cmd);
                const isSelected = globalIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    data-index={globalIndex}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className={`w-full text-left px-lg py-md text-sm transition-colors ${
                      isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-xs text-foreground/50 mt-xs">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcuts.length > 0 && (
                        <div className="flex gap-xs">
                          {cmd.shortcuts.slice(0, 2).map((shortcut) => (
                            <kbd
                              key={shortcut}
                              className="px-md py-xs bg-panel/80 border border-border rounded text-xs font-mono text-foreground/70"
                            >
                              {shortcut}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {commands.length === 0 && (
            <div className="px-lg py-xl text-center text-foreground/40">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
