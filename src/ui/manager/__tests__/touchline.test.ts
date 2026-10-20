import { describe, expect, it } from "vitest";
import { createDraft, applyAction, runCup } from "@/engine";
import { slotRefs, toFullLineup } from "@/engine/draft";
import type {
  CupResult,
  DraftSettings,
  FullLineup,
  Incident,
  ManagerAction,
  Opponent,
  Seed,
  SpeciesId,
  WindowSnapshot,
} from "@/engine/types";
import {
  MAX_SUBS,
  decide,
  decideAll,
  fieldedFor,
  incidentsBefore,
  injuries,
  touchlineAt,
  type CupContext,
  type PlayedMatch,
} from "../touchline";

const id = (n: number) => n as SpeciesId;
const STARTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(id);
const BENCH = [21, 22, 23, 24, 25].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: STARTERS,
  bench: BENCH,
} as unknown as FullLineup;

const OPPONENT = {
  id: "o",
  name: "Opp",
  score: 500,
  lines: { GK: 50, DEF: 50, MID: 50, ATT: 50 },
  roster: [],
} as unknown as Opponent;

function windowAt(minute: number, energy: number, onPitch = STARTERS): WindowSnapshot {
  return {
    minute,
    score: { user: 0, opp: 0 },
    tactic: { user: "balanced", opp: "balanced" },
    energy: onPitch.map(() => energy),
    onPitch,
  };
}

function match(incidents: Incident[], extra: Partial<PlayedMatch> = {}): PlayedMatch {
  return {
    status: "played",
    round: "G1",
    opponent: OPPONENT,
    regulation: { user: 0, opp: 0 },
    extraTime: null,
    shootout: null,
    outcome: "D",
    goals: [],
    saves: [],
    incidents,
    windows: Array.from({ length: 18 }, (_, w) => windowAt((w + 1) * 5, 100 - (w + 1) * 2)),
    absences: [],
    rating: 500,
    recap: [],
    ...extra,
  };
}

