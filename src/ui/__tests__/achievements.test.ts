import { describe, expect, it } from "vitest";
import type {
  CupResult,
  DraftSettings,
  GoalEvent,
  MatchResult,
  Shirt,
  SpeciesId,
} from "@/engine/types";
import {
  ACHIEVEMENT_LABEL,
  ACHIEVEMENTS_SINCE,
  chipAchievement,
  lifetimeAchievements,
  runAchievements,
} from "../achievements";
import { countRun, emptyLifetime, mergeLifetime, type LifetimeTotals } from "../lifetime";
import { toRecord, type RunRecord } from "../runs";

const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "open",
  order: "squadFirst",
};
const KANTO: DraftSettings = { mode: "kanto151", formation: "4-4-2", order: "squadFirst" };
const BUILDER: DraftSettings = {
  mode: "builder",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  legendaries: true,
};

const PIKACHU = 25 as SpeciesId;
const RAICHU = 26 as SpeciesId;
const mine = (minute: number, scorer: SpeciesId = PIKACHU): GoalEvent => ({
  side: "user",
  minute,
  penalty: false,
  scorer,
  assist: null,
});
const theirs = (minute: number): GoalEvent => ({
  side: "opp",
  minute,
  penalty: false,
  scorer: { kind: "shirt", number: 9 as Shirt },
  assist: null,
});

interface MatchSpec {
  readonly goals?: readonly GoalEvent[];
  readonly extraTime?: { user: number; opp: number } | null;
  readonly shootout?: { user: number; opp: number } | null;
  readonly outcome?: "W" | "D" | "L";
  readonly oppScore?: number;
  readonly rating?: number;
}

function match({
  goals = [],
  extraTime = null,
  shootout = null,
  outcome,
  oppScore = 600,
  rating = 600,
}: MatchSpec): MatchResult {
  const regulationGoals = goals.filter((g) => g.minute <= 90);
  const regulation = {
    user: regulationGoals.filter((g) => g.side === "user").length,
    opp: regulationGoals.filter((g) => g.side === "opp").length,
  };
  return {
    status: "played",
    round: "QF",
    opponent: {
      id: "boss",
      name: "Boss",
      score: oppScore,
      lines: { GK: 50, DEF: 50, MID: 50, ATT: 50 },
      roster: [],
    },
    regulation,
    extraTime,
    shootout:
      shootout === null
        ? null
        : { ...shootout, keeper: PIKACHU, kicks: [], decider: "kicks", coinWinner: null },
    outcome: outcome ?? "W",
    goals,
    absences: [],
    rating,
    recap: [],
  } as MatchResult;
}

function cup(matches: readonly MatchResult[], extra: Partial<CupResult> = {}): CupResult {
  return {
    engine: "pokedraft-engine-6",
    seed: "fixture",
    mode: "cup8",
    rating: { score: 600 },
    group: [],
    matches,
    wins: matches.filter((m) => m.status === "played" && m.outcome === "W").length,
    draws: 0,
    losses: 0,
    finish: "QF",
    flawless: false,
    players: [],
    awards: {},
    ...extra,
  } as unknown as CupResult;
}

const ranked = (settings: DraftSettings, c: CupResult) => runAchievements({ settings }, c);

