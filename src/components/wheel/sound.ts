"use client";

import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "@/ui/storage";

const SOUND_KEY = "pokedraft:sound";

let enabled: boolean | null = null;
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

function soundEnabled(): boolean {
  if (enabled === null) enabled = readJson<unknown>(SOUND_KEY, false) === true;
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  writeJson(SOUND_KEY, on);
  if (on) unlockAudio();
  for (const l of listeners) l();
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    soundEnabled,
    () => false,
  );
}

// Browsers only start an AudioContext inside a user gesture, so callers invoke this from click
// handlers (the sound toggle, Start run, a reroll) and ticks stay silent until then.
export function unlockAudio(): void {
  if (!soundEnabled() || typeof window === "undefined") return;
  try {
    if (ctx === null) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor === undefined) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function playTick(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.025);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.035);
}
