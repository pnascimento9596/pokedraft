import { expect } from "vitest";
import { runCup } from "../cup";
import { applyAction, createDraft, slotRefs, toFullLineup } from "../draft";
import { matchStory } from "../story";
import {
  CUP_ROUNDS,
  RunTokenError,
  TACTICS,
  type BenchIndex,
  type DraftSettings,
  type DraftState,
  type FullLineup,
  type GoalEvent,
  type ManagerAction,
  type MatchResult,
  type Seed,
  type StarterIndex,
} from "../types";

export const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-2-3-1",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
const KANTO: DraftSettings = { mode: "kanto151", formation: "3-5-2", order: "positionFirst" };

function rolled(state: DraftState): number {
  if (state.phase.kind !== "choosing") throw new Error(`expected a roll, got ${state.phase.kind}`);
  const roll = state.phase.roll;
  return roll.kind === "species" ? roll.species : roll.offers![0]!;
}

// The goldens' fixed draft scripts, so the panel's first 20 runs are goldens.test.ts's panel.
export function draftLineup(settings: DraftSettings, seed: Seed): FullLineup {
  let state = createDraft(settings, seed);
  const push = (a: Parameters<typeof applyAction>[1]): void => {
    state = applyAction(state, a);
  };
  slotRefs().forEach((slot, round) => {
    if (settings.mode === "kanto151") {
      push({ type: "chooseSlot", slot });
      if (round % 4 === 1) push({ type: "reroll", target: "species" });
    } else {
      if (round === 0) push({ type: "reroll", target: "type" });
      if (round === 6) push({ type: "reroll", target: "region" });
    }
    push({ type: "pick", species: rolled(state) as never, slot });
  });
  return toFullLineup(state);
}

// A tactic at kickoff, a tactical sub at 40' and a tactic at 70' in every match the run reaches.
// Decisions for match k cannot change matches before k, so the cup is grown one match at a time.
function coach(lineup: FullLineup, seed: Seed, settings: DraftSettings): ManagerAction[] {
  let manager: ManagerAction[] = [];
  for (let k = 0; k < CUP_ROUNDS.length; k++) {
    const cup = runCup(lineup, seed, settings.mode, undefined, manager);
    if (cup.matches[k]!.status !== "played") break;
    const kickoff: ManagerAction = { type: "tactic", match: k, minute: 0, tactic: TACTICS[k % 5]! };
    const late: ManagerAction = {
      type: "tactic",
      match: k,
      minute: 70,
      tactic: TACTICS[(k + 2) % 5]!,
    };
    const sub: ManagerAction = {
      type: "sub",
      match: k,
      minute: 40,
      slot: ((k % 10) + 1) as StarterIndex,
      bench: (k % 5) as BenchIndex,
    };
    try {
      runCup(lineup, seed, settings.mode, undefined, [...manager, kickoff, sub, late]);
      manager = [...manager, kickoff, sub, late];
    } catch (e) {
      if (!(e instanceof RunTokenError)) throw e;
      manager = [...manager, kickoff, late];
    }
  }
  return manager;
}

export interface PanelRun {
  readonly name: string;
  readonly seed: Seed;
  readonly settings: DraftSettings;
  readonly lineup: FullLineup;
  readonly manager: readonly ManagerAction[];
}

/**
 * Runs 0 to 19 are goldens.test.ts's 20-run panel (uncoached). Every later run alternates cup8
 * and kanto151, and every odd one is coached.
 */
export function panel(size: number): PanelRun[] {
  return Array.from({ length: size }, (_, i): PanelRun => {
    const golden = i < 20;
    const settings = golden ? (i < 10 ? CUP8 : KANTO) : i % 4 < 2 ? CUP8 : KANTO;
    const seed = (golden ? `panel-${i}` : `story-${i}`) as Seed;
    const lineup = draftLineup(settings, seed);
    const coached = !golden && i % 2 === 1;
    const manager = coached ? coach(lineup, seed, settings) : [];
    return {
      name: `${seed} ${settings.mode}${coached ? " coached" : ""}`,
      seed,
      settings,
      lineup,
      manager,
    };
  });
}

function goalShooter(g: GoalEvent): number {
  if (g.side === "user") return g.scorer;
  if (g.scorer.kind !== "species") throw new Error("the live engine fields species only");
  return g.scorer.id;
}

const byMinuteSideShooter = (
  a: readonly [number, string, number, string],
  b: readonly [number, string, number, string],
): number => a[0] - b[0] || (a[1] === b[1] ? 0 : a[1] === "user" ? -1 : 1) || a[2] - b[2];

export interface PanelTally {
  matches: number;
  extraTime: number;
  coachedMatches: number;
  saved: number;
  off: number;
}

/**
 * The parity guard. For every match the run plays, the story's result is byte-identical to the
 * cup's match, its goal chances are the result's goals, and its saved chances are the saves.
 */
export function checkRun(run: PanelRun, tally: PanelTally): void {
  const cup = runCup(run.lineup, run.seed, run.settings.mode, undefined, run.manager);
  cup.matches.forEach((match: MatchResult, k) => {
    if (match.status !== "played") return;
    const story = matchStory(run.seed, k, {
      lineup: run.lineup,
      mode: run.settings.mode,
      manager: run.manager,
    });
    expect(JSON.stringify(story.result), `${run.name} match ${k}`).toBe(JSON.stringify(match));

    const goalChances = story.chances
      .filter((ch) => ch.outcome === "goal")
      .map((ch) => [ch.minute, ch.side, ch.shooter, ch.kind ?? ""] as const)
      .sort(byMinuteSideShooter);
    const goals = match.goals.map((g) => [g.minute, g.side, goalShooter(g), g.kind] as const);
    expect(goalChances, `${run.name} match ${k} goals`).toEqual(goals);

    const savedChances = story.chances
      .filter((ch) => ch.outcome === "saved")
      .map((ch) => `${ch.minute}:${ch.side === "user" ? "opp" : "user"}:${ch.shooter}`)
      .sort();
    const saves = (match.saves ?? []).map((s) => `${s.minute}:${s.side}:${s.attacker}`).sort();
    expect(savedChances, `${run.name} match ${k} saves`).toEqual(saves);

    const extra = match.extraTime !== null;
    expect(story.chances).toHaveLength(extra ? 134 : 100);
    expect(story.windows).toHaveLength(extra ? 24 : 18);
    expect(story.windows.map((w) => w.minute)).toEqual(match.windows!.map((w) => w.minute));

    tally.matches++;
    if (extra) tally.extraTime++;
    if (run.manager.some((a) => a.match === k)) tally.coachedMatches++;
    tally.saved += story.chances.filter((ch) => ch.outcome === "saved").length;
    tally.off += story.chances.filter((ch) => ch.outcome === "off").length;
  });
}
