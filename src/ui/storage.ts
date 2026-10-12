// Browser storage can be missing or throw (private windows, blocked site data, SSR).
// Every read falls back to the given default and every write is best effort.
import type { DraftSettings, IsoDate } from "@/engine/types";

export function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable; the app keeps working without persistence
  }
}

// Per-tab storage keeps independent active runs from replacing each other's progress.
export function readSession(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable; the run still plays, it just will not survive a reload
  }
}

export interface RunSlot {
  readonly settings: DraftSettings;
  /** The seed the page pins (a shared link or the Daily), or null when Start draws a fresh one. */
  readonly seed: string | null;
  readonly daily: IsoDate | null;
}

export const RUN_CLEARED = "cleared";

export function runSlotKey(slot: RunSlot): string {
  return `pokedraft.run.${slot.daily !== null ? "daily" : slot.settings.mode}`;
}

export function readRunCheckpoint(slot: RunSlot): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(runSlotKey(slot));
  } catch {
    return null;
  }
}

export function writeRunCheckpoint(slot: RunSlot, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    const key = runSlotKey(slot);
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // The tab can still persist its run when durable browser storage is unavailable.
  }
}

export function forgetRunSnapshot(slot: RunSlot, snapshot?: string): void {
  const key = runSlotKey(slot);
  const own = snapshot ?? readSession(key);
  // A different tab may have saved a newer browser checkpoint since this tab's last action.
  if (own !== null && readRunCheckpoint(slot) === own) writeRunCheckpoint(slot, null);
  writeSession(key, RUN_CLEARED);
}
