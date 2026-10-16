import { advanceClock, nextStop, type Pace, type Stop } from "./clock";
import type { Beat, Timeline } from "./timeline";

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

function fire(state: PlayState, env: PlayEnv, clock: number, now: number): PlayState["fired"] {
  let fired = state.fired;
  for (const b of env.timeline.beats) {
    if (b.minute > clock) break;
    const key = beatKey(b);
    if (fired[key] === undefined && revealed(b, clock)) fired = { ...fired, [key]: now };
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
