"use client";

import { useSyncExternalStore } from "react";
import { ensureLifetime, type LifetimeTotals } from "@/ui/lifetime";
import { loadHistory, type RunRecord } from "@/ui/runs";

export interface SavedRuns {
  readonly runs: readonly RunRecord[];
  readonly lifetime: LifetimeTotals;
}

// localStorage is only readable after mount; the server snapshot is the loading state. The
// cache is dropped on every mount, on another tab's write and after a restore in this tab.
let snapshot: SavedRuns | undefined;
const listeners = new Set<() => void>();

function refresh(): void {
  snapshot = undefined;
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  snapshot = undefined;
  onChange();
  window.addEventListener("storage", refresh);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", refresh);
  };
}

function getSnapshot(): SavedRuns {
  return (snapshot ??= { runs: loadHistory(), lifetime: ensureLifetime() });
}

export function useSavedRuns(): SavedRuns | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export const savedRunsChanged = refresh;
