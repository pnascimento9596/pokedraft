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
  return { v: 2, settings, seed, actions };
}

const CUP8_TOKEN = token(CUP8, "golden-cup8" as Seed);
const KANTO_TOKEN = token(KANTO, "golden-kanto151" as Seed);

describe("engine goldens (any byte of drift in draft, rating, match or cup output moves a hash)", () => {
  it("pins the engine version these goldens were cut against", () => {
    expect(ENGINE_VERSION).toBe("pokedraft-engine-2");
  });

  it("byte-pins a full cup8 classic3 run", () => {
    const s = encodeToken(CUP8_TOKEN);
    const run = replay(s);
    expect(CUP8_TOKEN.actions).toHaveLength(18);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([593, 3, "R16"]);
    expect(sha256(s)).toBe("19d825f1e323eca01da9c3a92fd02428bfd0b7549e622a1ed6b4d34efe0f4107");
    expect(sha256(JSON.stringify(run))).toBe(
      "20e343f8bc4ac7414f1edfc9b56901533b84a27b1ae4deba5989824a9f0b684b",
    );
  });

  it("byte-pins a full kanto151 run", () => {
    const s = encodeToken(KANTO_TOKEN);
    const run = replay(s);
    expect(KANTO_TOKEN.actions).toHaveLength(36);
    expect([run.cup.rating.score, run.cup.wins, run.cup.finish]).toEqual([480, 3, "QF"]);
    expect(sha256(s)).toBe("36035c63e7778a21d7b3a2d1c842bae057f7aacf43424b1be2ce0d965725de8e");
    expect(sha256(JSON.stringify(run))).toBe(
      "26f6ca832cf8a66a911747a72fb034add01cc66a4968d42009dd52d3ac3c28c6",
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