describe("touchlineAt (catches a touchline that offers a used bench player or counts the assistant's pending change)", () => {
  it("counts every substitution, auto or manager, and takes the used bench players off the list", () => {
    const m = match([
      {
        kind: "sub",
        side: "user",
        minute: 20,
        slot: 9,
        out: id(10),
        in: id(22),
        reason: "tactical",
        by: "manager",
      },
      { kind: "injury", side: "user", minute: 30, slot: 4, player: id(5) },
      {
        kind: "sub",
        side: "user",
        minute: 30,
        slot: 4,
        out: id(5),
        in: id(24),
        reason: "injury",
        by: "auto",
      },
    ]);
    const t = touchlineAt(m, 0, LINEUP, [], 40);
    expect(t.subsUsed).toBe(2);
    expect(t.onPitch[9]).toBe(22);
    expect(t.onPitch[4]).toBe(24);
    expect(t.bench.map((b) => b.available)).toEqual([true, false, true, false, true]);
  });

  it("leaves out the assistant's boundary changes at the decision minute, which a decision would erase", () => {
    const m = match([
      { kind: "tactic", side: "user", minute: 60, tactic: "attack", by: "auto" },
      {
        kind: "sub",
        side: "user",
        minute: 60,
        slot: 6,
        out: id(7),
        in: id(21),
        reason: "fatigue",
        by: "auto",
      },
      { kind: "yellow", side: "user", minute: 60, slot: 2, player: id(3), secondYellow: false },
    ]);
    expect(incidentsBefore(m, 60).map((i) => i.kind)).toEqual(["yellow"]);
    const at60 = touchlineAt(m, 0, LINEUP, [], 60);
    expect(at60).toMatchObject({ tactic: "balanced", subsUsed: 0 });
    expect(at60.onPitch[6]).toBe(7);
    // A minute later they have happened.
    expect(touchlineAt(m, 0, LINEUP, [], 61)).toMatchObject({ tactic: "attack", subsUsed: 1 });
  });

  it("empties a slot after a red card and reads energy from the last window, fresh for a new arrival", () => {
    const m = match([
      { kind: "red", side: "user", minute: 12, slot: 3, player: id(4), secondYellow: false },
      {
        kind: "sub",
        side: "user",
        minute: 47,
        slot: 8,
        out: id(9),
        in: id(23),
        reason: "tactical",
        by: "manager",
      },
    ]);
    const t = touchlineAt(m, 0, LINEUP, [], 48);
    expect(t.onPitch[3]).toBeNull();
    expect(t.energy[3]).toBeNull();
    expect(t.energy[0]).toBe(82);
    expect(t.energy[8]).toBe(100);
    expect(touchlineAt(m, 0, LINEUP, [], 0).energy[0]).toBe(100);
  });

  it("marks the user's booked players, not the opponent's, and clears a slot when its player goes off (catches energy rows without yellow cards)", () => {
    const m = match([
      { kind: "yellow", side: "user", minute: 20, slot: 3, player: id(4), secondYellow: false },
      { kind: "yellow", side: "opp", minute: 22, slot: 5, player: id(150), secondYellow: false },
      {
        kind: "sub",
        side: "user",
        minute: 50,
        slot: 3,
        out: id(4),
        in: id(21),
        reason: "tactical",
        by: "manager",
      },
    ]);
    const booked = [false, false, false, true, false, false, false, false, false, false, false];
    expect(touchlineAt(m, 0, LINEUP, [], 30).yellow).toEqual(booked);
    expect(touchlineAt(m, 0, LINEUP, [], 60).yellow).toEqual(booked.map(() => false));
  });

  it("knows the assistant is off once the user has decided anything in this match", () => {
    const m = match([]);
    const actions: ManagerAction[] = [{ type: "tactic", match: 2, minute: 30, tactic: "press" }];
    expect(touchlineAt(m, 2, LINEUP, actions, 29).managed).toBe(false);
    expect(touchlineAt(m, 2, LINEUP, actions, 30).managed).toBe(true);
    expect(touchlineAt(m, 1, LINEUP, actions, 89).managed).toBe(false);
  });

  it("closes at the final whistle: 90 without extra time, 120 with it", () => {
    expect(touchlineAt(match([]), 0, LINEUP, [], 89).open).toBe(true);
    expect(touchlineAt(match([]), 0, LINEUP, [], 90).open).toBe(false);
    const et = match([], { extraTime: { user: 0, opp: 0 } });
    expect(touchlineAt(et, 0, LINEUP, [], 90).open).toBe(true);
    expect(touchlineAt(et, 0, LINEUP, [], 120).open).toBe(false);
  });

  it("is closed for a retained run with no windows", () => {
    expect(touchlineAt(match([], { windows: undefined }), 0, LINEUP, [], 10).open).toBe(false);
  });
});

describe("fieldedFor (catches bench indexes that ignore the pre-match absence)", () => {
  it("moves the replacement into the eleven and locks the absentee's bench seat", () => {
    const m = match([], { absences: [{ slot: "4-3-3.LCB" as never, out: id(3), in: id(23) }] });
    const f = fieldedFor(LINEUP, m);
    expect(f.starters[2]).toBe(23);
    expect(f.bench).toEqual([21, 22, 3, 24, 25]);
    expect(f.benchOut).toBe(2);
    expect(touchlineAt(m, 0, LINEUP, [], 0).bench.map((b) => b.available)).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });
});

describe("injuries (catches an injury prompt that preselects the wrong player or offers a sixth sub)", () => {
  it("names the assistant's replacement and offers it with every other free seat", () => {
    const m = match([
      {
        kind: "sub",
        side: "user",
        minute: 20,
        slot: 9,
        out: id(10),
        in: id(21),
        reason: "tactical",
        by: "manager",
      },
      { kind: "injury", side: "user", minute: 33, slot: 4, player: id(5) },
      {
        kind: "sub",
        side: "user",
        minute: 33,
        slot: 4,
        out: id(5),
        in: id(24),
        reason: "injury",
        by: "auto",
      },
    ]);
    expect(injuries(m, LINEUP)).toEqual([
      {
        minute: 33,
        slot: 4,
        player: 5,
        autoPick: 3,
        options: [
          { index: 1, species: 22, available: true },
          { index: 2, species: 23, available: true },
          { index: 3, species: 24, available: true },
          { index: 4, species: 25, available: true },
        ],
      },
    ]);
  });

  it("offers nothing once all five substitutions are used", () => {
    const subs: Incident[] = [21, 22, 23, 24, 25].map((n, k) => ({
      kind: "sub",
      side: "user",
      minute: 10 + k,
      slot: (k + 1) as never,
      out: id(k + 2),
      in: id(n),
      reason: "tactical",
      by: "manager",
    }));
    const m = match([
      ...subs,
      { kind: "injury", side: "user", minute: 70, slot: 9, player: id(10) },
    ]);
    expect(MAX_SUBS).toBe(5);
    expect(injuries(m, LINEUP)[0]).toMatchObject({ autoPick: null, options: [] });
  });
});

