// The largest on-screen move of the ball between two 60 Hz frames, in Full and in Follow, over the
// six played matches of the golden cup8 run at live pace and 1x.
//
//   pnpm exec tsx scripts/perf/camera-motion.mts
//
// The play reducer and stageFrame stage each frame as Broadcast does, and the pure follow camera
// steps on the same frames. A move is hypot(dx, dy * 0.64) in percent of the view's width, the
// metric of the 4% stage bound in src/ui/matchday/__tests__/motion-bounds.test.ts. The shootout
// is excluded, as it is there; the camera shows the full pitch through it.
import { toFullLineup } from "../../src/engine/draft";
import { replay } from "../../src/engine/replay";
import { GOLDEN_CUP8_V5 } from "../../src/engine/versions/__tests__/fixtures";
import { PACE } from "../../src/ui/matchday/clock";
import {
  cameraAt,
  framesWhole,
  projectPoint,
  stepCamera,
  zoomOf,
  type Camera,
} from "../../src/ui/matchday/camera";
import {
  START,
  play,
  stageFrame,
  type PlayEnv,
  type PlayState,
} from "../../src/ui/matchday/player";
import { buildTimeline, type Point } from "../../src/ui/matchday/timeline";

const { draft, cup } = replay(`pd6.${GOLDEN_CUP8_V5.slice("pd5.".length)}`);
const LINEUP = toFullLineup(draft);
const STEP = 1000 / 60;
const TAIL_FRAMES = 180;

const moved = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.64);
const round = (n: number) => Math.round(n * 100) / 100;

interface Worst {
  move: number;
  minute: number;
  zoom: number;
}

function measure(index: number) {
  const match = cup.matches[index];
  if (match?.status !== "played") throw new Error(`match ${index} was not played`);
  const timeline = buildTimeline(match, { matchIndex: index, seed: cup.seed, lineup: LINEUP });
  const env: PlayEnv = { timeline, stops: [], pace: PACE.live };
  let state: PlayState = { ...START, running: true, speed: 1 };
  let now = 0;
  let tail = 0;
  let cam: Camera | null = null;
  let lastFull: Point | null = null;
  let lastFollow: Point | null = null;
  const full: Worst = { move: 0, minute: 0, zoom: 1 };
  const follow: Worst = { move: 0, minute: 0, zoom: 1 };
  let frames = 0;
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
      speed: 1,
      userSlots: LINEUP.formation,
      oppSlots: match.opponent.formation ?? "4-3-3",
      oppLabels: match.opponent.roster.map((r) => (r.kind === "species" ? "" : `No. ${r.number}`)),
      windows: match.windows,
    });
    const ball = { x: stage.ball.x, y: stage.ball.y };
    const wide = framesWhole(timeline, state.minute, active, shot);
    cam = cam === null ? cameraAt(ball, wide) : stepCamera(cam, ball, wide, STEP);
    const onScreen = projectPoint(cam, ball);
    if (lastFull !== null && lastFollow !== null) {
      const a = moved(lastFull, ball);
      if (a > full.move) Object.assign(full, { move: a, minute: state.minute, zoom: 1 });
      const b = moved(lastFollow, onScreen);
      if (b > follow.move)
        Object.assign(follow, { move: b, minute: state.minute, zoom: zoomOf(cam) });
    }
    lastFull = ball;
    lastFollow = onScreen;
    frames++;
    if (now > 400_000) throw new Error("the match never reached the final whistle");
  }
  return { frames, full, follow };
}

const rows = [0, 1, 2, 3, 4, 5].map((i) => {
  const { frames, full, follow } = measure(i);
  return {
    match: i,
    frames,
    full: round(full.move),
    fullMinute: round(full.minute),
    follow: round(follow.move),
    followMinute: round(follow.minute),
    followZoom: round(follow.zoom),
  };
});
for (const r of rows) console.log(JSON.stringify(r));
console.log(
  JSON.stringify({
    worstFull: Math.max(...rows.map((r) => r.full)),
    worstFollow: Math.max(...rows.map((r) => r.follow)),
  }),
);
