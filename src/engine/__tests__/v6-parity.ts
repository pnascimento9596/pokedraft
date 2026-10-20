import { expect } from "vitest";
import { runCup } from "../cup";
import { applyAction, createDraft, eligibleSpecies, slotRefs, toFullLineup } from "../draft";
import { dailySeed, toIsoDate } from "../rng";
import { speciesById } from "../species";
import { runCup as runCupV6 } from "../versions/v6/src/engine/cup";
import {
  CUP_ROUNDS,
  FORMATION_IDS,
  GENS,
  RunTokenError,
  TACTICS,
  type BenchIndex,
  type CupResult,
  type DraftSettings,
  type FullLineup,
  type ManagerAction,
  type Mode,
  type Seed,
  type StarterIndex,
} from "../types";
import { draftLineup } from "./story-panel";

type Shape = "cup8" | "kanto151" | "daily" | "builder";
const SHAPES: readonly Shape[] = ["cup8", "kanto151", "daily", "builder"];
type Coaching = "sim" | "tactics" | "subs" | "all";
const COACHING: readonly Coaching[] = ["sim", "tactics", "subs", "all"];

export interface ParityRun {
  readonly name: string;
  readonly seed: Seed;
  readonly mode: Mode;
  readonly lineup: FullLineup;
  readonly manager: readonly ManagerAction[];
}

function settingsFor(shape: Shape, formation: DraftSettings["formation"]): DraftSettings {
  if (shape === "kanto151") return { mode: "kanto151", formation, order: "positionFirst" };
  // The daily board's settings (src/leaderboard/daily.ts dailySettings).
  if (shape === "daily")
    return { mode: "cup8", formation, gens: GENS, style: "open", order: "squadFirst" };
  return { mode: "cup8", formation, gens: GENS, style: "classic3", order: "squadFirst" };
}

// The open style offers a region and type, not three species: take the first eligible match.
function openLineup(settings: DraftSettings, seed: Seed): FullLineup {
  let state = createDraft(settings, seed);
  for (const slot of slotRefs()) {
    if (state.phase.kind !== "choosing" || state.phase.roll.kind !== "combo")
      throw new Error("expected a combo roll");
    const { region, type } = state.phase.roll;
    const species = eligibleSpecies(state).find((id) => {
      const s = speciesById(id);
      return s.region === region && (s.types as readonly string[]).includes(type);
    })!;
    state = applyAction(state, { type: "pick", species, slot });
  }
  return toFullLineup(state);
}

const accepts = (run: Omit<ParityRun, "name">, manager: readonly ManagerAction[]): boolean => {
  try {
    runCup(run.lineup, run.seed, run.mode, undefined, manager);
    return true;
  } catch (e) {
    if (!(e instanceof RunTokenError)) throw e;
    return false;
  }
};

// Decisions for match k cannot change earlier matches, so the cup grows one match at a time and a
// decision the engine refuses (an empty slot, a used bench player) is dropped.
function coach(run: Omit<ParityRun, "name">, coaching: Coaching, i: number): ManagerAction[] {
  let manager: ManagerAction[] = [];
  for (let k = 0; k < CUP_ROUNDS.length; k++) {
    if (runCup(run.lineup, run.seed, run.mode, undefined, manager).matches[k]!.status !== "played")
      break;
    const tactic = (minute: number, n: number): ManagerAction => ({
      type: "tactic",
      match: k,
      minute,
      tactic: TACTICS[(i + k + n) % TACTICS.length]!,
    });
    const sub = (minute: number, slot: number, bench: number): ManagerAction => ({
      type: "sub",
      match: k,
      minute,
      slot: slot as StarterIndex,
      bench: bench as BenchIndex,
    });
    const planned: ManagerAction[] =
      coaching === "tactics"
        ? [tactic(0, 0), tactic(70, 2)]
        : coaching === "subs"
          ? [sub(30, ((i + k) % 10) + 1, (i + k) % 5)]
          : [tactic(0, 1), tactic(20, 3), sub(30, ((i + k) % 10) + 1, (i + k) % 5), tactic(50, 4)];
    for (const a of planned) if (accepts(run, [...manager, a])) manager = [...manager, a];
    if (coaching === "tactics") continue;
    // Answer the match's first injury with a chosen bench player, the touchline's injury stop.
    const played = runCup(run.lineup, run.seed, run.mode, undefined, manager).matches[k]!;
    const injury =
      played.status === "played" ? played.incidents?.find((x) => x.kind === "injury") : undefined;
    if (injury === undefined || injury.kind !== "injury") continue;
    for (let bench = 0; bench < 5; bench++) {
      const answer = sub(injury.minute, injury.slot, bench);
      const others = manager.filter((a) => a.match === k);
      const merged = [...manager.filter((a) => a.match !== k), ...others, answer].sort(
        (a, b) => a.match - b.match || a.minute - b.minute,
      );
      if (accepts(run, merged)) {
        manager = merged;
        break;
      }
    }
  }
  return manager;
}

