import { describe, expect, it } from "vitest";
import { toFullLineup } from "@/engine/draft";
import { replay } from "@/engine/replay";
import { GOLDEN_CUP8_V5 } from "@/engine/versions/__tests__/fixtures";
import { cameraAt, framesWhole, projectPoint, stepCamera, zoomOf, type Camera } from "../camera";
import { PACE } from "../clock";
import { START, play, stageFrame, type PlayEnv, type PlayState } from "../player";
import { buildTimeline, type Point } from "../timeline";

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
const STEP = 1000 / 60;
const TAIL_FRAMES = 180;

const moved = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);

/**
 * The largest on-screen move of the ball in one 60 Hz frame under the follow camera, divided by
 * that frame's zoom, over one golden match at live pace and `speed`. The motion-bounds test holds
 * the ball itself to 4% of the pitch a frame at 1x, so a camera that only magnifies stays under 4%.
 */
function worstPerZoom(index: number, speed: 1 | 2): number {
  const match = cup.matches[index];
  if (match?.status !== "played") throw new Error(`match ${index} was not played`);
  const timeline = buildTimeline(match, { matchIndex: index, seed: cup.seed, lineup: LINEUP });
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true, speed };
  let now = 0;
  let tail = 0;
  let cam: Camera | null = null;
  let last: Point | null = null;
  let worst = 0;
  while (tail < TAIL_FRAMES) {
    now += STEP;
    state = play(state, { type: "tick", now, dt: STEP, env });
    if (state.stage === "pens") break;
    if (state.stage === "done") tail++;
    const { active, shot, stage } = stageFrame(timeline, {
      clock: state.minute,
      fired: state.fired,
      now,
      kicks: 0,
      motion: true,
      speed,
      userSlots: LINEUP.formation,
      oppSlots: match.opponent.formation ?? "4-3-3",
      oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
      windows: match.windows,
    });
    const ball = { x: stage.ball.x, y: stage.ball.y };
    const wide = framesWhole(timeline, state.minute, active, shot);
    cam = cam === null ? cameraAt(ball, wide) : stepCamera(cam, ball, wide, STEP);
    const onScreen = projectPoint(cam, ball);
    if (last !== null) worst = Math.max(worst, moved(last, onScreen) / zoomOf(cam));
    last = onScreen;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return worst;
}

const PLAYED = [0, 1, 2, 3, 4, 5];

describe("follow camera on-screen ball step <= 4% x zoom (regression guard, no RED: catches a camera pan that adds motion beyond the zoom's magnification)", () => {
  it("at 1x no frame of the golden cup moves the ball 4% x zoom of the view or more", () => {
    const worst = PLAYED.map((i) => worstPerZoom(i, 1));
    expect(worst.flatMap((w, i) => (w >= 4 ? [{ match: i, worst: w }] : []))).toEqual([]);
    // Every golden match carries the ball over 2.8% a frame, so a run that staged no play fails.
    expect(Math.min(...worst)).toBeGreaterThan(2.8);
  });

  it("at 2x no frame of the golden cup moves the ball 4% x zoom x 2 of the view or more", () => {
    const worst = PLAYED.map((i) => worstPerZoom(i, 2));
    expect(worst.flatMap((w, i) => (w >= 8 ? [{ match: i, worst: w }] : []))).toEqual([]);
    // Over 4% shows the run really played at twice the speed.
    expect(Math.min(...worst)).toBeGreaterThan(4);
  });
});
