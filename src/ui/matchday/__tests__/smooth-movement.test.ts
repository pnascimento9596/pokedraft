import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import type { MatchResult, Side } from "@/engine/types";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { PACE } from "../clock";
import {
  START,
  beatKey,
  play,
  stageFrame,
  type FrameView,
  type PlayEnv,
  type PlayState,
} from "../player";
import { buildTimeline, type PitchStage, type Point, type Timeline } from "../timeline";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

// The golden cup8 draft under engine 6. Match 1: the assistant takes Togepi off for Kommo-o in
// slot 7 at 60'. Match 5: Ludicolo is sent off from slot 2 at 6'.
const { draft, cup } = replay(`pd8.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
const STEP = 1000 / 60;
const TAIL_FRAMES = 180;
const FIRED_AT = 10_000;

function matchAt(index: number): PlayedMatch {
  const m = cup.matches[index];
  if (m?.status !== "played") throw new Error(`match ${index} was not played`);
  return m;
}

function timelineAt(index: number): Timeline {
  return buildTimeline(matchAt(index), { matchIndex: index, seed: cup.seed, lineup: LINEUP });
}

function viewFor(
  index: number,
  at: Pick<FrameView, "clock" | "fired" | "now"> & Partial<Pick<FrameView, "speed" | "motion">>,
): FrameView {
  const match = matchAt(index);
  return {
    kicks: 0,
    motion: true,
    speed: 1,
    ...at,
    userSlots: LINEUP.formation,
    oppSlots: match.opponent.formation ?? "4-3-3",
    oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
  };
}

function openPlay(timeline: Timeline, index: number, clock: number): PitchStage {
  return stageFrame(timeline, viewFor(index, { clock, fired: {}, now: 0 })).stage;
}

function pointOf(stage: PitchStage, side: Side, slot: number): Point {
  const p = stage.players[side][slot];
  if (p == null) throw new Error(`nobody in ${side} slot ${slot}`);
  return p.point;
}

/** Distance in percent of the pitch length: the pitch is drawn 100 long by 64 wide. */
function lengthwise(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
}

/** Every same-side pair standing closer than 4% of the pitch length, with their distance. */
function crowded(stage: PitchStage): string[] {
  const out: string[] = [];
  for (const side of ["user", "opp"] as const) {
    const players = stage.players[side];
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];
        if (!a || !b) continue;
        const d = lengthwise(a.point, b.point);
        if (d < 4 - 1e-9) out.push(`${side} ${i}-${j} ${d.toFixed(2)}`);
      }
    }
  }
  return out;
}

/** The largest move of any one player between two 60 Hz frames, kickoff to full time at 1x. */
function maxPlayerStep(index: number): number {
  const timeline = timelineAt(index);
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true };
  let now = 0;
  let tail = 0;
  let max = 0;
  let prev = new Map<string, Point>();
  while (tail < TAIL_FRAMES) {
    now += STEP;
    state = play(state, { type: "tick", now, dt: STEP, env });
    if (state.stage === "pens") break;
    if (state.stage === "done") tail++;
    const { stage } = stageFrame(
      timeline,
      viewFor(index, { clock: state.minute, fired: state.fired, now }),
    );
    const next = new Map<string, Point>();
    const everyone = [...stage.players.user, ...stage.players.opp, ...(stage.leaving ?? [])];
    for (const p of everyone) {
      if (p == null) continue;
      const key = `${p.side}:${p.slot}:${p.species ?? p.name}`;
      const before = prev.get(key);
      if (before !== undefined) max = Math.max(max, lengthwise(before, p.point));
      next.set(key, p.point);
    }
    prev = next;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return max;
}

describe("smooth movement (catches players stopping dead at every phase, stacking on teammates and vanishing when they leave)", () => {
  it("carries a player's speed through a phase boundary on a Catmull-Rom spline (catches a stop-and-go at every waypoint)", () => {
    const timeline = timelineAt(0);
    const e = 1e-4;
    const before = pointOf(openPlay(timeline, 0, 10 - e), "user", 9);
    const at = pointOf(openPlay(timeline, 0, 10), "user", 9);
    const after = pointOf(openPlay(timeline, 0, 10 + e), "user", 9);
    expect(at.x).toBeCloseTo(49.89, 2);
    expect(at.y).toBeCloseTo(86.72, 2);
    expect(before.x).toBeCloseTo(49.89, 2);
    expect(after.x).toBeCloseTo(49.89, 2);
    const left = { x: (at.x - before.x) / e, y: (at.y - before.y) / e };
    const right = { x: (after.x - at.x) / e, y: (after.y - at.y) / e };
    expect(left.x).toBeCloseTo(-16.87, 1);
    expect(left.y).toBeCloseTo(1.24, 1);
    expect(right.x).toBeCloseTo(-16.87, 1);
    expect(right.y).toBeCloseTo(1.24, 1);
  });

  it("faces and poses a player by how they move now, not where they started the phase (catches a player running left while facing right)", () => {
    const timeline = timelineAt(0);
    const now = openPlay(timeline, 0, 14.75);
    const p = now.players.user[10]!;
    expect({ facing: p.facing, pose: p.pose }).toEqual({ facing: "left", pose: "sprint" });
    const phaseStart = pointOf(openPlay(timeline, 0, 13.75), "user", 10);
    const moment = pointOf(openPlay(timeline, 0, 14.73), "user", 10);
    expect(p.point.x - phaseStart.x).toBeGreaterThan(2);
    expect(p.point.x).toBeLessThan(moment.x);
  });

  it("parts teammates who stand within 4% of each other, the same way every time (catches sprites stacked on one spot)", () => {
    const timeline = timelineAt(0);
    const stage = openPlay(timeline, 0, 38.11);
    expect(crowded(stage)).toEqual([]);
    expect(openPlay(timeline, 0, 38.11)).toEqual(stage);
  });

  it("parts the kickoff shape too, where two central players used to share one spot (catches a stacked kickoff after a goal)", () => {
    const timeline = timelineAt(1);
    expect(timeline.beats.some((b) => b.kind === "goal" && b.minute === 7)).toBe(true);
    expect(crowded(openPlay(timeline, 1, 7.2))).toEqual([]);
  });

  it("leaves a sub the clock skipped past in their slot, not waiting on the touchline (catches substitutes stranded at the bench after Skip)", () => {
    const timeline = timelineAt(1);
    const stage = stageFrame(timeline, viewFor(1, { clock: 90, fired: {}, now: 0 })).stage;
    expect(stage.leaving ?? []).toEqual([]);
    expect(stage.players.user[7]?.species).toBe(784);
    expect(stage.players.user[7]?.point).not.toEqual({ x: 50, y: 94 });
    expect(stage.players.user[4]?.point).not.toEqual({ x: 50, y: 94 });
  });

  it("walks a red-carded player to the touchline over 1,800 ms at 1x and 900 ms at 2x (catches the player vanishing on the frame of the card)", () => {
    const timeline = timelineAt(5);
    const card = timeline.beats.find((b) => b.kind === "card" && b.color === "red")!;
    const fired = { [beatKey(card)]: FIRED_AT };
    const leaving = (after: number, speed = 1) =>
      (
        stageFrame(timeline, viewFor(5, { clock: 6.01, fired, now: FIRED_AT + after, speed })).stage
          .leaving ?? []
      ).map((p) => ({ side: p.side, slot: p.slot, species: p.species, y: +p.point.y.toFixed(2) }));
    expect(leaving(0)).toEqual([{ side: "user", slot: 2, species: 272, y: 30.55 }]);
    expect(leaving(900)).toEqual([{ side: "user", slot: 2, species: 272, y: 15.28 }]);
    expect(leaving(1_799)).toEqual([{ side: "user", slot: 2, species: 272, y: 0 }]);
    expect(leaving(1_800)).toEqual([]);
    expect(leaving(899, 2)).toEqual([{ side: "user", slot: 2, species: 272, y: 0 }]);
    expect(leaving(900, 2)).toEqual([]);
  });

  it("walks a red-carded player straight off from where the card found them while the clock runs on (catches the walker drifting 7% sideways with play they left)", () => {
    const timeline = timelineAt(5);
    const card = timeline.beats.find((b) => b.kind === "card" && b.color === "red")!;
    const fired = { [beatKey(card)]: FIRED_AT };
    const walker = (after: number) => {
      const clock = 6 + after / PACE.live.regulation;
      const stage = stageFrame(timeline, viewFor(5, { clock, fired, now: FIRED_AT + after })).stage;
      return (stage.leaving ?? []).map((p) => ({
        x: +p.point.x.toFixed(2),
        y: +p.point.y.toFixed(2),
      }));
    };
    expect(walker(0)).toEqual([{ x: 17.2, y: 30.55 }]);
    expect(walker(300)).toEqual([{ x: 17.2, y: 28.29 }]);
    expect(walker(900)).toEqual([{ x: 17.2, y: 15.28 }]);
    expect(walker(1_500)).toEqual([{ x: 17.2, y: 2.26 }]);
  });

  it("walks a substituted player off while the substitute walks on (catches the player going off vanishing at the sub beat)", () => {
    const timeline = timelineAt(1);
    const sub = timeline.beats.find((b) => b.kind === "sub" && b.minute === 60)!;
    const fired = { [beatKey(sub)]: FIRED_AT };
    const at = (after: number, speed = 1) =>
      stageFrame(timeline, viewFor(1, { clock: 60.01, fired, now: FIRED_AT + after, speed })).stage;
    const leaving = (stage: PitchStage) =>
      (stage.leaving ?? []).map((p) => ({
        slot: p.slot,
        species: p.species,
        y: +p.point.y.toFixed(2),
      }));
    const midway = at(900);
    expect(leaving(midway)).toEqual([{ slot: 7, species: 175, y: 8.62 }]);
    expect(midway.players.user[7]?.species).toBe(784);
    expect(+midway.players.user[7]!.point.y.toFixed(2)).toBe(55.63);
    expect(leaving(at(1_800))).toEqual([]);
    expect(leaving(at(899, 2))).toEqual([{ slot: 7, species: 175, y: 0 }]);
    expect(leaving(at(900, 2))).toEqual([]);
  });

  it("keeps Quick and reduced motion still: nobody walks and everyone stands on their slot (decision 1)", () => {
    const timeline = timelineAt(5);
    const card = timeline.beats.find((b) => b.kind === "card" && b.color === "red")!;
    const fired = { [beatKey(card)]: FIRED_AT };
    const still = stageFrame(
      timeline,
      viewFor(5, { clock: 6.01, fired, now: FIRED_AT + 900, motion: false }),
    ).stage;
    expect(still.leaving ?? []).toEqual([]);
    expect(still.players.user[2]).toBeNull();
    expect(pointOf(still, "user", 9)).toEqual({ x: 60.76, y: 82 });
    const again = stageFrame(
      timeline,
      viewFor(5, { clock: 6.5, fired, now: FIRED_AT + 1_200, motion: false }),
    ).stage;
    expect(again.players).toEqual(still.players);
  });

  it("never moves a player 6% of the pitch length or more in one 60 Hz frame at 1x, in any match of the golden cup (catches 35.1% before)", () => {
    const played = cup.matches.flatMap((m, i) => (m.status === "played" ? [i] : []));
    expect(played).toEqual([0, 1, 2, 3, 4, 5]);
    const steps = played.map((i) => ({ match: i, over: maxPlayerStep(i) >= 6 }));
    expect(steps.filter((s) => s.over)).toEqual([]);
  });
});
