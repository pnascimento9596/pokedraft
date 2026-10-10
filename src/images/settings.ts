import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "@/ui/storage";

const KEY = "pokedraft:images";

export interface ImageSettings {
  /** The pack id the player picked, or null to use the default. */
  readonly pack: string | null;
  /** Right-half pitch tokens face the center. On by default. */
  readonly mirror: boolean;
}

const DEFAULTS: ImageSettings = { pack: null, mirror: true };
const listeners = new Set<() => void>();
// The parsed value is kept while the stored text is unchanged, so useSyncExternalStore sees a
// stable object. A write that storage refused still shows on screen for this tab.
let current: ImageSettings = DEFAULTS;
let loadedRaw: string | null | undefined;

function storedText(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(value: unknown): ImageSettings {
  if (typeof value !== "object" || value === null) return DEFAULTS;
  const v = value as Record<string, unknown>;
  return {
    pack: typeof v.pack === "string" ? v.pack : null,
    mirror: typeof v.mirror === "boolean" ? v.mirror : true,
  };
}

export function readSettings(): ImageSettings {
  return parse(readJson<unknown>(KEY, null));
}

export function writeSettings(change: Partial<ImageSettings>): void {
  const next = { ...getSnapshot(), ...change };
  writeJson(KEY, next);
  current = next;
  loadedRaw = storedText();
  for (const l of [...listeners]) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): ImageSettings {
  const raw = storedText();
  if (raw !== loadedRaw) {
    loadedRaw = raw;
    current = readSettings();
  }
  return current;
}

function getServerSnapshot(): ImageSettings {
  return DEFAULTS;
}

/** Re-renders when the pack or mirror choice changes, here or in another tab. */
export function useImageSettings(): ImageSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
