/**
 * [V0.A1] Keyboard shortcuts and command palette system
 * Centralized keyboard event handling and command registry
 */

import type { EditorState } from './types';

export type Command = {
  id: string;
  label: string;
  description?: string;
  category: 'file' | 'edit' | 'view' | 'help' | 'tool' | 'animation' | 'geometry';
  shortcuts: string[];
  action: () => void | Promise<void>;
  enabled?: () => boolean;
};

export class KeyboardManager {
  private commands: Map<string, Command> = new Map();
  private keyBindings: Map<string, string> = new Map(); // key -> command id
  private isListening = false;

  // [V0.A1] Register a command
  registerCommand(command: Command) {
    this.commands.set(command.id, command);

    // Register key bindings
    for (const shortcut of command.shortcuts) {
      this.keyBindings.set(this.normalizeShortcut(shortcut), command.id);
    }
  }

  // [V0.A1] Normalize shortcut to consistent format (Ctrl+S, Cmd+S, etc.)
  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .split('+')
      .map((part) => part.trim())
      .map((part) => {
        // Normalize modifiers
        if (part === 'Ctrl' || part === 'Control') return 'Ctrl';
        if (part === 'Cmd' || part === 'Meta' || part === 'Command')
          return 'Cmd';
        if (part === 'Shift') return 'Shift';
        if (part === 'Alt' || part === 'Option') return 'Alt';
        return part;
      })
      .sort((a, b) => {
        // Modifiers first, then key
        const modOrder = { Ctrl: 0, Cmd: 0, Shift: 1, Alt: 2 };
        return (
          (modOrder[a as keyof typeof modOrder] ?? 99) -
          (modOrder[b as keyof typeof modOrder] ?? 99)
        );
      })
      .join('+');
  }

  // [V0.A1] Convert keyboard event to shortcut string
  private eventToShortcut(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) {
      parts.push(e.metaKey ? 'Cmd' : 'Ctrl');
    }
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = this.getKeyName(e.key);
    if (key) parts.push(key);

    return parts.join('+');
  }

  // [V0.A1] Get printable key name
  private getKeyName(key: string): string {
    const keyMap: Record<string, string> = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ' ': 'Space',
      Enter: 'Enter',
      Escape: 'Escape',
      Tab: 'Tab',
      Backspace: 'Backspace',
      Delete: 'Delete',
    };

    if (keyMap[key]) return keyMap[key];
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  // [V0.A1] Get all commands
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  // [V0.A1] Get command by ID
  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  // [V0.A1] Search commands by label or description
  search(query: string): Command[] {
    const q = query.toLowerCase();
    return this.getCommands().filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }

  // [V0.A1] Start listening to keyboard events
  listen(element: HTMLElement = document.documentElement) {
    if (this.isListening) return;

    element.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.isListening = true;
  }

  // [V0.A1] Handle keyboard events
  private handleKeyDown(e: KeyboardEvent) {
    // Don't intercept if typing in an input
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Allow Escape to exit edit mode
      if (e.key === 'Escape') {
        target.blur?.();
      }
      return;
    }

    const shortcut = this.eventToShortcut(e);
    const commandId = this.keyBindings.get(shortcut);

    if (commandId) {
      const cmd = this.commands.get(commandId);
      if (cmd && (!cmd.enabled || cmd.enabled())) {
        e.preventDefault();
        cmd.action();
      }
    }
  }
}

// [V0.A1] Global keyboard manager singleton
export const keyboardManager = new KeyboardManager();
