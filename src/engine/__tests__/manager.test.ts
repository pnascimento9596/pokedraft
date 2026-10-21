import { describe, expect, it } from "vitest";
import { applyAction, createDraft, slotRefs } from "../draft";
import { replay } from "../replay";
import { decodeToken, encodeToken } from "../token";
import {
  RunTokenError,
  type BenchIndex,
  type DraftAction,
  type DraftSettings,
  type DraftState,
  type ManagerAction,
  type MatchResult,
  type RunToken,
  type Seed,
} from "../types";

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-2-3-1",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};

function rolled(state: DraftState): number {
  if (state.phase.kind !== "choosing") throw new Error(`expected a roll, got ${state.phase.kind}`);
  const roll = state.phase.roll;
  return roll.kind === "species" ? roll.species : roll.offers![0]!;
}

// The goldens' fixed cup8 script: no bot logic, so only the engine moves these pins.
function token(seed: Seed, manager?: readonly ManagerAction[]): RunToken {
  const actions: DraftAction[] = [];
  let state = createDraft(CUP8, seed);
  const push = (a: DraftAction): void => {
    actions.push(a);
    state = applyAction(state, a);
  };
  slotRefs().forEach((slot, round) => {
    if (round === 0) push({ type: "reroll", target: "type" });
    if (round === 6) push({ type: "reroll", target: "region" });
    push({ type: "pick", species: rolled(state) as never, slot });
  });
  return manager
    ? { v: 7, settings: CUP8, seed, actions, manager }
    : { v: 7, settings: CUP8, seed, actions };
}

const SEED = "golden-cup8" as Seed;
const run = (manager?: readonly ManagerAction[]) => replay(encodeToken(token(SEED, manager))).cup;
const played = (m: MatchResult | undefined) => {
  if (m?.status !== "played") throw new Error("expected a played match");
  return m;
};

function upTo(m: MatchResult, minute: number) {
  const p = played(m);
  return {
    goals: p.goals.filter((g) => g.minute <= minute),
    incidents: (p.incidents ?? []).filter((i) => i.minute <= minute),
    windows: (p.windows ?? []).filter((w) => w.minute <= minute),
  };
}

const BENCH = [784, 703, 942, 145, 884];
// A bench player the auto coach has not already brought on by this minute.
function freeBench(m: MatchResult, minute: number): BenchIndex {
  const used = new Set(
    (played(m).incidents ?? []).flatMap((i) =>
      i.kind === "sub" && i.minute <= minute ? [i.in] : [],
    ),
  );
  return BENCH.findIndex((id) => !used.has(id as never)) as BenchIndex;
}

describe("engine 6 coach decisions", () => {
  it("never rewrites a minute the touchline has already seen (prefix property)", () => {
    const base = run();
    for (const minute of [0, 20, 45, 60, 85]) {
      for (const decision of [
        { type: "tactic", match: 3, minute, tactic: "attack" },
        { type: "sub", match: 3, minute, slot: 9, bench: freeBench(base.matches[3]!, minute) },
      ] as const) {
        const coached = run([decision]);
        for (let i = 0; i < 3; i++) expect(coached.matches[i]).toEqual(base.matches[i]);
        const before = upTo(base.matches[3]!, minute);
        const after = upTo(coached.matches[3]!, minute);
        expect(after.goals).toEqual(before.goals);
        expect(after.windows).toEqual(before.windows);
        // The decision itself is logged at its minute; everything else up to it is unchanged.
        expect(after.incidents.filter((i) => i.minute < minute || i.side === "opp")).toEqual(
          before.incidents.filter((i) => i.minute < minute || i.side === "opp"),
        );
      }
    }
  });

  it("puts the chosen bench player in the chosen slot and logs it as the manager's", () => {
    const coached = run([{ type: "sub", match: 0, minute: 30, slot: 9, bench: 0 }]);
    const m = played(coached.matches[0]);
    expect(m.incidents).toContainEqual({
      kind: "sub",
      side: "user",
      minute: 30,
      slot: 9,
      out: 188,
      in: 784,
      reason: "tactical",
      by: "manager",
    });
    expect(m.windows!.find((w) => w.minute === 35)!.onPitch[9]).toBe(784);
    expect(coached.players.find((p) => p.species === 784)!.appearances).toBeGreaterThanOrEqual(1);
  });

  it("hands the touchline to the manager: no auto tactic for the user once they decide from half-time on", () => {
    const m = played(run([{ type: "tactic", match: 0, minute: 45, tactic: "press" }]).matches[0]);
    const userTactics = (m.incidents ?? []).filter((i) => i.kind === "tactic" && i.side === "user");
    expect(userTactics).toEqual([
      { kind: "tactic", side: "user", minute: 45, tactic: "press", by: "manager" },
    ]);
  });

  it.each<[string, ManagerAction[]]>([
    [
      "out of order",
      [
        { type: "tactic", match: 1, minute: 10, tactic: "attack" },
        { type: "tactic", match: 0, minute: 20, tactic: "defend" },
      ],
    ],
    ["after the final whistle", [{ type: "tactic", match: 0, minute: 100, tactic: "attack" }]],
    [
      "for a match the run never reached",
      [{ type: "tactic", match: 7, minute: 10, tactic: "attack" }],
    ],
    [
      "the same bench player twice",
      [
        { type: "sub", match: 0, minute: 30, slot: 9, bench: 0 },
        { type: "sub", match: 0, minute: 40, slot: 8, bench: 0 },
      ],
    ],
  ])("rejects a forged token with a decision %s", (_, manager) => {
    expect(() => run(manager)).toThrow(RunTokenError);
  });

  it("round-trips coach decisions through the share token and omits an empty list", () => {
    const manager: ManagerAction[] = [
      { type: "tactic", match: 0, minute: 0, tactic: "counter" },
      { type: "sub", match: 2, minute: 61, slot: 10, bench: 4 },
    ];
    expect(decodeToken(encodeToken(token(SEED, manager)))).toEqual(token(SEED, manager));
    expect(decodeToken(encodeToken(token(SEED))).manager).toBeUndefined();
    expect(encodeToken(token(SEED, []))).toBe(encodeToken(token(SEED)));
  });
});

describe("engine 6 incident rates across 60 fixed cup8 drafts", () => {
  const cups = Array.from(
    { length: 60 },
    (_, i) => replay(encodeToken(token(`rates-${i}` as Seed))).cup,
  );
  const matches = cups.flatMap((c) => c.matches.filter((m) => m.status === "played"));
  const count = (
    pred: (i: NonNullable<ReturnType<typeof played>["incidents"]>[number]) => boolean,
  ) => matches.reduce((n, m) => n + (m.incidents ?? []).filter(pred).length, 0) / matches.length;

  it("keeps red cards rare: a booked player eases off (bookedCaution) instead of collecting a second yellow", () => {
    // Before bookedCaution, reds ran at 0.39 a match, nearly all second yellows.
    expect(count((i) => i.kind === "red")).toBeLessThan(0.25);
  });

  it("lets the auto coach rotate tired legs (autoSubEnergy is reachable by 75')", () => {
    // At autoSubEnergy 72 no fatigue substitution ever fired.
    expect(count((i) => i.kind === "sub" && i.reason === "fatigue")).toBeGreaterThan(0.5);
  });
});
