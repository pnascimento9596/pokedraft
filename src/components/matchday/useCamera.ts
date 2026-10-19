"use client";

import { useSyncExternalStore } from "react";
import { defaultCamera, type CameraMode } from "@/ui/matchday/camera";
import { readJson, writeJson } from "@/ui/storage";

const CAMERA_KEY = "pokedraft:camera";
const WIDE = "(min-width: 720px)";
const REDUCED = "(prefers-reduced-motion: reduce)";

const listeners = new Set<() => void>();
// Read once while a match player is on screen, so a 10 Hz render touches no storage or media query.
let cached: CameraMode | null = null;

function media(query: string): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;
}

function stored(): CameraMode | null {
  const value = readJson<unknown>(CAMERA_KEY, null);
  return value === "follow" || value === "full" ? value : null;
}

function current(): CameraMode {
  cached ??= defaultCamera({
    wide: media(WIDE)?.matches ?? false,
    reducedMotion: media(REDUCED)?.matches ?? false,
    stored: stored(),
  });
  return cached;
}

function changed(): void {
  cached = null;
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const queries = [media(WIDE), media(REDUCED)];
  for (const q of queries) q?.addEventListener("change", changed);
  return () => {
    listeners.delete(onChange);
    for (const q of queries) q?.removeEventListener("change", changed);
    if (listeners.size === 0) cached = null;
  };
}

/** Stores the player's camera choice, which then wins over the screen's default. */
export function setCamera(mode: CameraMode): void {
  writeJson(CAMERA_KEY, mode);
  changed();
}

/** The live broadcast's camera: the stored choice, else Follow on a phone and Full elsewhere. */
export function useCamera(): CameraMode {
  return useSyncExternalStore(subscribe, current, () => "full");
}
