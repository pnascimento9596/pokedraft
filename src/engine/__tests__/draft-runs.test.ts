import { describe, expect, it } from "vitest";
import { applyAction, createDraft, slotRefs } from "../draft";
import { createEngineRng, type EngineRng } from "../rng";
import { SPECIES, speciesById } from "../species";
import {
  DraftError,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type RerollTarget,
  type Seed,
  type SlotRef,
  type SpeciesId,
} from "../types";

const RUNS = 10_000;
const CUP8_OPEN_CAPPED = 9902;
const CUP8_OPEN_REROLLS = 24784;
const CUP8_CLASSIC_CAPPED = 6684;
const CUP8_CLASSIC_REROLLS = 24739;
const KANTO_CAPPED = 97;
const KANTO_REROLLS = 30716;
const ISOLATION_COMPARED = 2311;
const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const COMBOS = new Map<string, number[]>();
for (const sp of SPECIES) {
  for (const type of sp.types) {
    const key = `${sp.region}:${type}`;
    COMBOS.set(key, [...(COMBOS.get(key) ?? []), sp.id]);
  }
}

interface Tally {
  emptyRolls: number;
  badOffers: number;
  capBreaches: number;
  incomplete: number;
  cappedRuns: number;
  rerollsSpent: number;
  refusedRerolls: number;
}

function specialCount(ids: readonly number[]): number {
  return ids.filter((n) => speciesById(n).special).length;
}

function openSlots(state: DraftState): SlotRef[] {
  return slotRefs().filter((ref) =>
    ref.kind === "starter"
      ? state.lineup.starters[ref.index] === null
      : state.lineup.bench[ref.index] === null,
  );
}

function pickableNow(state: DraftState, tally: Tally): number[] {
  if (state.phase.kind !== "choosing") throw new Error("expected choosing");
  const roll = state.phase.roll;
  const capped = specialCount(state.drafted) >= 3;
  const open = (n: number) =>
    !state.drafted.includes(n as SpeciesId) && !(capped && speciesById(n).special);
  if (roll.kind === "species") return open(roll.species) ? [roll.species] : [];
  const members = (COMBOS.get(`${roll.region}:${roll.type}`) ?? []).filter(open);
  if (roll.offers === null) return members;
  if (
    roll.offers.length !== Math.min(3, members.length) ||
    !roll.offers.every((o) => members.includes(o))
  ) {
    tally.badOffers += 1;
  }
  return [...roll.offers];
}

function botRun(settings: DraftSettings, i: number, tally: Tally): DraftState {
  const bot: EngineRng = createEngineRng(`bot-${i}`);
  const targets: readonly RerollTarget[] =
    settings.mode === "kanto151" ? ["species"] : ["type", "region"];
  const rerollLimit = settings.mode === "kanto151" ? 5 : 3;
  let state = createDraft(settings, `run-${i}` as Seed);
  while (state.phase.kind !== "complete") {
    if (state.phase.kind === "awaitingSlot") {
      state = applyAction(state, { type: "chooseSlot", slot: bot.pick(openSlots(state)) });
      continue;
    }
    if (state.rerollsUsed < rerollLimit && bot.int(5) === 0) {
      try {
        state = applyAction(state, { type: "reroll", target: bot.pick(targets) });
        tally.rerollsSpent += 1;
      } catch (e) {
        if (!(e instanceof DraftError) || e.code !== "noAlternatives") throw e;
        tally.refusedRerolls += 1;
      }
    }
    const options = pickableNow(state, tally);
    if (options.length === 0) {
      tally.emptyRolls += 1;
      return state;
    }
    const specials = options.filter((n) => speciesById(n).special);
    const species = (
      specials.length > 0 && bot.int(5) < 4 ? bot.pick(specials) : bot.pick(options)
    ) as SpeciesId;
    const committed = state.phase.kind === "choosing" ? state.phase.slot : null;
    const slot =
      committed === null ? bot.pick(openSlots(state)) : bot.int(2) === 0 ? null : committed;
    const action: DraftAction = { type: "pick", species, slot };
    state = applyAction(state, action);
  }
  return state;
}

