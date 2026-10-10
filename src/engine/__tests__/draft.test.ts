import { describe, expect, it } from "vitest";
import {
  applyAction,
  createDraft,
  eligibleSpecies,
  isComplete,
  rollFor,
  runDraft,
  slotRefs,
  toFullLineup,
} from "../draft";
import { SPECIES } from "../species";
import type {
  DraftAction,
  DraftErrorCode,
  DraftSettings,
  DraftState,
  Gen,
  Roll,
  Seed,
  SlotRef,
  SpeciesId,
} from "../types";

const ALL_GENS: readonly Gen[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const seed = (s: string): Seed => s as Seed;
const id = (n: number): SpeciesId => n as SpeciesId;
const s = (index: number): SlotRef => ({ kind: "starter", index }) as SlotRef;
const b = (index: number): SlotRef => ({ kind: "bench", index }) as SlotRef;
const pick = (species: number, slot: SlotRef | null): DraftAction => ({
  type: "pick",
  species: id(species),
  slot,
});

const OPEN_SQUAD: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: ALL_GENS,
  style: "open",
  order: "squadFirst",
};
const KANTO_OPEN: DraftSettings = { ...OPEN_SQUAD, gens: [1] };
const KANTO_CLASSIC: DraftSettings = { ...OPEN_SQUAD, gens: [1], style: "classic3" };
const POSITION_FIRST: DraftSettings = { ...OPEN_SQUAD, order: "positionFirst" };
const BUILDER: DraftSettings = {
  mode: "builder",
  formation: "4-4-2",
  gens: [1],
  legendaries: false,
};

function codeOf(fn: () => unknown): DraftErrorCode | "no error" {
  try {
    fn();
  } catch (e) {
    return (e as { code: DraftErrorCode }).code;
  }
  return "no error";
}

function comboMembers(region: string, type: string): number[] {
  return SPECIES.filter(
    (x) => x.region === region && (x.types as readonly string[]).includes(type),
  ).map((x) => x.id);
}

function choosingAt(
  settings: DraftSettings,
  drafted: readonly number[],
  roll: Roll,
  slot: SlotRef | null = null,
): DraftState {
  const base = createDraft(settings, seed("crafted"));
  const starters = base.lineup.starters.map((v, i) => (i < drafted.length ? id(drafted[i]!) : v));
  return {
    ...base,
    lineup: { ...base.lineup, starters: starters as unknown as DraftState["lineup"]["starters"] },
    round: drafted.length,
    drafted: drafted.map(id),
    phase: { kind: "choosing", roll, slot },
  };
}

describe("createDraft settings validation (catches unvalidated settings leaking into eligibility)", () => {
  it.each([
    ["empty gens", { ...OPEN_SQUAD, gens: [] }],
    ["duplicate gens", { ...OPEN_SQUAD, gens: [1, 1] as Gen[] }],
    ["unknown gen", { ...OPEN_SQUAD, gens: [10] as unknown as Gen[] }],
    ["unknown formation", { ...OPEN_SQUAD, formation: "9-9-9" }],
  ])("rejects %s with invalidSettings, not the reroll code invalidTarget", (_, settings) => {
    expect(codeOf(() => createDraft(settings as DraftSettings, seed("x")))).toBe("invalidSettings");
  });

  it("sorts gens ascending", () => {
    const state = createDraft({ ...OPEN_SQUAD, gens: [3, 1] as Gen[] }, seed("x"));
    expect(state.settings).toEqual({ ...OPEN_SQUAD, gens: [1, 3] });
  });
});

describe("initial phase per mode and order (catches the wrong first phase)", () => {
  it("builder starts building with an empty lineup", () => {
    const state = createDraft(BUILDER, seed("x"));
    expect(state.phase).toEqual({ kind: "building" });
    expect(state.lineup.starters).toEqual(Array(11).fill(null));
    expect(state.lineup.bench).toEqual(Array(5).fill(null));
  });

  it("positionFirst waits for a slot before rolling", () => {
    expect(createDraft(POSITION_FIRST, seed("x")).phase).toEqual({ kind: "awaitingSlot" });
  });

  it("squadFirst opens round 0 with the seeded roll", () => {
    expect(createDraft(OPEN_SQUAD, seed("golden-draft")).phase).toEqual({
      kind: "choosing",
      roll: { kind: "combo", region: "sinnoh", type: "fire", offers: null },
      slot: null,
    });
  });
});

