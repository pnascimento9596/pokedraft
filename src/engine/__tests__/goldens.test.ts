import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyAction, createDraft, slotRefs } from "../draft";
import { replay } from "../replay";
import { decodeToken, encodeToken } from "../token";
import {
  ENGINE_VERSION,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type RunToken,
  type Seed,
} from "../types";

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

function rolled(state: DraftState): number {
  if (state.phase.kind !== "choosing")
    throw new Error(`expected a roll, phase is ${state.phase.kind}`);
  const roll = state.phase.roll;
  if (roll.kind === "species") return roll.species;
  return roll.offers![0]!;
}

// Fixed scripts: no bot logic, so a golden moves only when the engine does.
function cup8Actions(settings: DraftSettings, seed: Seed): DraftAction[] {
  const actions: DraftAction[] = [];
  let state = createDraft(settings, seed);
  const push = (a: DraftAction): void => {
    actions.push(a);
    state = applyAction(state, a);
  };
  slotRefs().forEach((slot, round) => {
    if (round === 0) push({ type: "reroll", target: "type" });
    if (round === 6) push({ type: "reroll", target: "region" });
    push({ type: "pick", species: rolled(state) as never, slot });
  });
  return actions;
}

function kantoActions(settings: DraftSettings, seed: Seed): DraftAction[] {
  const actions: DraftAction[] = [];
  let state = createDraft(settings, seed);
  const push = (a: DraftAction): void => {
    actions.push(a);
    state = applyAction(state, a);
  };
  slotRefs().forEach((slot, round) => {
    push({ type: "chooseSlot", slot });
    if (round % 4 === 1) push({ type: "reroll", target: "species" });
    push({ type: "pick", species: rolled(state) as never, slot });
  });
  return actions;
}

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-2-3-1",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};
const KANTO: DraftSettings = { mode: "kanto151", formation: "3-5-2", order: "positionFirst" };

function token(settings: DraftSettings, seed: Seed): RunToken {
  const actions =
    settings.mode === "kanto151" ? kantoActions(settings, seed) : cup8Actions(settings, seed);
  return { v: 6, settings, seed, actions };
}

const CUP8_TOKEN = token(CUP8, "golden-cup8" as Seed);
const KANTO_TOKEN = token(KANTO, "golden-kanto151" as Seed);

describe("engine goldens (any byte of drift in draft, rating, match or cup output moves a hash)", () => {
  it("pins the engine version these goldens were cut against", () => {
    expect(ENGINE_VERSION).toBe("pokedraft-engine-5");
  });

  it("keeps the engine-4 simulation outcomes and draft Team Scores", () => {
    const run = replay(encodeToken(CUP8_TOKEN));
    expect([
      run.cup.rating.score,
      run.cup.wins,
      run.cup.draws,
      run.cup.losses,
      run.cup.finish,
    ]).toEqual([593, 3, 0, 2, "R16"]);
    const kanto = replay(encodeToken(KANTO_TOKEN));
    expect([
      kanto.cup.rating.score,
      kanto.cup.wins,
      kanto.cup.draws,
      kanto.cup.losses,
      kanto.cup.finish,
    ]).toEqual([480, 0, 3, 0, "group"]);
  });

  it("attributes every opponent goal and shootout kick to a Boss Club roster member", () => {
    const run = replay(encodeToken(CUP8_TOKEN));
    for (const m of run.cup.matches) {
      if (m.status !== "played") continue;
      const roster = new Set(
        m.opponent.roster.filter((r) => r.kind === "species").map((r) => r.id),
      );
      for (const g of m.goals) {
        if (g.side !== "opp") continue;
        expect(g.scorer.kind).toBe("species");
        if (g.scorer.kind === "species") expect(roster.has(g.scorer.id)).toBe(true);
        if (g.assist !== null && g.assist.kind === "species")
          expect(roster.has(g.assist.id)).toBe(true);
      }
      if (m.shootout !== null)
        for (const k of m.shootout.kicks) {
          if (k.side !== "opp") continue;
          expect(k.taker.kind).toBe("species");
          if (k.taker.kind === "species") expect(roster.has(k.taker.id)).toBe(true);
        }
    }
  });

  it("byte-pins a full cup8 classic3 run", () => {
    const s = encodeToken(CUP8_TOKEN);
    const run = replay(s);
    expect(CUP8_TOKEN.actions).toHaveLength(18);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([593, 3, "R16"]);
    expect(sha256(s)).toBe("d3a15998448b19a8e7f8489363d4514de2547a1bdac4a1891524de09f3253b25");
    expect(sha256(JSON.stringify(run))).toBe(
      "d3f3598c4ed414bad106ecec4efe543774be9988718833f9172542cff9fdbd5a",
    );
  });

  it("byte-pins a full kanto151 run", () => {
    const s = encodeToken(KANTO_TOKEN);
    const run = replay(s);
    expect(KANTO_TOKEN.actions).toHaveLength(36);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([480, 0, "group"]);
    expect(sha256(s)).toBe("a4a679846ef8515ef6c0e2d0a001e324e080a33db0e0d0a9ff5cb4559bf50fbe");
    expect(sha256(JSON.stringify(run))).toBe(
      "d4d1db9bd84cbd39eae072a86791a76864a16f96db5844c5be67df7c1ab2a95a",
    );
  });

  it("round-trips both tokens exactly", () => {
    for (const t of [CUP8_TOKEN, KANTO_TOKEN]) {
      const s = encodeToken(t);
      expect(decodeToken(s)).toEqual(t);
      expect(encodeToken(decodeToken(s))).toBe(s);
    }
  });

  it("pins the Team Scores of a 20-run seeded panel", () => {
    const scores = Array.from({ length: 20 }, (_, i) => {
      const settings = i < 10 ? CUP8 : KANTO;
      return replay(token(settings, `panel-${i}` as Seed)).cup.rating.score;
    });
    expect(scores).toEqual([
      361, 473, 487, 521, 428, 437, 376, 592, 392, 498, 600, 502, 497, 432, 563, 398, 491, 555, 456,
      489,
    ]);
  });
});
