// [Claude.A1] Undo/redo contract every mutating action must satisfy.

export interface HistoryEntry<TState = unknown> {
  id: string;
  timestamp: number;
  actorId: string;
  label: string;
  before: Partial<TState>;
  after: Partial<TState>;
}

export class HistoryStack<TState> {
  private undoStack: HistoryEntry<TState>[] = [];
  private redoStack: HistoryEntry<TState>[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  push(entry: HistoryEntry<TState>): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = []; // new action invalidates redo chain
  }

  undo(): HistoryEntry<TState> | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(entry);
    return entry;
  }

  redo(): HistoryEntry<TState> | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(entry);
    return entry;
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
}
