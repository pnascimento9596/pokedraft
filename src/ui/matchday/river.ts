import type { StoryWindow } from "@/engine/story";
import {
  ENGINE_VERSION,
  type CupResult,
  type ManagerAction,
  type Mode,
  type Seed,
  type Side,
} from "@/engine/types";

/** Summed chance xG per side. */
export type SideXg = Readonly<Record<Side, number>>;

/** What the live engine needs, beside the match index and lineup, to replay a match's chances. */
export interface StorySource {
  readonly seed: Seed;
  readonly mode: Mode;
  readonly manager: readonly ManagerAction[];
}

/**
 * The story source for a cup, or null when another engine played it: the client's live engine
 * cannot reproduce a retained engine's chances.
 */
export function storySource(
  cup: Pick<CupResult, "engine" | "seed" | "mode">,
  manager: readonly ManagerAction[],
): StorySource | null {
  return cup.engine === ENGINE_VERSION ? { seed: cup.seed, mode: cup.mode, manager } : null;
}

/** How many windows have been played by a minute: a window counts once the clock reaches its end. */
export function completedWindows(windows: readonly StoryWindow[], clock: number): number {
  let n = 0;
  while (n < windows.length && windows[n]!.minute <= clock) n++;
  return n;
}

export function riverTotals(windows: readonly StoryWindow[], upTo: number): SideXg {
  let user = 0;
  let opp = 0;
  for (const w of windows.slice(0, upTo)) {
    user += w.xgUser;
    opp += w.xgOpp;
  }
  return { user, opp };
}

export function riverLabel(totals: SideXg, shared: boolean): string {
  const us = shared ? "this squad" : "you";
  return `Chances so far: ${us} ${totals.user.toFixed(1)}, them ${totals.opp.toFixed(1)}`;
}
