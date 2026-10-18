import { describe, expect, it } from "vitest";
import type { FullLineup, MatchResult, Opponent, PenKick, SpeciesId } from "@/engine/types";
import { buildTimeline, stagePitch, type Point, type StagedPlayer } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;
const id = (n: number) => n as SpeciesId;
const XI = [9, 1, 4, 7, 10, 13, 16, 19, 25, 6, 3].map(id);
const LINEUP = {
  formation: "4-3-3",
  starters: XI,
  bench: [130, 131, 132, 133, 134].map(id),
} as unknown as FullLineup;
const ROSTER = [143, 150, 151, 144, 145, 146, 147, 148, 149, 142, 141].map((n) => ({
  kind: "species" as const,
  id: id(n),
}));
const OPPONENT = {
  id: "o",
  name: "Opp",
  score: 500,
  lines: { GK: 1, DEF: 1, MID: 1, ATT: 1 },
  roster: ROSTER,
} as unknown as Opponent;

const u = (n: number, scored: boolean): PenKick => ({ side: "user", taker: id(n), scored });
const o = (n: number, scored: boolean): PenKick => ({
  side: "opp",
  taker: { kind: "species", id: id(n) },
  scored,
});

// Level 4-4 after ten kicks, so kicks 11 and 12 are sudden death; the opponent wins 5-4.
// User takers stand in slots 9, 8, 7, 6, 5, 4; opponent takers in slots 8, 9, 7, 6, 5, 4.
const KICKS: readonly PenKick[] = [
  u(6, true),
  o(149, false),
  u(25, true),
  o(142, true),
  u(19, true),
  o(148, true),
  u(16, false),
  o(147, true),
  u(13, true),
  o(146, true),
  u(10, false),
  o(145, true),
];

const MATCH: PlayedMatch = {
  status: "played",
  round: "F",
  opponent: OPPONENT,
  regulation: { user: 0, opp: 0 },
  extraTime: { user: 0, opp: 0 },
  shootout: {
    user: 4,
    opp: 5,
    keeper: id(9),
    kicks: KICKS,
    decider: "kicks",
    coinWinner: null,
  },
  outcome: "L",
  goals: [],
  saves: [],
  incidents: [],
  windows: Array.from({ length: 18 }, (_, w) => ({
    minute: (w + 1) * 5,
    score: { user: 0, opp: 0 },
    tactic: { user: "balanced" as const, opp: "balanced" as const },
    energy: XI.map(() => 90),
    onPitch: XI,
  })),
  absences: [],
  rating: 500,
  recap: [],
};

const T = buildTimeline(MATCH, { matchIndex: 0, seed: "pens", lineup: LINEUP });

function at(kicks: number, kickProgress: number, motion = true) {
  return stagePitch(T, {
    clock: 120,
    active: null,
    kicks,
    kickProgress,
    motion,
    userSlots: "4-3-3",
    oppSlots: "4-3-3",
  });
}

const pointOf = (p: StagedPlayer | null | undefined): Point => p!.point;
const ballOf = (s: ReturnType<typeof at>): Point => ({ x: s.ball.x, y: s.ball.y });

describe("shootout run-up (catches a taker who teleports onto the spot and a ball that leaves early)", () => {
  it("at kickProgress 0.2 the taker is mid run-up and the ball still sits on the spot", () => {
    const s = at(0, 0.2);
    const taker = s.players.user[9]!;
    expect(taker.pose).toBe("run");
    expect(taker.point.x).toBeCloseTo(86.245, 2);
    expect(taker.point.y).toBeCloseTo(53.542, 2);
    expect(ballOf(s)).toEqual({ x: 89, y: 50 });
    expect(s.ball.loft).toBe(0);
    expect(s.trail).toBeNull();
  });
});