function runMode(settings: DraftSettings): Tally {
  const tally: Tally = {
    emptyRolls: 0,
    badOffers: 0,
    capBreaches: 0,
    incomplete: 0,
    cappedRuns: 0,
    rerollsSpent: 0,
    refusedRerolls: 0,
  };
  for (let i = 0; i < RUNS; i++) {
    const end = botRun(settings, i, tally);
    const specials = specialCount(end.drafted);
    if (specials > 3) tally.capBreaches += 1;
    if (specials === 3) tally.cappedRuns += 1;
    const filled = [...end.lineup.starters, ...end.lineup.bench];
    if (
      end.phase.kind !== "complete" ||
      new Set(end.drafted).size !== 16 ||
      filled.some((n) => n === null) ||
      new Set(filled).size !== 16
    ) {
      tally.incomplete += 1;
    }
  }
  return tally;
}

describe("10,000 seeded bot runs per mode (catches empty rolls, cap breaches and stuck drafts)", () => {
  it("cup8 open squadFirst", { timeout: 60_000 }, () => {
    const tally = runMode({
      mode: "cup8",
      formation: "4-3-3",
      gens: ALL_GENS,
      style: "open",
      order: "squadFirst",
    });
    expect(tally).toEqual({
      emptyRolls: 0,
      badOffers: 0,
      capBreaches: 0,
      incomplete: 0,
      cappedRuns: CUP8_OPEN_CAPPED,
      rerollsSpent: CUP8_OPEN_REROLLS,
      refusedRerolls: 0,
    });
  });

  it("cup8 classic3 positionFirst", { timeout: 60_000 }, () => {
    const tally = runMode({
      mode: "cup8",
      formation: "3-5-2",
      gens: ALL_GENS,
      style: "classic3",
      order: "positionFirst",
    });
    expect(tally).toEqual({
      emptyRolls: 0,
      badOffers: 0,
      capBreaches: 0,
      incomplete: 0,
      cappedRuns: CUP8_CLASSIC_CAPPED,
      rerollsSpent: CUP8_CLASSIC_REROLLS,
      refusedRerolls: 0,
    });
  });

  it("kanto151 squadFirst", { timeout: 60_000 }, () => {
    const tally = runMode({ mode: "kanto151", formation: "4-4-2", order: "squadFirst" });
    expect(tally).toEqual({
      emptyRolls: 0,
      badOffers: 0,
      capBreaches: 0,
      incomplete: 0,
      cappedRuns: KANTO_CAPPED,
      rerollsSpent: KANTO_REROLLS,
      refusedRerolls: 0,
    });
  });
});

describe("reroll isolation (catches a substream keyed on the run-wide reroll count)", () => {
  it(
    "picking the same species with or without a type reroll gives the same next roll",
    { timeout: 60_000 },
    () => {
      const settings: DraftSettings = {
        mode: "cup8",
        formation: "4-3-3",
        gens: ALL_GENS,
        style: "open",
        order: "squadFirst",
      };
      let compared = 0;
      let differing = 0;
      for (let i = 0; i < RUNS; i++) {
        const start = createDraft(settings, `iso-${i}` as Seed);
        const rerolled = applyAction(start, { type: "reroll", target: "type" });
        if (start.phase.kind !== "choosing" || rerolled.phase.kind !== "choosing")
          throw new Error();
        const before = start.phase.roll;
        const after = rerolled.phase.roll;
        if (before.kind !== "combo" || after.kind !== "combo") throw new Error();
        const shared = SPECIES.find(
          (sp) =>
            sp.region === before.region &&
            (sp.types as readonly string[]).includes(before.type) &&
            (sp.types as readonly string[]).includes(after.type),
        );
        if (shared === undefined) continue;
        const slot: SlotRef = { kind: "starter", index: 0 };
        const direct = applyAction(start, { type: "pick", species: shared.id, slot });
        const viaReroll = applyAction(rerolled, { type: "pick", species: shared.id, slot });
        compared += 1;
        if (
          viaReroll.rerollsUsed !== 1 ||
          JSON.stringify(direct.phase) !== JSON.stringify(viaReroll.phase)
        ) {
          differing += 1;
        }
      }
      expect({ compared, differing }).toEqual({ compared: ISOLATION_COMPARED, differing: 0 });
    },
  );
});
