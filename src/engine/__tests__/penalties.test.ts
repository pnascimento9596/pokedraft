import { describe, expect, it } from "vitest";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "../coefficients";
import { cupMatchInput } from "../cup";
import { playMatchCore, type ChanceObservation } from "../match";
import type { ManagerAction, Seed, StarterIndex } from "../types";
import { CUP8, draftLineup } from "./story-panel";

// Golden panel lineups (cup8, 4-2-3-1), uncoached unless a test names a decision.
function play(
  seed: string,
  match: number,
  manager: readonly ManagerAction[] = [],
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
) {
  const lineup = draftLineup(CUP8, seed as Seed);
  const input = cupMatchInput(lineup, seed as Seed, "cup8", match, manager, c);
  const chances: ChanceObservation[] = [];
  const result = playMatchCore(input, c, { chance: (ch) => chances.push(ch), window: () => {} });
  return {
    result,
    penalties: (result.incidents ?? []).filter((i) => i.kind === "penalty"),
    penaltyChances: chances.filter((ch) => ch.kind === "penalty"),
    userKickers: (result.shootout?.kicks ?? [])
      .filter((k) => k.side === "user")
      .map((k) => k.taker),
  };
}

const taker = (match: number, set: "penalty" | "freeKick", slot: number | null): ManagerAction => ({
  type: "taker",
  match,
  minute: 0,
  set,
  slot: slot as StarterIndex | null,
});

describe("engine 7 missable penalties (catches every awarded penalty going in)", () => {
  // panel-7 match 1: the set_pieces award draw gives the user a penalty at 9'. 802 takes it at
  // 0.85305 to score and puts it wide; a second award at 11' goes in.
  const v7 = play("panel-7", 1);

  it("panel-7 match 1: 802 misses a penalty at 9', the keeper is 88", () => {
    expect(v7.penalties).toEqual([
      {
        kind: "penalty",
        side: "user",
        minute: 9,
        slot: 7,
        taker: 802,
        keeper: 88,
        outcome: "missed",
      },
    ]);
  });

  it("the 9' kick is observed as a missed penalty chance at 0.85305, then 11' scores", () => {
    expect(v7.penaltyChances).toEqual([
      {
        window: 1,
        minute: 9,
        side: "user",
        p: 0.85305,
        outcome: "missed",
        kind: "penalty",
        shooter: 802,
        slot: 7,
      },
      {
        window: 2,
        minute: 11,
        side: "user",
        p: 0.85305,
        outcome: "goal",
        kind: "penalty",
        shooter: 802,
        slot: 7,
      },
    ]);
    expect(v7.result.goals.filter((g) => g.penalty).map((g) => [g.minute, g.scorer])).toEqual([
      [11, 802],
    ]);
  });

  it("panel-24 match 4: 346 saves 784's penalty at 71', the match still goes to extra time 2-2", () => {
    const run = play("panel-24", 4);
    expect(run.penalties).toEqual([
      {
        kind: "penalty",
        side: "user",
        minute: 71,
        slot: 10,
        taker: 784,
        keeper: 346,
        outcome: "saved",
      },
    ]);
    expect(run.penaltyChances.map((ch) => [ch.minute, ch.p, ch.outcome])).toEqual([
      [71, 0.7851, "saved"],
    ]);
    expect(run.result.regulation).toEqual({ user: 2, opp: 2 });
  });
});

describe("engine 7 nominated free-kick taker (catches the nomination being ignored)", () => {
  // panel-7 match 4: the weighted pick gives the 58' free kick to 858 in slot 9.
  it("uncoached, 858 scores the 58' free kick", () => {
    const run = play("panel-7", 4);
    expect(
      run.result.goals.filter((g) => g.kind === "free-kick").map((g) => [g.minute, g.scorer]),
    ).toEqual([[58, 858]]);
  });

  it("with slot 10 nominated from kickoff, 903 scores it instead", () => {
    const run = play("panel-7", 4, [taker(4, "freeKick", 10)]);
    expect(
      run.result.goals.filter((g) => g.kind === "free-kick").map((g) => [g.minute, g.scorer]),
    ).toEqual([[58, 903]]);
  });
});

describe("engine 7 nominated penalty taker (catches the shootout ignoring the nomination)", () => {
  // panel-2 match 3 ends 0-0 after extra time and goes to a shootout.
  it("uncoached, 149 kicks first", () => {
    expect(play("panel-2", 3).userKickers).toEqual([149, 392, 727, 638, 389]);
  });

  it("with slot 10 nominated, 857 kicks first and the rest keep their order", () => {
    const run = play("panel-2", 3, [taker(3, "penalty", 10)]);
    expect(run.userKickers).toEqual([857, 149, 392, 727, 638]);
    expect(run.result.outcome).toBe("L");
  });
});