describe("runAchievements definitions (literal fixture cups)", () => {
  it("a hat-trick by one player in one match earns Hat-trick hero", () => {
    expect(ranked(CUP8, cup([match({ goals: [mine(10), mine(40), mine(88)] })]))).toEqual([
      "hat-trick-hero",
    ]);
  });

  it("a 2-goal match is not a hat-trick, and three goals shared by two players are not either", () => {
    expect(ranked(CUP8, cup([match({ goals: [mine(10), mine(40)] })]))).toEqual([]);
    expect(ranked(CUP8, cup([match({ goals: [mine(10), mine(40), mine(70, RAICHU)] })]))).toEqual(
      [],
    );
  });

  it("an extra-time goal completes a hat-trick", () => {
    const et = match({
      goals: [mine(20), theirs(30), mine(60), theirs(80), mine(105)],
      extraTime: { user: 1, opp: 0 },
    });
    expect(ranked(CUP8, cup([et]))).toContain("hat-trick-hero");
  });

  it("goals spread over two matches are not a hat-trick (catches a cup-wide goal count)", () => {
    const one = match({ goals: [mine(10), mine(40)] });
    const two = match({ goals: [mine(15)] });
    expect(ranked(CUP8, cup([one, two]))).toEqual([]);
  });

  it("winning after trailing earns Comeback", () => {
    expect(ranked(CUP8, cup([match({ goals: [theirs(5), mine(30), mine(70)] })]))).toEqual([
      "comeback",
    ]);
  });

  it("a draw after trailing is not a comeback", () => {
    expect(ranked(CUP8, cup([match({ goals: [theirs(5), mine(30)], outcome: "D" })]))).toEqual([]);
  });

  it("a shootout win after trailing is not a comeback, because the match was level after extra time", () => {
    const pens = match({
      goals: [theirs(5), mine(30)],
      extraTime: { user: 0, opp: 0 },
      shootout: { user: 4, opp: 3 },
      outcome: "W",
    });
    expect(ranked(CUP8, cup([pens]))).toEqual([]);
  });

  it("an extra-time winner after trailing earns Comeback", () => {
    const et = match({
      goals: [theirs(5), mine(30), mine(110)],
      extraTime: { user: 1, opp: 0 },
    });
    expect(ranked(CUP8, cup([et]))).toEqual(["comeback"]);
  });

  it("reads goals in minute order, so a list out of order cannot hide the deficit", () => {
    expect(ranked(CUP8, cup([match({ goals: [mine(30), mine(70), theirs(5)] })]))).toEqual([
      "comeback",
    ]);
  });

  it("a win over an opponent 100 above the fielded rating earns Giant killer", () => {
    expect(ranked(CUP8, cup([match({ oppScore: 800, rating: 700, goals: [mine(1)] })]))).toEqual([
      "giant-killer",
    ]);
  });

  it("a gap of 99 is not a giant kill", () => {
    expect(ranked(CUP8, cup([match({ oppScore: 799, rating: 700, goals: [mine(1)] })]))).toEqual(
      [],
    );
  });

  it("a loss or a draw against a giant is not a giant kill", () => {
    const lost = match({ oppScore: 900, rating: 700, goals: [theirs(1)], outcome: "L" });
    const drew = match({ oppScore: 900, rating: 700, outcome: "D" });
    expect(ranked(CUP8, cup([lost, drew]))).toEqual([]);
  });

  it("a flawless ranked run earns First Flawless", () => {
    expect(ranked(CUP8, cup([], { flawless: true, finish: "champion" }))).toEqual([
      "first-flawless",
    ]);
  });

  it("a 151 champion earns 151 champion, and a 151 final loss does not", () => {
    expect(ranked(KANTO, cup([], { mode: "kanto151", finish: "champion" }))).toEqual([
      "kanto-151-champion",
    ]);
    expect(ranked(KANTO, cup([], { mode: "kanto151", finish: "F" }))).toEqual([]);
  });

  it("lists every earn of one run in table order", () => {
    const giant = match({ oppScore: 900, rating: 700, goals: [theirs(3), mine(10), mine(20)] });
    const hatTrick = match({ goals: [mine(10), mine(40), mine(88)] });
    expect(ranked(KANTO, cup([hatTrick, giant], { flawless: true, finish: "champion" }))).toEqual([
      "first-flawless",
      "hat-trick-hero",
      "kanto-151-champion",
      "comeback",
      "giant-killer",
    ]);
  });
});

describe("ranked runs only (catches a builder friendly stacking achievements)", () => {
  it("a builder friendly earns nothing, whatever it did", () => {
    const giant = match({
      oppScore: 900,
      rating: 700,
      goals: [theirs(3), mine(10), mine(20), mine(50)],
    });
    expect(
      ranked(BUILDER, cup([giant], { mode: "builder", flawless: true, finish: "champion" })),
    ).toEqual([]);
  });

  it("a friendly record carrying achievements never reaches the lifetime earns", () => {
    const friendly = record("pd6.friendly", {
      bucket: "builder",
      friendly: true,
      finish: "champion",
      achievements: ["first-flawless", "giant-killer"],
    });
    const totals = countRun(emptyLifetime(), friendly);
    expect(totals.earned).toEqual({});
    expect(totals.formationTitles).toEqual([]);
  });
});

