"use client";

import { useSyncExternalStore } from "react";
import { createRng } from "@/lib/rng";
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
  else stopCrowdBed();
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

export function playReelSettle(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const [idx, freq] of [523.25, 659.25].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + idx * 0.055);
    gain.gain.setValueAtTime(0.07, t + idx * 0.055);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.055 + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + idx * 0.055);
    osc.stop(t + idx * 0.055 + 0.15);
  }
}

export function playSignCard(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(560, t + 0.06);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.075);
}

export function playGoalHorn(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const freq of [440, 554.37, 659.25, 880]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.44);
  }
}

export function playOppGoal(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const freq of [220, 261.63, 329.63]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.34);
  }
}

export function playWhistle(kind: "kickoff" | "halftime" | "fulltime" | "foul" = "kickoff"): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const blasts: readonly [number, number][] =
    kind === "fulltime"
      ? [
          [0, 0.11],
          [0.16, 0.11],
          [0.32, 0.34],
        ]
      : kind === "halftime"
        ? [
            [0, 0.12],
            [0.18, 0.28],
          ]
        : kind === "foul"
          ? [[0, 0.14]]
          : [[0, 0.22]];
  for (const [offset, dur] of blasts) {
    const start = t + offset;
    for (const freq of [2780, 2910]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq - 80, start + dur);
      gain.gain.setValueAtTime(0.04, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    }
  }
}

export function playKickPass(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(155, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.055);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.065);
}

export function playSaveSound(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const [idx, freq] of [320, 640].entries()) {
    const start = t + idx * 0.04;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.06, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.15);
  }
}

export function playCardSound(color: "yellow" | "red"): void {
  playWhistle("foul");
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.14;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(color === "red" ? 196 : 293.66, t);
  gain.gain.setValueAtTime(0.045, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.19);
}

export function playSubSound(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const [idx, freq] of [440, 587.33].entries()) {
    const start = t + idx * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.05, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.13);
  }
}

export function playAbilitySound(
  effect:
    "fire" | "water" | "electric" | "grass" | "ice" | "psychic" | "impact" | "shield" | "dive",
): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const profile: Readonly<
    Record<typeof effect, { type: OscillatorType; start: number; end: number; dur: number }>
  > = {
    fire: { type: "sawtooth", start: 220, end: 520, dur: 0.16 },
    water: { type: "sine", start: 340, end: 620, dur: 0.15 },
    electric: { type: "square", start: 880, end: 440, dur: 0.12 },
    grass: { type: "triangle", start: 480, end: 760, dur: 0.14 },
    ice: { type: "sine", start: 1046.5, end: 1318.5, dur: 0.15 },
    psychic: { type: "sine", start: 660, end: 390, dur: 0.18 },
    shield: { type: "triangle", start: 330, end: 660, dur: 0.16 },
    dive: { type: "sine", start: 240, end: 110, dur: 0.12 },
    impact: { type: "triangle", start: 200, end: 80, dur: 0.11 },
  };
  const p = profile[effect];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.start, t);
  osc.frequency.exponentialRampToValueAtTime(p.end, t + p.dur);
  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur + 0.01);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + p.dur + 0.02);
}

export function playSpecialReveal(): void {
  if (ctx === null || !soundEnabled() || ctx.state !== "running") return;
  const t = ctx.currentTime;
  for (const [index, frequency] of [523.25, 659.25, 1046.5].entries()) {
    const start = t + index * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.07, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.23);
  }
}

interface CrowdBed {
  readonly source: AudioBufferSourceNode;
  readonly level: GainNode;
  readonly roar: GainNode;
  lastLevel: number;
}

let bed: CrowdBed | null = null;

const BED_SECONDS = 2;
const BED_BAND_HZ = 700;
const BED_Q = 0.6;
const LEVEL_SMOOTHING = 0.25;
const LEVEL_STEP = 0.002;
const BED_FADE = 0.06;

/**
 * Starts the looping crowd: two seconds of seeded white noise through a band-pass, with a level
 * gain that follows the ball and a separate gain for goal roars. A suspended context is fine: the
 * loop starts sounding when the tap that unlocked audio resumes it.
 */
export function startCrowdBed(): void {
  if (bed !== null || ctx === null || !soundEnabled() || ctx.state === "closed") return;
  const length = Math.floor(ctx.sampleRate * BED_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng("crowd-bed");
  for (let i = 0; i < length; i++) data[i] = rng.next() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = BED_BAND_HZ;
  band.Q.value = BED_Q;
  const level = ctx.createGain();
  level.gain.value = 0;
  const roar = ctx.createGain();
  roar.gain.value = 0;
  source.connect(band);
  band.connect(level).connect(ctx.destination);
  band.connect(roar).connect(ctx.destination);
  source.start();
  bed = { source, level, roar, lastLevel: 0 };
}

/** Eases the crowd toward `gain`, skipping changes too small to hear. */
export function setCrowdLevel(gain: number): void {
  if (bed === null || ctx === null) return;
  if (Math.abs(gain - bed.lastLevel) < LEVEL_STEP) return;
  bed.lastLevel = gain;
  bed.level.gain.setTargetAtTime(gain, ctx.currentTime, LEVEL_SMOOTHING);
}

/** Swells the crowd for a goal: up to the peak, held, then back to silence. */
export function crowdRoar(r: {
  readonly peak: number;
  readonly attackMs: number;
  readonly holdMs: number;
  readonly releaseMs: number;
}): void {
  if (bed === null || ctx === null) return;
  const t = ctx.currentTime;
  const g = bed.roar.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(r.peak, t + r.attackMs / 1000);
  g.setValueAtTime(r.peak, t + (r.attackMs + r.holdMs) / 1000);
  g.linearRampToValueAtTime(0, t + (r.attackMs + r.holdMs + r.releaseMs) / 1000);
}

/** Fades the crowd out over a few frames, stops the loop and lets the nodes go. */
export function stopCrowdBed(): void {
  if (bed === null) return;
  const { source, level, roar } = bed;
  bed = null;
  if (ctx === null) return;
  const t = ctx.currentTime;
  for (const g of [level.gain, roar.gain]) {
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0, t, BED_FADE / 3);
  }
  source.onended = () => {
    level.disconnect();
    roar.disconnect();
  };
  source.stop(t + BED_FADE);
}
