import { advanceClock, nextStop, type Pace, type Stop } from "./clock";
import {
  GOAL_LANDS,
  SETTLE,
  SHOW,
  WALK,
  stagePitch,
  type Beat,
  type PitchRef,
  type PitchStage,
  type Shot,
  type ShotBeat,
  type StageInput,
  type Timeline,
  type Walk,
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

/**
 * The goal or save the ball is acting out or settling back from. It holds the ball for its whole
 * staging, whatever banner comes up meanwhile, and for as long as the clock stays on its minute; a
 * goal and a save fired together stage the goal.
 */
export function shotOnPitch(
  timeline: Timeline,
  fired: Readonly<Record<string, number>>,
  now: number,
  speed: number,
  clock: number,
): Shot | null {
  const latest = (until: number): { beat: ShotBeat; at: number } | null => {
    let best: { beat: ShotBeat; at: number } | null = null;
    for (const beat of timeline.beats) {
      if (beat.kind !== "goal" && beat.kind !== "save") continue;
      const at = fired[beatKey(beat)];
      if (at === undefined || at > until) continue;
      if (
        best === null ||
        at > best.at ||
        (at === best.at && beat.kind === "goal" && best.beat.kind !== "goal")
      ) {
        best = { beat, at };
      }
    }
    return best;
  };
  const onPitch = (s: { beat: ShotBeat; at: number } | null, t: number) =>
    s !== null && (t - s.at) * speed <= SHOW[s.beat.kind] + SETTLE[s.beat.kind];
  const shot = latest(now);
  if (shot === null || (!onPitch(shot, now) && clock > shot.beat.minute)) return null;
  // A shot that fired while an earlier one was still on the pitch takes the ball from it.
  let earlier: { beat: ShotBeat; at: number } | null = null;
  for (const beat of timeline.beats) {
    if (beat === shot.beat || (beat.kind !== "goal" && beat.kind !== "save")) continue;
    const at = fired[beatKey(beat)];
    if (at === undefined || at >= shot.at) continue;
    if (earlier === null || at > earlier.at) earlier = { beat, at };
  }
  const before =
    earlier !== null && onPitch(earlier, shot.at)
      ? { beat: earlier.beat, age: (shot.at - earlier.at) * speed }
      : null;
  return { beat: shot.beat, age: (now - shot.at) * speed, before };
}

/**
 * Everyone walking on or off at `now`: a red-carded player to the touchline, and both sides of a
 * substitution, each over `WALK` at 1x from when their beat comes onto the pitch.
 */
export function walksAt(
  timeline: Timeline,
  fired: Readonly<Record<string, number>>,
  now: number,
  speed: number,
  clock: number,
): Walk[] {
  const walks: Walk[] = [];
  for (const b of timeline.beats) {
    if (b.minute > clock) break;
    if (b.kind !== "sub" && !(b.kind === "card" && b.color === "red")) continue;
    const at = startOf(timeline, fired, b, speed);
    if (at === undefined) {
      // While the clock stands exactly on the minute of the assistant's sub, the lineup has it but
      // its board is not up yet: the substitute waits on the touchline and the player going off
      // stays put. A sub skipped past never walks.
      if (b.kind === "sub" && b.reason !== "injury" && b.minute === clock) {
        walks.push({ ...walker(b.in, b.slot), dir: "on", minute: b.minute, progress: 0 });
        walks.push({ ...walker(b.out, b.slot), dir: "off", minute: b.minute, progress: 0 });
      }
      continue;
    }
    const progress = Math.max(0, ((now - at) * speed) / WALK);
    if (progress >= 1) continue;
    if (b.kind === "card") {
      if (b.player.slot === null) continue;
      const { side, slot, species, name } = b.player;
      walks.push({ side, slot, species, name, dir: "off", minute: b.minute, progress });
      continue;
    }
    walks.push({ ...walker(b.in, b.slot), dir: "on", minute: b.minute, progress });
    if (now >= at) {
      walks.push({ ...walker(b.out, b.slot), dir: "off", minute: b.minute, progress });
    }
  }
  return walks;
}

function walker(ref: PitchRef, slot: number): Pick<Walk, "side" | "slot" | "species" | "name"> {
  return { side: ref.side, slot, species: ref.species, name: ref.name };
}

/** What the broadcast knows at one rendered frame. */
export interface FrameView {
  readonly clock: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly now: number;
  readonly kicks: number;
  readonly kickProgress?: number;
  readonly motion: boolean;
  readonly speed: number;
  readonly userSlots: StageInput["userSlots"];
  readonly oppSlots: StageInput["oppSlots"];
  readonly oppLabels?: readonly string[];
  readonly windows?: StageInput["windows"];
}

/**
 * The beat on the pitch, the goal or save the ball is acting out or settling back from, and the
 * staged pitch for one frame, as the broadcast draws it.
 */
export function stageFrame(
  timeline: Timeline,
  view: FrameView,
): {
  readonly active: Active | null;
  readonly shot: Shot | null;
  readonly stage: PitchStage;
} {
  const active = activeBeat(timeline, view.fired, view.now, view.motion, view.clock, view.speed);
  const shot = view.motion
    ? shotOnPitch(timeline, view.fired, view.now, view.speed, view.clock)
    : null;
  const stage = stagePitch(timeline, {
    clock: view.clock,
    active,
    kicks: view.kicks,
    kickProgress: view.kickProgress,
    motion: view.motion,
    userSlots: view.userSlots,
    oppSlots: view.oppSlots,
    oppLabels: view.oppLabels,
    shot,
    walks: view.motion ? walksAt(timeline, view.fired, view.now, view.speed, view.clock) : [],
    windows: view.windows,
  });
  return { active, shot, stage };
}

export type Stage = "play" | "pens" | "done";

export interface PlayState {
  readonly minute: number;
  readonly stage: Stage;
  /** The player's own pause. */
  readonly running: boolean;
  /** The touchline sheet is open on a phone, which holds the clock apart from the player's pause. */
  readonly uiHold: boolean;
  /** When the clock last stopped for a pause or the sheet, while it stays stopped. */
  readonly pausedAt: number | null;
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
  /** The user's goal playing again at half speed while the live clock waits. */
  readonly replay: InstantReplay | null;
}

/** A goal staged again from `at` (real time), at the goal's minute. */
export interface InstantReplay {
  readonly key: string;
  readonly minute: number;
  readonly at: number;
}

export interface PlayEnv {
  readonly timeline: Timeline;
  readonly stops: readonly Stop[];
  readonly pace: Pace;
  /** Each user goal plays again at half speed once its hold ends: Live with motion only. */
  readonly replays?: boolean;
}

export const REPLAY_SPEED = 0.5;

/** How far the instant replay is through the goal's staging at real time `now`, 0 to 1. */
export function replayProgress(r: InstantReplay, now: number): number {
  return Math.min(1, Math.max(0, ((now - r.at) * REPLAY_SPEED) / SHOW.goal));
}

/**
 * The clock, beat times and speed the broadcast stages at real time `now`. While an instant replay
 * plays, that is the goal's minute with the goal fired at the replay's start, at half speed.
 */
export function staged(
  state: PlayState,
  now: number,
): {
  readonly clock: number;
  readonly now: number;
  readonly fired: Readonly<Record<string, number>>;
  readonly speed: number;
} {
  const r = state.replay;
  if (r === null) {
    return {
      clock: state.minute,
      now: frameNow(state, now),
      fired: state.fired,
      speed: state.speed,
    };
  }
  return { clock: r.minute, now, fired: { ...state.fired, [r.key]: r.at }, speed: REPLAY_SPEED };
}

export const START: PlayState = {
  minute: 0,
  stage: "play",
  running: false,
  uiHold: false,
  pausedAt: null,
  speed: 1,
  stop: null,
  answered: [],
  hold: null,
  held: [],
  fired: {},
  kicks: 0,
  kickAt: 0,
  replay: null,
};

export type PlayAction =
  | { readonly type: "tick"; readonly now: number; readonly dt: number; readonly env: PlayEnv }
  | { readonly type: "toggle"; readonly now: number }
  | { readonly type: "sheet"; readonly open: boolean; readonly now: number }
  | { readonly type: "speed"; readonly now: number }
  | { readonly type: "answer"; readonly key: string }
  | { readonly type: "skip"; readonly env: PlayEnv }
  | { readonly type: "seek"; readonly minute: number; readonly now: number; readonly env: PlayEnv }
  | { readonly type: "endReplay"; readonly now: number };

// A beat a seek passes counts as shown this long ago: landed, staged and settled, so it neither
// plays on the pitch nor sounds.
const SEEN_LONG_AGO = 3_600_000;

/**
 * The clock moved to `minute` and running. Every beat it passes counts as shown long ago and every
 * later beat waits to fire again. A manager stop nobody answered before `minute` refuses the seek,
 * so a seek never answers one.
 */
function seek(state: PlayState, env: PlayEnv, minute: number, now: number): PlayState {
  const { timeline } = env;
  const to = Math.min(timeline.finalMinute, Math.max(0, minute));
  const skipped = env.stops.some((s) => s.minute <= to && !state.answered.includes(s.key));
  if (skipped) return state;
  const fired: Record<string, number> = {};
  for (const b of timeline.beats) {
    if (b.minute > to) break;
    if (revealed(b, to)) fired[beatKey(b)] = now - SEEN_LONG_AGO;
  }
  return {
    ...state,
    minute: to,
    stage: "play",
    running: true,
    uiHold: false,
    pausedAt: null,
    stop: null,
    hold: null,
    held: Object.keys(fired),
    fired,
    kicks: 0,
    kickAt: 0,
    replay: null,
  };
}

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

const frozen = (s: PlayState) => !s.running || s.uiHold || s.replay !== null;

/** The time the broadcast stages at: while a pause or the sheet holds the clock, the moment it stopped. */
export function frameNow(state: PlayState, now: number): number {
  return frozen(state) && state.pausedAt !== null ? state.pausedAt : now;
}

/**
 * Notes when the clock stops, and on resume moves every timestamp the staging reads on by the time
 * it stood still, so a kick or a goal picks up where it was.
 */
function holdTime(prev: PlayState, next: PlayState, now: number): PlayState {
  if (!frozen(prev) && frozen(next)) return { ...next, pausedAt: now };
  if (!frozen(prev) || frozen(next)) return next;
  if (prev.pausedAt === null) return next;
  const d = now - prev.pausedAt;
  const fired: Record<string, number> = {};
  for (const [key, at] of Object.entries(next.fired)) fired[key] = at + d;
  return {
    ...next,
    pausedAt: null,
    fired,
    kickAt: next.stage === "pens" ? next.kickAt + d : next.kickAt,
    hold: next.hold === null ? null : { ...next.hold, until: next.hold.until + d },
  };
}

/**
 * The other speed, with every staging time rebased about the frame on screen. The broadcast reads
 * each beat, the hold and the penalty as real time elapsed times speed, so all of them stay where
 * they are and only what is left plays faster or slower.
 */
function toggleSpeed(state: PlayState, now: number): PlayState {
  const speed = state.speed === 1 ? 2 : 1;
  const t = frameNow(state, now);
  const rebase = (at: number) => t - ((t - at) * state.speed) / speed;
  const fired: Record<string, number> = {};
  for (const [key, at] of Object.entries(state.fired)) fired[key] = rebase(at);
  return {
    ...state,
    speed,
    fired,
    kickAt: state.stage === "pens" ? rebase(state.kickAt) : state.kickAt,
    hold: state.hold === null ? null : { ...state.hold, until: rebase(state.hold.until) },
  };
}

function endReplay(state: PlayState, now: number): PlayState {
  return holdTime(state, { ...state, replay: null }, now);
}

function tick(state: PlayState, env: PlayEnv, now: number, dt: number): PlayState {
  if (state.replay !== null) {
    return replayProgress(state.replay, now) < 1 ? state : endReplay(state, now);
  }
  if (state.stage === "done" || frozen(state) || state.stop !== null) return state;
  const { timeline, pace } = env;
  if (state.hold !== null) {
    if (now < state.hold.until) return state;
    const key = state.hold.key;
    state = { ...state, hold: null };
    const goal = timeline.beats.find((b) => b.kind === "goal" && beatKey(b) === key);
    if (env.replays === true && goal?.kind === "goal" && goal.side === "user") {
      return holdTime(state, { ...state, replay: { key, minute: goal.minute, at: now } }, now);
    }
  }
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
      // Pausing during an instant replay ends it; the live clock resumes from the goal.
      return holdTime(state, { ...state, running: !state.running, replay: null }, action.now);
    case "sheet":
      return holdTime(state, { ...state, uiHold: action.open }, action.now);
    case "speed":
      return toggleSpeed(state, action.now);
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
        uiHold: false,
        pausedAt: null,
        replay: null,
        kicks: timeline.kicks.length,
        answered: [...new Set([...state.answered, ...stops.map((s) => s.key)])],
      };
    }
    case "seek":
      return seek(state, action.env, action.minute, action.now);
    case "endReplay":
      return state.replay === null ? state : endReplay(state, action.now);
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