// A real cup: decide() replays it through the engine, so these only assert what the decision did.
const SETTINGS: DraftSettings = {
  mode: "cup8",
  formation: "4-2-3-1",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};

function realCup(seed: string): { ctx: CupContext; cup: CupResult } {
  let state = createDraft(SETTINGS, seed as Seed);
  for (const slot of slotRefs()) {
    const roll = state.phase.kind === "choosing" ? state.phase.roll : null;
    if (roll === null) throw new Error("expected a roll");
    const species = roll.kind === "species" ? roll.species : roll.offers![0]!;
    state = applyAction(state, { type: "pick", species, slot });
  }
  const ctx: CupContext = { lineup: toFullLineup(state), seed: seed as Seed, mode: "cup8" };
  return { ctx, cup: runCup(ctx.lineup, ctx.seed, ctx.mode) };
}

const played = (cup: CupResult, i: number) => {
  const m = cup.matches[i];
  if (m?.status !== "played") throw new Error("expected a played match");
  return m;
};

describe("decide (catches a recorder that emits an action the engine rejects)", () => {
  const { ctx, cup } = realCup("touch-2");

  it("records a kickoff tactic at minute 0 and the replayed match logs it as the manager's", () => {
    const v = decide(ctx, cup, [], 0, 0, { kind: "tactic", tactic: "attack" });
    if (!v.ok) throw new Error(v.reason);
    expect(v.actions).toEqual([{ type: "tactic", match: 0, minute: 0, tactic: "attack" }]);
    expect(played(v.cup, 0).incidents).toContainEqual({
      kind: "tactic",
      side: "user",
      minute: 0,
      tactic: "attack",
      by: "manager",
    });
  });

  it("refuses the tactic the side already plays, so a confirm at kickoff keeps the assistant", () => {
    expect(decide(ctx, cup, [], 0, 0, { kind: "tactic", tactic: "balanced" })).toEqual({
      ok: false,
      reason: "Your side already plays that way.",
    });
  });

  it("brings the named bench player on in the named slot", () => {
    const v = decide(ctx, cup, [], 1, 45, { kind: "sub", slot: 9, bench: 0 });
    if (!v.ok) throw new Error(v.reason);
    expect(v.actions).toEqual([{ type: "sub", match: 1, minute: 45, slot: 9, bench: 0 }]);
    expect(played(v.cup, 1).incidents).toContainEqual(
      expect.objectContaining({
        kind: "sub",
        minute: 45,
        slot: 9,
        in: ctx.lineup.bench[0],
        by: "manager",
      }),
    );
  });

  it("refuses a decision earlier than one already recorded, keeping match then minute order", () => {
    const first = decide(ctx, cup, [], 1, 45, { kind: "tactic", tactic: "defend" });
    if (!first.ok) throw new Error(first.reason);
    expect(
      decide(ctx, first.cup, first.actions, 1, 30, { kind: "tactic", tactic: "attack" }),
    ).toEqual({
      ok: false,
      reason: "That moment has already been played.",
    });
    expect(
      decide(ctx, first.cup, first.actions, 0, 80, { kind: "tactic", tactic: "attack" }),
    ).toMatchObject({
      ok: false,
    });
  });

  it("refuses the same bench player twice and a decision after the final whistle", () => {
    const first = decide(ctx, cup, [], 1, 20, { kind: "sub", slot: 9, bench: 0 });
    if (!first.ok) throw new Error(first.reason);
    expect(
      decide(ctx, first.cup, first.actions, 1, 50, { kind: "sub", slot: 8, bench: 0 }),
    ).toEqual({
      ok: false,
      reason: "That bench player cannot come on.",
    });
    expect(decide(ctx, cup, [], 1, 90, { kind: "tactic", tactic: "attack" })).toEqual({
      ok: false,
      reason: "The match is over.",
    });
  });

  it("stops at five substitutions", () => {
    let state = { cup, actions: [] as readonly ManagerAction[] };
    for (const [k, slot] of ([5, 6, 7, 8, 9] as const).entries()) {
      const v = decide(ctx, state.cup, state.actions, 1, 10 + k, {
        kind: "sub",
        slot,
        bench: k as never,
      });
      if (!v.ok) throw new Error(v.reason);
      state = v;
    }
    expect(state.actions).toHaveLength(5);
    expect(touchlineAt(played(state.cup, 1), 1, ctx.lineup, state.actions, 30).subsUsed).toBe(5);
    expect(
      decide(ctx, state.cup, state.actions, 1, 30, { kind: "sub", slot: 4, bench: 0 }),
    ).toEqual({
      ok: false,
      reason: "All 5 substitutions are used.",
    });
  });

  it("overrides the assistant's injury replacement with a sub at the injury's minute and slot", () => {
    const found = cup.matches
      .flatMap((m, i) =>
        m.status === "played" ? injuries(m, ctx.lineup).map((call) => ({ i, call })) : [],
      )
      .find(({ call }) => call.autoPick !== null && call.options.length > 1);
    if (found === undefined) throw new Error("fixture has no injury with a choice");
    const { i, call } = found;
    const other = call.options.find((b) => b.index !== call.autoPick)!;
    const v = decide(ctx, cup, [], i, call.minute, {
      kind: "sub",
      slot: call.slot,
      bench: other.index,
    });
    if (!v.ok) throw new Error(v.reason);
    const subs = (played(v.cup, i).incidents ?? []).filter(
      (x) => x.kind === "sub" && x.minute === call.minute && x.slot === call.slot,
    );
    expect(subs).toEqual([
      {
        kind: "sub",
        side: "user",
        minute: call.minute,
        slot: call.slot,
        out: call.player,
        in: other.species,
        reason: "injury",
        by: "manager",
      },
    ]);
  });
});

