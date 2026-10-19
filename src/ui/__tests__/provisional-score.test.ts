import { describe, expect, it } from "vitest";
import {
  FORMATION_IDS,
  SPECIES,
  applyAction,
  createDraft,
  rateTeam,
  replay,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type FullLineup,
  type Lineup,
  type Seed,
  type SpeciesId,
} from "@/engine";
import { slotRefs } from "@/engine/draft";
import { createRng } from "@/lib/rng";
import { emptyLineup } from "@/ui/lineup";
import { candidateScoreDelta, provisionalTeamScore } from "../partial-rating";

function rolled(state: DraftState): SpeciesId {
  if (state.phase.kind !== "choosing") throw new Error(`expected a roll, got ${state.phase.kind}`);
  const roll = state.phase.roll;
  return roll.kind === "species" ? roll.species : roll.offers![0]!;
}

// The fixed scripts from src/engine/__tests__/goldens.test.ts, so these are the golden squads.
function goldenLineup(settings: DraftSettings, seed: string): FullLineup {
  const actions: DraftAction[] = [];
  let state = createDraft(settings, seed as Seed);
  const push = (a: DraftAction): void => {
    actions.push(a);
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
    push({ type: "pick", species: rolled(state), slot });
  });
  return replay({ v: 6, settings, seed: seed as Seed, actions }).draft.lineup as FullLineup;
}

const GOLDEN_CUP8 = goldenLineup(
  {
    mode: "cup8",
    formation: "4-2-3-1",
    gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    style: "classic3",
    order: "squadFirst",
  },
  "golden-cup8",
);
const GOLDEN_KANTO = goldenLineup(
  { mode: "kanto151", formation: "3-5-2", order: "positionFirst" },
  "golden-kanto151",
);

function randomFullLineup(seed: string): FullLineup {
  const rng = createRng(seed);
  const pool = [...SPECIES.map((s) => s.id)];
  const draw = (): SpeciesId => pool.splice(rng.int(pool.length), 1)[0]!;
  return {
    formation: rng.pick(FORMATION_IDS),
    starters: Array.from({ length: 11 }, draw) as unknown as FullLineup["starters"],
    bench: Array.from({ length: 5 }, draw) as unknown as FullLineup["bench"],
  };
}

function withStarters(entries: readonly [number, number][]): Lineup {
  const lineup = emptyLineup("4-3-3");
  const starters = [...lineup.starters];
  for (const [index, id] of entries) starters[index] = id as SpeciesId;
  return { ...lineup, starters: starters as unknown as Lineup["starters"] };
}

const SNORLAX = 143;
const GULPIN = 316;
const PIKACHU = 25 as SpeciesId;

describe("provisionalTeamScore (the live Team Score during the draft)", () => {
  it("provisional equals rateTeam for full lineups: the two engine goldens score 593 and 480", () => {
    expect(provisionalTeamScore(GOLDEN_CUP8)).toBe(593);
    expect(provisionalTeamScore(GOLDEN_KANTO)).toBe(480);
  });

  it("provisional equals rateTeam for full lineups over 20 seeded random squads (catches a drift from the engine formula)", () => {
    const pairs = Array.from({ length: 20 }, (_, i) => {
      const lineup = randomFullLineup(`live-team-score-parity-${i}`);
      return [provisionalTeamScore(lineup), rateTeam(lineup).score];
    });
    for (const [provisional, engine] of pairs) {
      expect(typeof provisional).toBe("number");
      expect(provisional).toBe(engine);
    }
  });

  it("provisional with one GK placed is 869 (Snorlax at GK in a 4-3-3, nothing else drafted)", () => {
    expect(provisionalTeamScore(withStarters([[0, SNORLAX]]))).toBe(869);
  });

  it("shows nothing before the first starter is placed, even with a bench player signed", () => {
    const lineup = emptyLineup("4-3-3");
    expect(provisionalTeamScore(lineup)).toBeNull();
    const bench = [...lineup.bench];
    bench[0] = SNORLAX as SpeciesId;
    expect(
      provisionalTeamScore({ ...lineup, bench: bench as unknown as Lineup["bench"] }),
    ).toBeNull();
  });
});

describe("candidateScoreDelta (the signed change a candidate makes to the live Team Score)", () => {
  const lineup = withStarters([
    [0, SNORLAX],
    [9, GULPIN],
  ]);

  it("delta for candidate Pikachu with Snorlax at GK and Gulpin at ST is +268, at LW: the best empty slot, and the first of the tied LW and RW", () => {
    expect(provisionalTeamScore(lineup)).toBe(240);
    expect(candidateScoreDelta(lineup, PIKACHU, null)).toEqual({
      slot: { kind: "starter", index: 8 },
      delta: 268,
    });
  });

  it("gives the hovered slot's delta during a drag: Pikachu over LCB is -100", () => {
    expect(candidateScoreDelta(lineup, PIKACHU, { kind: "starter", index: 2 })).toEqual({
      slot: { kind: "starter", index: 2 },
      delta: -100,
    });
  });

  it("has no delta before a starter is placed, and none for a filled slot", () => {
    expect(candidateScoreDelta(emptyLineup("4-3-3"), PIKACHU, null)).toBeNull();
    expect(candidateScoreDelta(lineup, PIKACHU, { kind: "starter", index: 0 })).toBeNull();
  });
});
