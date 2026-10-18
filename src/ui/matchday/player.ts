import { advanceClock, nextStop, type Pace, type Stop } from "./clock";
import {
  GOAL_LANDS,
  SHOW,
  stagePitch,
  type Beat,
  type PitchStage,
  type StageInput,
  type Timeline,
} from "./timeline";

/** A stable name for a beat, the same across the replays a coach decision triggers. */
export function beatKey(b: Beat): string {
  switch (b.kind) {
    case "whistle":
      return `whistle:${b.minute}`;
    case "goal":
      return `goal:${b.minute}:${b.side}:${b.scorer.name}`;
    case "save":
      return `save:${b.minute}:${b.side}:${b.keeper.name}:${b.attacker.name}`;
    case "card":
      return `card:${b.minute}:${b.side}:${b.player.slot}:${b.color}`;
    case "injury":
      return `injury:${b.minute}:${b.player.slot}`;
    case "sub":
      return `sub:${b.minute}:${b.slot}:${b.in.name}`;
    case "tactic":
      return `tactic:${b.minute}:${b.side}:${b.tactic}`;
  }
}

// The assistant's own changes at a window boundary land after anything a decision at that minute
// precedes, so they stay hidden while the clock is stopped exactly on their minute.
function assistantBoundary(b: Beat): boolean {
  return (
    (b.kind === "tactic" && b.side === "user" && b.by === "auto") ||
    (b.kind === "sub" && b.by === "auto" && b.reason === "fatigue")
  );
}

export function revealed(b: Beat, clock: number): boolean {
  return b.minute < clock || (b.minute === clock && !assistantBoundary(b));
}

/**
 * Whether a revealed beat counts yet on the scoreboard, the ticker and the goal horn. A staged goal
 * waits for the ball to cross the line, which comes sooner at 2x; a beat that never fired (a skip
 * to full time) counts.
 */
export function landed(
  b: Beat,
  fired: Readonly<Record<string, number>>,
  now: number,
  staged: boolean,
  speed: number,
): boolean {
  if (b.kind !== "goal" || !staged) return true;
  const at = fired[beatKey(b)];
  return at === undefined || now - at >= (GOAL_LANDS * SHOW.goal) / speed;
}

/** A beat on the pitch: 0 to 1 through its staging, and 1 when motion is reduced. */
export interface Active {
  readonly beat: Beat;
  readonly progress: number;
}

type InjuryBeat = Extract<Beat, { kind: "injury" }>;
type SubBeat = Extract<Beat, { kind: "sub" }>;

function replacementFor(timeline: Timeline, injury: InjuryBeat): SubBeat | undefined {
  return timeline.beats.find(
    (b): b is SubBeat =>
      b.kind === "sub" &&
      b.reason === "injury" &&
      b.minute === injury.minute &&
      b.slot === injury.player.slot,
  );
}

function injuryFor(timeline: Timeline, sub: SubBeat): InjuryBeat | undefined {
  return timeline.beats.find(
    (b): b is InjuryBeat =>
      b.kind === "injury" && b.minute === sub.minute && b.player.slot === sub.slot,
  );
}

/**
 * When a beat comes onto the pitch. An injury's replacement waits for the injured player's own
 * staging, so the pitch shows who went down before who comes on.
 */
function startOf(
  timeline: Timeline,
  fired: Readonly<Record<string, number>>,
  b: Beat,
  speed: number,
): number | undefined {
  const at = fired[beatKey(b)];
  if (at === undefined || b.kind !== "sub" || b.reason !== "injury") return at;
  const injury = injuryFor(timeline, b);
  const down = injury === undefined ? undefined : fired[beatKey(injury)];
  return down === undefined ? at : Math.max(at, down + SHOW.injury / speed);
}

/**
 * The latest beat still on the pitch. With reduced motion, the latest beat shown at all. An injury
 * stays on while the clock waits at its minute for the replacement to come on.
 */
export function activeBeat(
  timeline: Timeline,
  fired: Readonly<Record<string, number>>,
  now: number,
  motion: boolean,
  clock: number,
  speed: number,
): Active | null {
  let best: Active | null = null;
  let bestAt = -Infinity;
  for (const beat of timeline.beats) {
    const at = startOf(timeline, fired, beat, speed);
    if (at === undefined) continue;
    if (!motion) {
      if (beat.kind !== "whistle" || best === null) best = { beat, progress: 1 };
      continue;
    }
    const age = now - at;
    const show = SHOW[beat.kind] / speed;
    const replacement = beat.kind === "injury" ? replacementFor(timeline, beat) : undefined;
    const waiting =
      replacement !== undefined &&
      beat.minute === clock &&
      fired[beatKey(replacement)] === undefined;
    if (age < 0 || (age > show && !waiting)) continue;
    if (at >= bestAt) {
      bestAt = at;
      best = { beat, progress: Math.min(1, age / show) };
    }
  }
  return best;
}

/** What the broadcast knows at one rendered frame. */
export interface FrameView {
  readonly clock: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly now: number;
  readonly kicks: number;
  readonly motion: boolean;
  readonly speed: number;
  readonly userSlots: StageInput["userSlots"];
  readonly oppSlots: StageInput["oppSlots"];
  readonly oppLabels?: readonly string[];
}

/** The beat on the pitch and the staged pitch for one frame, as the broadcast draws it. */
export function stageFrame(
  timeline: Timeline,
  view: FrameView,
): { readonly active: Active | null; readonly stage: PitchStage } {
  const active = activeBeat(timeline, view.fired, view.now, view.motion, view.clock, view.speed);
  const stage = stagePitch(timeline, {
    clock: view.clock,
    active,
    kicks: view.kicks,
    motion: view.motion,
    userSlots: view.userSlots,
    oppSlots: view.oppSlots,
    oppLabels: view.oppLabels,
  });
  return { active, stage };
}