/**
 * Run i = 4j + s plays shape s (cup8, kanto151, the daily settings and seed, builder), formation
 * (s + 5j) % 8, so every shape meets every formation within 32 runs, and coaching j % 4 (none,
 * tactics only, a sub and an injury answer, all).
 */
export function parityPanel(size: number): ParityRun[] {
  return Array.from({ length: size }, (_, i): ParityRun => {
    const shape = SHAPES[i % SHAPES.length]!;
    const formation = FORMATION_IDS[(i + Math.floor(i / SHAPES.length)) % FORMATION_IDS.length]!;
    const coaching = COACHING[Math.floor(i / SHAPES.length) % COACHING.length]!;
    const day = String(1 + (i % 28)).padStart(2, "0");
    const seed =
      shape === "daily" ? dailySeed(toIsoDate(`2026-10-${day}`)) : (`v6-parity-${i}` as Seed);
    const mode: Mode = shape === "kanto151" ? "kanto151" : shape === "builder" ? "builder" : "cup8";
    const settings = settingsFor(shape, formation);
    const lineup = shape === "daily" ? openLineup(settings, seed) : draftLineup(settings, seed);
    const base = { seed, mode, lineup };
    const manager = coaching === "sim" ? [] : coach({ ...base, manager: [] }, coaching, i);
    return { name: `${i} ${shape} ${formation} ${coaching}`, ...base, manager };
  });
}

export interface ParityTally {
  runs: number;
  matches: number;
  coachedMatches: number;
  injuryAnswers: number;
  extraTime: number;
  shootouts: number;
  shapes: Set<string>;
  formations: Set<string>;
}

export const emptyTally = (): ParityTally => ({
  runs: 0,
  matches: 0,
  coachedMatches: 0,
  injuryAnswers: 0,
  extraTime: 0,
  shootouts: 0,
  shapes: new Set(),
  formations: new Set(),
});

/** The live engine at its default coefficients against the frozen engine 6 bundle, byte for byte. */
export function checkParity(run: ParityRun, tally: ParityTally): void {
  const live = runCup(run.lineup, run.seed, run.mode, undefined, run.manager);
  // The casts only bridge the bundle's own copy of the branded types, as versions/index.ts does.
  const frozen = runCupV6(
    run.lineup as never,
    run.seed as never,
    run.mode,
    undefined,
    run.manager as never,
  ) as unknown as CupResult;
  expect(JSON.stringify(live), run.name).toBe(JSON.stringify(frozen));

  tally.runs++;
  tally.shapes.add(run.name.split(" ")[1]!);
  tally.formations.add(run.lineup.formation);
  for (const [k, m] of live.matches.entries()) {
    if (m.status !== "played") continue;
    tally.matches++;
    if (m.extraTime !== null) tally.extraTime++;
    if (m.shootout !== null) tally.shootouts++;
    if (run.manager.some((a) => a.match === k)) tally.coachedMatches++;
    tally.injuryAnswers += (m.incidents ?? []).filter(
      (x) => x.kind === "sub" && x.reason === "injury" && x.by === "manager",
    ).length;
  }
}