describe("shootout flight (catches a ball that jump-cuts from the spot into the net)", () => {
  it("at kickProgress 0.5 the ball is in the air between the spot and the goal, trailing from the spot", () => {
    const s = at(0, 0.5);
    expect(s.ball.x).toBeCloseTo(95, 5);
    expect(s.ball.y).toBeCloseTo(53, 5);
    expect(s.ball.loft).toBeGreaterThan(0);
    expect(s.trail?.kind).toBe("shot");
    expect(s.trail?.from).toEqual({ x: 89, y: 50 });
    expect(s.trail?.to.x).toBeCloseTo(95, 5);
    expect(s.players.user[9]!.pose).toBe("cast");
  });
});

describe("shootout keeper (catches a keeper who dives toward the ball on goals and away from it on saves)", () => {
  it("on a saved kick the keeper dives to the side the ball goes and meets it", () => {
    const s = at(1, 0.6);
    const keeper = s.players.user[0]!;
    expect(keeper.pose).toBe("dive");
    expect(keeper.point).toEqual({ x: 3, y: 43 });
    expect(ballOf(s)).toEqual({ x: 3, y: 45 });
    const after = at(1, 1);
    expect(pointOf(after.players.user[0])).toEqual({ x: 3, y: 43 });
    expect(ballOf(after)).toEqual({ x: 9, y: 28 });
    expect(Math.sign(after.ball.y - 50)).toBe(Math.sign(pointOf(after.players.user[0]).y - 50));
  });

  it("on a scored kick the keeper goes the wrong way", () => {
    const s = at(0, 0.6);
    expect(pointOf(s.players.opp[0])).toEqual({ x: 97, y: 43 });
    expect(ballOf(s)).toEqual({ x: 99, y: 55 });
  });

  it("or guesses right but goes too late, still on the line when the ball is in", () => {
    const landed = at(3, 0.6);
    expect(ballOf(landed)).toEqual({ x: 1, y: 55 });
    expect(landed.players.user[0]!.pose).toBe("idle");
    expect(pointOf(landed.players.user[0])).toEqual({ x: 3, y: 50 });
    const late = at(3, 1);
    expect(late.players.user[0]!.pose).toBe("dive");
    expect(pointOf(late.players.user[0])).toEqual({ x: 3, y: 57 });
  });

  it("holds the last kick's reaction once the shootout is over", () => {
    const s = at(12, 0);
    expect(ballOf(s)).toEqual({ x: 1, y: 55 });
    expect(pointOf(s.players.opp[4])).toEqual({ x: 11, y: 50 });
    expect(s.players.opp[4]!.pose).toBe("celebrate");
  });
});

describe("shootout line-up (catches waiting players stacked in a column with overlapping sprites)", () => {
  it("spreads the waiting players along an arc, at least 5 pitch units apart", () => {
    const s = at(0, 0.2);
    const waiting = [
      ...s.players.user.filter((p) => p !== null && p.slot !== 0 && p.slot !== 9),
      ...s.players.opp.filter((p) => p !== null && p.slot !== 0),
    ].map(pointOf);
    expect(waiting).toHaveLength(19);
    let closest = Infinity;
    for (let i = 0; i < waiting.length; i++) {
      for (let j = i + 1; j < waiting.length; j++) {
        const a = waiting[i]!;
        const b = waiting[j]!;
        closest = Math.min(closest, Math.hypot(a.x - b.x, (a.y - b.y) * 0.64));
      }
    }
    expect(closest).toBeGreaterThanOrEqual(5);
  });
});

describe("shootout without motion (catches Quick or reduced motion animating the kick)", () => {
  it("keeps the pitch still mid kick: ball on the centre spot, no trail, nobody moving", () => {
    const s = at(1, 0.5, false);
    expect(ballOf(s)).toEqual({ x: 50, y: 50 });
    expect(s.trail).toBeNull();
    const poses = [...s.players.user, ...s.players.opp].map((p) => p?.pose);
    expect(new Set(poses)).toEqual(new Set(["idle"]));
  });
});