describe("illegal actions throw the matching DraftError code (catches silent acceptance)", () => {
  const opened = createDraft(OPEN_SQUAD, seed("golden-draft"));
  const afterOne = applyAction(opened, pick(390, s(0)));

  it("wrongPhase: pick before a slot is chosen in positionFirst", () => {
    expect(codeOf(() => applyAction(createDraft(POSITION_FIRST, seed("x")), pick(1, null)))).toBe(
      "wrongPhase",
    );
  });

  it("wrongMode: builder cannot pick, rolled modes cannot place, squadFirst cannot chooseSlot", () => {
    expect(codeOf(() => applyAction(createDraft(BUILDER, seed("x")), pick(1, s(0))))).toBe(
      "wrongMode",
    );
    expect(codeOf(() => applyAction(opened, { type: "place", species: id(1), slot: s(0) }))).toBe(
      "wrongMode",
    );
    expect(codeOf(() => applyAction(opened, { type: "chooseSlot", slot: s(0) }))).toBe("wrongMode");
  });

  it("slotRequired, slotOccupied and a legal pick in squadFirst", () => {
    expect(codeOf(() => applyAction(opened, pick(390, null)))).toBe("slotRequired");
    expect(afterOne.phase.kind).toBe("choosing");
    const roll = afterOne.phase.kind === "choosing" ? afterOne.phase.roll : null;
    expect(roll).toEqual({ kind: "combo", region: "johto", type: "flying", offers: null });
    expect(codeOf(() => applyAction(afterOne, pick(163, s(0))))).toBe("slotOccupied");
    expect(applyAction(afterOne, pick(163, s(1))).drafted).toEqual([390, 163]);
  });

  it("notOffered: open style rejects a species outside the rolled combo", () => {
    expect(codeOf(() => applyAction(opened, pick(1, s(0))))).toBe("notOffered");
  });

  it("alreadyDrafted: a drafted species cannot be picked again", () => {
    const crafted = choosingAt(KANTO_OPEN, [4], {
      kind: "combo",
      region: "kanto",
      type: "fire",
      offers: null,
    });
    expect(codeOf(() => applyAction(crafted, pick(4, s(5))))).toBe("alreadyDrafted");
  });

  it("notOffered: classic3 rejects a combo member that was not offered", () => {
    const crafted = choosingAt(KANTO_CLASSIC, [], {
      kind: "combo",
      region: "kanto",
      type: "fire",
      offers: [id(4), id(5), id(6)],
    });
    expect(codeOf(() => applyAction(crafted, pick(37, s(0))))).toBe("notOffered");
    expect(applyAction(crafted, pick(5, s(0))).drafted).toEqual([5]);
  });

  it("noRerolls after the 3 shared cup8 rerolls", () => {
    const spent = [1, 2, 3].reduce(
      (state) => applyAction(state, { type: "reroll", target: "type" }),
      opened,
    );
    expect(spent.rerollsUsed).toBe(3);
    expect(codeOf(() => applyAction(spent, { type: "reroll", target: "region" }))).toBe(
      "noRerolls",
    );
  });

  it("invalidTarget: cup8 cannot reroll species, kanto151 cannot reroll type", () => {
    expect(codeOf(() => applyAction(opened, { type: "reroll", target: "species" }))).toBe(
      "invalidTarget",
    );
    const kanto = createDraft(
      { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
      seed("x"),
    );
    expect(codeOf(() => applyAction(kanto, { type: "reroll", target: "type" }))).toBe(
      "invalidTarget",
    );
  });

  it("noAlternatives: a region reroll with one selected gen is refused and not spent", () => {
    const kantoOnly = createDraft(KANTO_OPEN, seed("x"));
    expect(codeOf(() => applyAction(kantoOnly, { type: "reroll", target: "region" }))).toBe(
      "noAlternatives",
    );
    expect(kantoOnly.rerollsUsed).toBe(0);
    expect(applyAction(kantoOnly, { type: "reroll", target: "type" }).rerollsUsed).toBe(1);
  });
});

describe("legendary cap of 3 (catches a 4th special and special-only combos after the cap)", () => {
  const psychic: Roll = { kind: "combo", region: "kanto", type: "psychic", offers: null };

  it("blocks a 4th special in an open pick but allows a non-special from the same combo", () => {
    const capped = choosingAt(KANTO_OPEN, [144, 145, 146], psychic);
    expect(codeOf(() => applyAction(capped, pick(150, s(3))))).toBe("ineligible");
    expect(applyAction(capped, pick(63, s(3))).drafted).toEqual([144, 145, 146, 63]);
    const two = choosingAt(KANTO_OPEN, [144, 145], psychic);
    expect(applyAction(two, pick(150, s(2))).drafted).toEqual([144, 145, 150]);
  });

  it("never rolls kanto ice once Articuno is its only member and the cap is reached", () => {
    const rolledTypes = (drafted: number[]): Set<string> => {
      const seen = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        const roll = rollFor({
          settings: KANTO_OPEN as Extract<DraftSettings, { mode: "cup8" }>,
          seed: seed(`cap-${i}`),
          round: drafted.length,
          rerollsInRound: 0,
          drafted: drafted.map(id),
          reroll: null,
        });
        if (roll.kind === "combo") seen.add(roll.type);
      }
      return seen;
    };
    expect(rolledTypes([145, 146, 150, 87, 91, 124, 131]).has("ice")).toBe(false);
    expect(rolledTypes([145, 146, 87, 91, 124, 131]).has("ice")).toBe(true);
  });

  it("eligibleSpecies drops the remaining specials once 3 are drafted", () => {
    const kanto = createDraft(
      { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
      seed("x"),
    );
    expect(eligibleSpecies(kanto)).toHaveLength(151);
    const capped = { ...kanto, drafted: [id(144), id(145), id(146)] };
    expect(eligibleSpecies(capped)).toHaveLength(146);
    expect(eligibleSpecies(capped).includes(id(150))).toBe(false);
  });
});

describe("classic3 offers (catches duplicate offers and offers outside the combo)", () => {
  it("offers 3 distinct combo members, or the whole combo when it holds fewer", () => {
    for (let i = 0; i < 300; i++) {
      const roll = rollFor({
        settings: KANTO_CLASSIC as Extract<DraftSettings, { mode: "cup8" }>,
        seed: seed(`offers-${i}`),
        round: 0,
        rerollsInRound: 0,
        drafted: [],
        reroll: null,
      });
      if (roll.kind !== "combo" || roll.offers === null)
        throw new Error("expected classic3 offers");
      const members = comboMembers(roll.region, roll.type);
      expect(new Set(roll.offers).size).toBe(Math.min(3, members.length));
      expect(roll.offers.every((o) => members.includes(o))).toBe(true);
    }
  });

  it("offers both kanto steel species when the combo holds only 2", () => {
    expect(
      rollFor({
        settings: KANTO_CLASSIC as Extract<DraftSettings, { mode: "cup8" }>,
        seed: seed("steel-0"),
        round: 0,
        rerollsInRound: 0,
        drafted: [],
        reroll: null,
      }),
    ).toEqual({ kind: "combo", region: "kanto", type: "steel", offers: [81, 82] });
  });
});

describe("reroll exclusion (catches a reroll that returns the value it replaces)", () => {
  it("a type reroll keeps the region and changes the type; a region reroll changes the region", () => {
    for (let i = 0; i < 300; i++) {
      const state = createDraft(OPEN_SQUAD, seed(`reroll-${i}`));
      if (state.phase.kind !== "choosing" || state.phase.roll.kind !== "combo") throw new Error();
      const before = state.phase.roll;
      const typed = applyAction(state, { type: "reroll", target: "type" });
      const regioned = applyAction(state, { type: "reroll", target: "region" });
      if (typed.phase.kind !== "choosing" || typed.phase.roll.kind !== "combo") throw new Error();
      if (regioned.phase.kind !== "choosing" || regioned.phase.roll.kind !== "combo") {
        throw new Error();
      }
      expect(typed.phase.roll.region).toBe(before.region);
      expect(typed.phase.roll.type).not.toBe(before.type);
      expect(regioned.phase.roll.region).not.toBe(before.region);
      expect(typed.rerollsInRound).toBe(1);
    }
  });

  it("a kanto151 species reroll never returns the same species", () => {
    for (let i = 0; i < 300; i++) {
      const state = createDraft(
        { mode: "kanto151", formation: "4-3-3", order: "squadFirst" },
        seed(`species-${i}`),
      );
      const next = applyAction(state, { type: "reroll", target: "species" });
      if (state.phase.kind !== "choosing" || next.phase.kind !== "choosing") throw new Error();
      expect(next.phase.roll).not.toEqual(state.phase.roll);
      expect(next.phase.roll.kind).toBe("species");
    }
  });
});

describe("swap (catches swaps that drop or duplicate a species)", () => {
  it("swaps two filled slots and moves a species into an empty slot", () => {
    const two = runDraft(OPEN_SQUAD, seed("golden-draft"), [pick(390, s(0)), pick(163, s(1))]);
    const swapped = applyAction(two, { type: "swap", a: s(0), b: s(1) });
    expect(swapped.lineup.starters.slice(0, 2)).toEqual([163, 390]);
    const moved = applyAction(swapped, { type: "swap", a: s(0), b: b(4) });
    expect(moved.lineup.starters[0]).toBe(null);
    expect(moved.lineup.bench[4]).toBe(163);
    expect(moved.drafted).toEqual([390, 163]);
  });
});

describe("builder place, swap and clear (catches duplicated species and a stale drafted list)", () => {
  it("placing a species already in the lineup swaps it with the target", () => {
    const actions: DraftAction[] = [
      { type: "place", species: id(25), slot: s(0) },
      { type: "place", species: id(4), slot: s(1) },
      { type: "place", species: id(25), slot: s(1) },
    ];
    const state = runDraft(BUILDER, seed("x"), actions);
    expect(state.lineup.starters.slice(0, 2)).toEqual([4, 25]);
    expect(state.drafted).toEqual([4, 25]);
    const replaced = applyAction(state, { type: "place", species: id(7), slot: s(0) });
    expect(replaced.lineup.starters.slice(0, 2)).toEqual([7, 25]);
    expect(replaced.drafted).toEqual([7, 25]);
    const benched = applyAction(replaced, { type: "swap", a: s(0), b: b(0) });
    expect(benched.drafted).toEqual([25, 7]);
    expect(applyAction(benched, { type: "clear", slot: s(1) }).drafted).toEqual([7]);
  });

  it("rejects a legendary with the toggle off and a species outside the selected gens", () => {
    const state = createDraft(BUILDER, seed("x"));
    expect(codeOf(() => applyAction(state, { type: "place", species: id(150), slot: s(0) }))).toBe(
      "ineligible",
    );
    expect(codeOf(() => applyAction(state, { type: "place", species: id(152), slot: s(0) }))).toBe(
      "ineligible",
    );
    const on = createDraft({ ...BUILDER, legendaries: true }, seed("x"));
    expect(applyAction(on, { type: "place", species: id(150), slot: s(0) }).drafted).toEqual([150]);
  });

  it("isComplete only once all 16 slots hold a species", () => {
    const actions = slotRefs().map((slot, i): DraftAction => ({
      type: "place",
      species: id(i + 1),
      slot,
    }));
    const full = runDraft(BUILDER, seed("x"), actions);
    expect(isComplete(full)).toBe(true);
    expect(isComplete(runDraft(BUILDER, seed("x"), actions.slice(0, 15)))).toBe(false);
    expect(toFullLineup(full).bench).toEqual([12, 13, 14, 15, 16]);
  });
});

describe("positionFirst flow (catches a roll that reads the committed slot)", () => {
  const start = createDraft(POSITION_FIRST, seed("golden-draft"));

  it("commits a slot, rolls independently of it, and keeps it across rerolls", () => {
    const atFive = applyAction(start, { type: "chooseSlot", slot: s(5) });
    const atBench = applyAction(start, { type: "chooseSlot", slot: b(2) });
    expect(atFive.phase).toEqual({
      kind: "choosing",
      roll: { kind: "combo", region: "sinnoh", type: "fire", offers: null },
      slot: s(5),
    });
    expect(atBench.phase.kind === "choosing" && atBench.phase.roll).toEqual({
      kind: "combo",
      region: "sinnoh",
      type: "fire",
      offers: null,
    });
    const rerolled = applyAction(atFive, { type: "reroll", target: "type" });
    expect(rerolled.phase.kind === "choosing" && rerolled.phase.slot).toEqual(s(5));
  });

  it("refuses swaps and picks that touch another slot, then fills the committed slot", () => {
    const atFive = applyAction(start, { type: "chooseSlot", slot: s(5) });
    expect(codeOf(() => applyAction(atFive, { type: "swap", a: s(5), b: s(0) }))).toBe(
      "slotMismatch",
    );
    expect(codeOf(() => applyAction(atFive, pick(390, s(4))))).toBe("slotMismatch");
    const picked = applyAction(atFive, pick(390, null));
    expect(picked.lineup.starters[5]).toBe(390);
    expect(picked.round).toBe(1);
    expect(picked.phase).toEqual({ kind: "awaitingSlot" });
    expect(codeOf(() => applyAction(picked, { type: "chooseSlot", slot: s(5) }))).toBe(
      "slotOccupied",
    );
  });
});

const GOLDEN_ACTIONS: readonly DraftAction[] = [
  pick(390, s(0)),
  pick(163, s(1)),
  { type: "reroll", target: "type" },
  pick(258, s(2)),
  pick(821, s(3)),
  pick(170, s(4)),
  { type: "reroll", target: "region" },
  pick(744, s(5)),
  pick(177, s(6)),
  pick(387, s(7)),
  pick(524, s(8)),
  pick(728, s(9)),
  pick(494, s(10)),
  pick(854, b(0)),
  pick(911, b(1)),
  pick(256, b(2)),
  pick(690, b(3)),
  pick(819, b(4)),
];

describe("golden cup8 open run (catches any drift in roll streams or pick handling)", () => {
  const done = runDraft(OPEN_SQUAD, seed("golden-draft"), GOLDEN_ACTIONS);

  it("drafts the pinned species and completes", () => {
    expect(done.drafted).toEqual([
      390, 163, 258, 821, 170, 744, 177, 387, 524, 728, 494, 854, 911, 256, 690, 819,
    ]);
    expect(done.phase).toEqual({ kind: "complete" });
    expect(done.rerollsUsed).toBe(2);
    expect(toFullLineup(done).starters[10]).toBe(494);
  });

  it("survives a JSON round trip unchanged at every step", () => {
    let state = createDraft(OPEN_SQUAD, seed("golden-draft"));
    for (const action of GOLDEN_ACTIONS) {
      state = applyAction(state, action);
      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    }
  });

  it("does not mutate the input state", () => {
    const start = createDraft(OPEN_SQUAD, seed("golden-draft"));
    const snapshot = JSON.stringify(start);
    applyAction(start, GOLDEN_ACTIONS[0]!);
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it("toFullLineup refuses a lineup with empty slots", () => {
    expect(() => toFullLineup(createDraft(OPEN_SQUAD, seed("golden-draft")))).toThrow(
      "the lineup still has empty slots",
    );
  });
});
