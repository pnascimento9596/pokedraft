import { useSyncExternalStore } from "react";
import { DRAFT_ROUNDS, type DraftSettings } from "@/engine/types";

/** Set once the first-draft tip is dismissed, by Got it or by the first pick. */
export const COACH_KEY = "pokedraft:coach:draft";

type ActiveDraftSettings = Exclude<DraftSettings, { readonly mode: "builder" }>;

const listeners = new Set<() => void>();
// Used only while storage throws, so the tip still goes away for this tab.
let dismissedHere = false;

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(COACH_KEY) === "true";
  } catch {
    return dismissedHere;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** True when the tip should stay hidden. The server render hides it, so a returning player never sees it flash. */
export function useCoachDismissed(): boolean {
  return useSyncExternalStore(subscribe, dismissed, () => true);
}

export function dismissCoach(): void {
  dismissedHere = true;
  try {
    window.localStorage.setItem(COACH_KEY, "true");
  } catch {
    // storage unavailable; the in-memory flag hides the tip for this tab
  }
  for (const notify of listeners) notify();
}

/** The one-line tip, worded for the draft it sits on. */
export function coachLine(settings: ActiveDraftSettings): string {
  const pick =
    settings.mode === "kanto151"
      ? "take the Pokémon it rolls"
      : settings.style === "classic3"
        ? "pick one of three"
        : "pick one that matches";
  const steps =
    settings.order === "positionFirst"
      ? `Pick a slot, watch the spin, ${pick}.`
      : `Watch the spin, ${pick}, place it on the pitch.`;
  return `${steps} Fill all ${DRAFT_ROUNDS} to play the cup.`;
}