describe("nominated takers on the touchline (catches a nomination that takes over the assistant)", () => {
  const { ctx, cup } = realCup("touch-2");
  const PENALTY_10 = { kind: "taker", set: "penalty", slot: 10 } as const;

  it("records { type: 'taker', match: 0, minute: 0, set: 'penalty', slot: 10 } and leaves managed off", () => {
    const v = decide(ctx, cup, [], 0, 0, PENALTY_10);
    if (!v.ok) throw new Error(v.reason);
    expect(v.actions).toEqual([{ type: "taker", match: 0, minute: 0, set: "penalty", slot: 10 }]);
    const line = touchlineAt(played(v.cup, 0), 0, ctx.lineup, v.actions, 0);
    expect(line.takers).toEqual({ penalty: 10, freeKick: null });
    expect(line.managed).toBe(false);
  });

  it("a later stop still shows the nominee, and Auto records a null slot", () => {
    const v = decide(ctx, cup, [], 0, 0, PENALTY_10);
    if (!v.ok) throw new Error(v.reason);
    expect(touchlineAt(played(v.cup, 0), 0, ctx.lineup, v.actions, 60).takers.penalty).toBe(10);
    const auto = decide(ctx, v.cup, v.actions, 0, 60, {
      kind: "taker",
      set: "penalty",
      slot: null,
    });
    if (!auto.ok) throw new Error(auto.reason);
    expect(auto.actions.at(-1)).toEqual({
      type: "taker",
      match: 0,
      minute: 60,
      set: "penalty",
      slot: null,
    });
  });

  it("refuses the taker already in place: 'That is already your taker.'", () => {
    expect(decide(ctx, cup, [], 0, 0, { kind: "taker", set: "freeKick", slot: null })).toEqual({
      ok: false,
      reason: "That is already your taker.",
    });
  });

  it("decideAll records a tactic and both takers at kickoff in order", () => {
    const v = decideAll(ctx, cup, [], 0, 0, [
      { kind: "tactic", tactic: "attack" },
      PENALTY_10,
      { kind: "taker", set: "freeKick", slot: 9 },
    ]);
    if (!v.ok) throw new Error(v.reason);
    expect(v.actions).toEqual([
      { type: "tactic", match: 0, minute: 0, tactic: "attack" },
      { type: "taker", match: 0, minute: 0, set: "penalty", slot: 10 },
      { type: "taker", match: 0, minute: 0, set: "freeKick", slot: 9 },
    ]);
  });
});