function record(token: string, extra: Partial<RunRecord> = {}): RunRecord {
  return {
    token,
    bucket: "cup8:open",
    friendly: false,
    formation: "4-3-3",
    score: 700,
    wins: 4,
    draws: 1,
    losses: 1,
    finish: "QF",
    flawless: false,
    at: "2026-10-16T12:00:00.000Z",
    ...extra,
  };
}

describe("stored achievements", () => {
  it("toRecord stores the run's achievements", () => {
    const run = toRecord(
      "pd6.giant",
      CUP8,
      cup([match({ oppScore: 900, rating: 700, goals: [mine(1)] })]),
      "2026-10-20T12:00:00.000Z",
    );
    expect(run.achievements).toEqual(["giant-killer"]);
  });

  it("countRun keeps the first earn of each achievement with its run", () => {
    const first = record("pd6.first", {
      at: "2026-10-20T12:00:00.000Z",
      achievements: ["comeback"],
    });
    const second = record("pd6.second", {
      at: "2026-10-21T12:00:00.000Z",
      achievements: ["comeback", "giant-killer"],
    });
    const totals = [first, second].reduce(countRun, emptyLifetime());
    expect(totals.earned).toEqual({
      comeback: { at: "2026-10-20T12:00:00.000Z", token: "pd6.first" },
      "giant-killer": { at: "2026-10-21T12:00:00.000Z", token: "pd6.second" },
    });
  });

  it("collects ranked titles per formation and earns every formation on the eighth", () => {
    const formations = [
      "4-3-3",
      "4-4-2",
      "4-2-3-1",
      "4-1-4-1",
      "3-5-2",
      "3-4-3",
      "3-4-2-1",
    ] as const;
    let totals = formations
      .map((formation, i) =>
        record(`pd6.title-${i}`, {
          formation,
          finish: "champion",
          at: `2026-10-0${i + 1}T12:00:00.000Z`,
        }),
      )
      .reduce(countRun, emptyLifetime());
    totals = countRun(totals, record("pd6.final-four", { formation: "5-3-2", finish: "SF" }));
    expect(totals.formationTitles).toEqual(formations);
    expect(totals.earned["every-formation"]).toBeUndefined();
    totals = countRun(
      totals,
      record("pd6.title-8", {
        formation: "5-3-2",
        finish: "champion",
        at: "2026-10-09T12:00:00.000Z",
      }),
    );
    expect(totals.formationTitles).toEqual([
      "4-3-3",
      "4-4-2",
      "4-2-3-1",
      "4-1-4-1",
      "3-5-2",
      "3-4-3",
      "3-4-2-1",
      "5-3-2",
    ]);
    expect(totals.earned["every-formation"]).toEqual({
      at: "2026-10-09T12:00:00.000Z",
      token: "pd6.title-8",
    });
  });
});

describe("old runs: backfill from stored fields only (catches fabricated earns)", () => {
  it("derives First Flawless, 151 champion and formation titles from a record with no achievements field", () => {
    const flawless = record("pd5.flawless", {
      finish: "champion",
      flawless: true,
      at: "2026-10-10T12:00:00.000Z",
    });
    const kanto = record("pd5.kanto", {
      bucket: "kanto151",
      formation: "4-4-2",
      finish: "champion",
      at: "2026-10-11T12:00:00.000Z",
    });
    const totals = [flawless, kanto].reduce(countRun, emptyLifetime());
    expect(totals.earned).toEqual({
      "first-flawless": { at: "2026-10-10T12:00:00.000Z", token: "pd5.flawless" },
      "kanto-151-champion": { at: "2026-10-11T12:00:00.000Z", token: "pd5.kanto" },
    });
    expect(totals.formationTitles).toEqual(["4-3-3", "4-4-2"]);
  });

  it("never derives Hat-trick hero, Comeback or Giant killer from an old record", () => {
    const old = record("pd5.old", {
      wins: 8,
      draws: 0,
      losses: 0,
      finish: "champion",
      flawless: true,
    });
    expect(Object.keys(countRun(emptyLifetime(), old).earned)).toEqual(["first-flawless"]);
  });

  it("lifetime totals from before achievements gain the earns of the runs still in the history", () => {
    const old = record("pd5.old", {
      finish: "champion",
      flawless: true,
      at: "2026-10-12T12:00:00.000Z",
    });
    const counted = countRun(emptyLifetime(), old);
    const before5h: LifetimeTotals = { ...counted, earned: {}, formationTitles: [] };
    const tiles = lifetimeAchievements(before5h, [old]);
    expect(tiles.find((t) => t.id === "first-flawless")!.earned).toEqual({
      at: "2026-10-12T12:00:00.000Z",
      token: "pd5.old",
    });
    expect(tiles.find((t) => t.id === "every-formation")!.progress).toEqual({ count: 1, of: 8 });
  });
});

