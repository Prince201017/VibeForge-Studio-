// [CollabAgent] operational-transform.ts
// Client-side mirror of the server OT algorithm. Used for optimistic local
// application (apply immediately, reconcile if the server transforms it)
// and for transforming buffered local ops against incoming remote ops
// while offline/reconnecting.

import type { Operation } from "./types";

export interface TransformResult {
  op: Operation;
  dropped: boolean;
  conflict: boolean;
}

function lamportWins(a: Operation, b: Operation): boolean {
  if (a.lamportTime !== b.lamportTime) return a.lamportTime > b.lamportTime;
  return (a.siteId ?? "") > (b.siteId ?? "");
}

function transformListIndex(index: number, applied: Operation): number {
  const value = applied.value as Record<string, number> | undefined;
  if (!value || value.index === undefined) return index;
  const appliedIndex = value.index;

  if (applied.type === "list_insert") {
    return appliedIndex <= index ? index + 1 : index;
  }
  if (applied.type === "list_delete") {
    if (appliedIndex < index) return index - 1;
    if (appliedIndex === index) return -1;
    return index;
  }
  if (applied.type === "list_move") {
    const fromI = value.from_index ?? value["fromIndex" as never];
    const toI = value.to_index ?? value["toIndex" as never];
    if (fromI === undefined || toI === undefined) return index;
    let idx = index;
    if (fromI < idx && idx <= toI) idx -= 1;
    else if (toI <= idx && idx < fromI) idx += 1;
    else if (idx === fromI) idx = toI;
    return idx;
  }
  return index;
}

export class OperationalTransform {
  transform(incoming: Operation, applied: Operation): TransformResult {
    if (incoming.layerId !== applied.layerId || incoming.path !== applied.path) {
      return { op: incoming, dropped: false, conflict: false };
    }

    const structuralTypes = new Set(["list_insert", "list_delete", "list_move"]);
    if (structuralTypes.has(incoming.type) && structuralTypes.has(applied.type)) {
      return this.transformStructural(incoming, applied);
    }

    const scalarTypes = new Set(["modify", "attribute"]);
    if (scalarTypes.has(incoming.type) && scalarTypes.has(applied.type)) {
      return this.transformScalar(incoming, applied);
    }

    if (incoming.type === "delete" || applied.type === "delete") {
      return this.transformDelete(incoming, applied);
    }

    if (incoming.type === "move" && applied.type === "move") {
      return this.transformScalar(incoming, applied); // same LWW rule
    }

    return { op: incoming, dropped: false, conflict: false };
  }

  private transformStructural(incoming: Operation, applied: Operation): TransformResult {
    const value = { ...(incoming.value as Record<string, number>) };
    if (value.index !== undefined) {
      const newIndex = transformListIndex(value.index, applied);
      if (newIndex === -1) return { op: incoming, dropped: true, conflict: true };
      value.index = newIndex;
    }
    if (value.from_index !== undefined) value.from_index = transformListIndex(value.from_index, applied);
    if (value.to_index !== undefined) value.to_index = transformListIndex(value.to_index, applied);
    return { op: { ...incoming, value }, dropped: false, conflict: true };
  }

  private transformScalar(incoming: Operation, applied: Operation): TransformResult {
    if (lamportWins(applied, incoming)) {
      return { op: incoming, dropped: true, conflict: true };
    }
    return { op: incoming, dropped: false, conflict: true };
  }

  private transformDelete(incoming: Operation, applied: Operation): TransformResult {
    if (applied.type === "delete" && applied.tombstone) {
      return { op: incoming, dropped: true, conflict: true };
    }
    return { op: incoming, dropped: false, conflict: true };
  }

  transformAgainstHistory(incoming: Operation, history: Operation[]): TransformResult {
    const concurrent = history.filter(
      (op) => op.operationId > (incoming.parentOpId ?? -1)
    );
    let result: TransformResult = { op: incoming, dropped: false, conflict: false };
    let anyConflict = false;
    for (const applied of concurrent) {
      if (result.dropped) break;
      result = this.transform(result.op, applied);
      anyConflict = anyConflict || result.conflict;
    }
    result.conflict = anyConflict;
    return result;
  }
}

export const ot = new OperationalTransform();