export type Stage = "play" | "pens" | "done";

export interface PlayState {
  readonly minute: number;
  readonly stage: Stage;
  /** The player's own pause. */
  readonly running: boolean;
  readonly speed: 1 | 2;
  /** A manager stop the player has to answer before the clock moves. */
  readonly stop: Stop | null;
  readonly answered: readonly string[];
  /** The beat the clock is holding on while the broadcast stages it. */
  readonly hold: { readonly key: string; readonly until: number } | null;
  readonly held: readonly string[];
  /** Real time each beat was first shown, which drives its on-pitch effect. */
  readonly fired: Readonly<Record<string, number>>;
  readonly kicks: number;
  readonly kickAt: number;
}

export interface PlayEnv {
  readonly timeline: Timeline;
  readonly stops: readonly Stop[];
  readonly pace: Pace;
}

export const START: PlayState = {
  minute: 0,
  stage: "play",
  running: false,
  speed: 1,
  stop: null,
  answered: [],
  hold: null,
  held: [],
  fired: {},
  kicks: 0,
  kickAt: 0,
};

export type PlayAction =
  | { readonly type: "tick"; readonly now: number; readonly dt: number; readonly env: PlayEnv }
  | { readonly type: "toggle" }
  | { readonly type: "speed" }
  | { readonly type: "answer"; readonly key: string }
  | { readonly type: "skip"; readonly env: PlayEnv };

function holdFor(b: Beat, pace: Pace): number {
  if (b.kind === "goal") return pace.holdGoal;
  if (b.kind === "save") return pace.holdSave;
  return 0;
}

// An injury's replacement stays off the pitch until the manager answers that injury's stop.
function awaitingAnswer(b: Beat, state: PlayState, env: PlayEnv): boolean {
  if (b.kind !== "sub" || b.reason !== "injury") return false;
  const key = `injury:${b.minute}:${b.slot}`;
  return env.stops.some((s) => s.key === key) && !state.answered.includes(key);
}

function fire(state: PlayState, env: PlayEnv, clock: number, now: number): PlayState["fired"] {
  let fired = state.fired;
  for (const b of env.timeline.beats) {
    if (b.minute > clock) break;
    const key = beatKey(b);
    if (fired[key] === undefined && revealed(b, clock) && !awaitingAnswer(b, state, env)) {
      fired = { ...fired, [key]: now };
    }
  }
  return fired;
}

function tick(state: PlayState, env: PlayEnv, now: number, dt: number): PlayState {
  if (state.stage === "done" || !state.running || state.stop !== null) return state;
  if (state.hold !== null) {
    if (now < state.hold.until) return state;
    state = { ...state, hold: null };
  }
  const { timeline, pace } = env;
  if (state.stage === "pens") {
    if (now - state.kickAt < pace.kick / state.speed) return state;
    const kicks = state.kicks + 1;
    return {
      ...state,
      kicks,
      kickAt: now,
      stage: kicks >= timeline.kicks.length ? "done" : "pens",
    };
  }

  const stop = nextStop(env.stops, new Set(state.answered), state.minute);
  if (stop !== null && stop.minute <= state.minute) {
    return { ...state, stop, fired: fire(state, env, state.minute, now) };
  }
  const holdBeat = timeline.beats.find(
    (b) => b.minute >= state.minute && holdFor(b, pace) > 0 && !state.held.includes(beatKey(b)),
  );
  const limit = Math.min(
    stop?.minute ?? Infinity,
    holdBeat?.minute ?? Infinity,
    timeline.finalMinute,
  );
  const minute = advanceClock(state.minute, dt, pace, state.speed, limit);
  let next: PlayState = { ...state, minute, fired: fire(state, env, minute, now) };
  if (holdBeat !== undefined && minute >= holdBeat.minute) {
    const key = beatKey(holdBeat);
    next = {
      ...next,
      hold: { key, until: now + holdFor(holdBeat, pace) / state.speed },
      held: [...next.held, key],
    };
  }
  if (stop !== null && minute >= stop.minute) next = { ...next, stop };
  if (minute >= timeline.finalMinute && next.stop === null) {
    next =
      timeline.kicks.length > 0
        ? { ...next, stage: "pens", kickAt: now }
        : { ...next, stage: "done" };
  }
  return next;
}

export function play(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case "tick":
      return tick(state, action.env, action.now, action.dt);
    case "toggle":
      return { ...state, running: !state.running };
    case "speed":
      return { ...state, speed: state.speed === 1 ? 2 : 1 };
    case "answer":
      return {
        ...state,
        stop: null,
        running: true,
        answered: state.answered.includes(action.key)
          ? state.answered
          : [...state.answered, action.key],
      };
    case "skip": {
      const { timeline, stops } = action.env;
      return {
        ...state,
        minute: timeline.finalMinute,
        stage: "done",
        stop: null,
        hold: null,
        kicks: timeline.kicks.length,
        answered: [...new Set([...state.answered, ...stops.map((s) => s.key)])],
      };
    }
  }
}

/** The match minute a touchline decision is recorded at, given where the clock stands. */
export function decisionMinute(timeline: Timeline, clock: number): number {
  const floor = Math.floor(clock);
  if (floor === clock) return floor;
  // The assistant's boundary changes at `floor` are already on screen; a decision at `floor`
  // would erase them, so it lands at the next minute, which nobody has seen yet.
  const shown = timeline.beats.some((b) => b.minute === floor && assistantBoundary(b));
  return shown ? floor + 1 : floor;
}