describe("lifetimeAchievements grid", () => {
  it("returns six tiles in table order with labels, earns and progress", () => {
    const run = record("pd6.one", {
      finish: "champion",
      at: "2026-10-20T12:00:00.000Z",
      achievements: ["comeback"],
    });
    const tiles = lifetimeAchievements(countRun(emptyLifetime(), run), [run]);
    expect(tiles.map((t) => [t.id, t.label, t.earned?.at ?? null, t.progress])).toEqual([
      ["first-flawless", "First Flawless", null, null],
      ["hat-trick-hero", "Hat-trick hero", null, null],
      ["every-formation", "Champion with every formation", null, { count: 1, of: 8 }],
      ["kanto-151-champion", "151 champion", null, null],
      ["comeback", "Comeback", "2026-10-20T12:00:00.000Z", null],
      ["giant-killer", "Giant killer", null, null],
    ]);
  });

  it("names the ship date once for the achievements old runs cannot prove", () => {
    expect(ACHIEVEMENTS_SINCE).toBe("20 October 2026");
    expect(ACHIEVEMENT_LABEL["giant-killer"]).toBe("Giant killer");
  });
});

describe("mergeLifetime and achievements (catches a restore that moves an earn later)", () => {
  it("keeps the earliest earn of each achievement and the union of formation titles", () => {
    const local = countRun(
      emptyLifetime(),
      record("pd6.local", {
        formation: "4-4-2",
        finish: "champion",
        at: "2026-10-22T12:00:00.000Z",
        achievements: ["comeback", "giant-killer"],
      }),
    );
    const imported = countRun(
      emptyLifetime(),
      record("pd6.imported", {
        formation: "4-3-3",
        finish: "champion",
        at: "2026-10-20T12:00:00.000Z",
        achievements: ["comeback"],
      }),
    );
    const merged = mergeLifetime(local, imported);
    expect(merged.earned).toEqual({
      comeback: { at: "2026-10-20T12:00:00.000Z", token: "pd6.imported" },
      "giant-killer": { at: "2026-10-22T12:00:00.000Z", token: "pd6.local" },
    });
    expect(merged.formationTitles).toEqual(["4-3-3", "4-4-2"]);
    expect(mergeLifetime(merged, imported)).toEqual(merged);
    expect(mergeLifetime(imported, local).earned).toEqual(merged.earned);
  });
});

describe("chipAchievement (the single most notable earn of one run)", () => {
  it("ranks Giant killer, then Comeback, then Hat-trick hero, then 151 champion", () => {
    expect(
      chipAchievement([
        "first-flawless",
        "hat-trick-hero",
        "kanto-151-champion",
        "comeback",
        "giant-killer",
      ]),
    ).toBe("giant-killer");
    expect(chipAchievement(["hat-trick-hero", "comeback"])).toBe("comeback");
    expect(chipAchievement(["kanto-151-champion", "hat-trick-hero"])).toBe("hat-trick-hero");
    expect(chipAchievement(["first-flawless", "kanto-151-champion"])).toBe("kanto-151-champion");
  });

  it("never shows First Flawless as a run's chip, because one run cannot prove it was the first", () => {
    expect(chipAchievement(["first-flawless"])).toBeNull();
    expect(chipAchievement([])).toBeNull();
  });
});
