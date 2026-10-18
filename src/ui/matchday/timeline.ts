import { createRng } from "@/lib/rng";
import type { Moveset } from "@/data/movesets";
import { FORMATIONS } from "@/engine/formations";
import { speciesById } from "@/engine/species";
import type {
  FormationId,
  FullLineup,
  GoalEvent,
  GoalKind,
  MatchResult,
  OpponentPlayerRef,
  PokemonType,
  Score,
  Side,
  SpeciesId,
  Tactic,
} from "@/engine/types";
import { fieldedFor } from "@/ui/manager/touchline";
import { playCallout, saveCallout, shotCallout, type Callout, type Effect } from "./moves";

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

/** A player on the broadcast: their side, the formation slot they stand in (null when unknown). */
export interface PitchRef {
  readonly side: Side;
  readonly slot: number | null;
  readonly species: SpeciesId | null;
  readonly name: string;
}

export type WhistleLabel =
  | "Kick off"
  | "Half time"
  | "Full time"
  | "End of normal time"
  | "Extra time half time"
  | "End of extra time";

export type Beat =
  | { readonly kind: "whistle"; readonly minute: number; readonly label: WhistleLabel }
  | {
      readonly kind: "goal";
      readonly minute: number;
      readonly side: Side;
      readonly scorer: PitchRef;
      readonly assist: PitchRef | null;
      readonly penalty: boolean;
      readonly goalKind: GoalKind;
      readonly callout: Callout;
      /** The score once this goal stands. */
      readonly score: Score;
    }
  | {
      readonly kind: "save";
      readonly minute: number;
      /** The keeper's side. */
      readonly side: Side;
      readonly keeper: PitchRef;
      readonly attacker: PitchRef;
      readonly callout: Callout;
    }
  | {
      readonly kind: "card";
      readonly minute: number;
      readonly side: Side;
      readonly player: PitchRef;
      readonly color: "yellow" | "red";
      readonly secondYellow: boolean;
    }
  | { readonly kind: "injury"; readonly minute: number; readonly player: PitchRef }
  | {
      readonly kind: "sub";
      readonly minute: number;
      readonly slot: number;
      readonly out: PitchRef;
      readonly in: PitchRef;
      readonly reason: "injury" | "tactical" | "fatigue";
      readonly by: "manager" | "auto";
    }
  | {
      readonly kind: "tactic";
      readonly minute: number;
      readonly side: Side;
      readonly tactic: Tactic;
      readonly by: "manager" | "auto";
    };

export interface Kick {
  readonly index: number;
  readonly side: Side;
  readonly taker: PitchRef;
  readonly scored: boolean;
  /** The shootout score after this kick. */
  readonly score: Score;
}

/** One five-minute stretch: where the ball leans and how far each line has pushed up. */
export interface Frame {
  readonly from: number;
  readonly to: number;
  /**
   * -1 (pinned in the user's half) to 1 (camped in the opponent's), from the goals and saves of the
   * window that just finished, so it never leans toward a chance before it happens. The first
   * window reads 0.
   */
  readonly ball: number;
  /** Pitch-length percent each side's shape sits above its default. */
  readonly line: { readonly user: number; readonly opp: number };
}

export interface Drift {
  readonly phase: number;
  readonly amp: number;
  readonly speed: number;
}

/** Who stands in a slot from a minute on; null when it is left empty. */
export interface SlotChange {
  readonly minute: number;
  readonly side: Side;
  readonly slot: number;
  readonly species: SpeciesId | null;
}

export type PlayKind = "pass" | "dribble" | "through" | "cross" | "duel";

/**
 * Why an open-play phase carries a callout: a through ball or a cross into the final third, a duel
 * that wins the ball for a goal or a save, or a slice of ordinary build-up.
 */
export type CalloutMoment = "through" | "cross" | "key-duel" | "build-up";

export interface PlayPhase {
  readonly from: number;
  readonly to: number;
  readonly side: Side;
  readonly kind: PlayKind;
  readonly fromSlot: number;
  readonly toSlot: number;
  readonly presserSlot: number;
  readonly runners: readonly [number, number];
  readonly actor: PitchRef;
  readonly callout: Callout | null;
  /** The minute of the goal this phase kicks off after, from the centre spot; null in open play. */
  readonly kickoff: number | null;
  /** Set exactly when `callout` is. */
  readonly moment: CalloutMoment | null;
}

export interface Timeline {
  readonly finalMinute: 90 | 120;
  /** A retained engine recorded only goals: no windows, incidents or saves to stage. */
  readonly goalsOnly: boolean;
  readonly beats: readonly Beat[];
  readonly kicks: readonly Kick[];
  readonly frames: readonly Frame[];
  readonly plays: readonly PlayPhase[];
  readonly drift: { readonly user: readonly Drift[]; readonly opp: readonly Drift[] };
  readonly userXI: readonly SpeciesId[];
  readonly oppXI: readonly (SpeciesId | null)[];
  readonly changes: readonly SlotChange[];
}

export interface TimelineInput {
  readonly matchIndex: number;
  readonly seed: string;
  readonly lineup: FullLineup;
  /** Canon movesets once loaded; without them the callouts are generic. */
  readonly movesOf?: ((id: number) => Moveset | null) | null;
}

export const TACTIC_LINE: Readonly<Record<Tactic, number>> = {
  attack: 7,
  press: 4,
  balanced: 0,
  counter: -3,
  defend: -7,
};

const WINDOW = 5;
export const PHASE_LEN = 1.25;

/** Bosses without a recorded shape line up in a 4-3-3. */
export const OPP_SHAPE: FormationId = "4-3-3";

// A slot this far up its own half (engine y) receives the ball in the final third.
const FINAL_THIRD_Y = 70;
const BUILD_UP_SHARE = 0.15;
// Minutes between two callouts, so they mark moments instead of narrating every touch. Key duels
// ignore it: they lead straight to a shot.
const CALLOUT_GAP = 5;
const TAU = Math.PI * 2;

const CENTRE: Point = { x: 50, y: 50 };
/** How far ahead of a carrier's feet the ball runs, in pitch percent. */
const TOUCH = 1.6;
/** The share of a turnover phase spent on the tackle or interception that wins the ball. */
const TACKLE = 0.24;
/** The share of a phase by which a pass reaches its receiver. */
const PASS_LANDS = 0.94;
/** The shares of a save's staging at which the shooter strikes and the keeper reaches the ball. */
const SAVE_STRIKE = 0.3;
/** A moment after a beat's minute, once the clock has moved on from it. */
const RESUME = 1e-6;
const SAVE_REACH = 0.55;

function name(id: SpeciesId | null, fallback: string): string {
  return id === null ? fallback : speciesById(id).name;
}

function oppRefId(ref: OpponentPlayerRef): SpeciesId | null {
  return ref.kind === "species" ? ref.id : null;
}

function oppRefName(ref: OpponentPlayerRef): string {
  return ref.kind === "species" ? speciesById(ref.id).name : `No. ${ref.number}`;
}

/** Who stands in each slot at a minute, after everything logged at or before it. */
export function xiAt(
  timeline: Pick<Timeline, "userXI" | "oppXI" | "changes">,
  side: Side,
  minute: number,
): readonly (SpeciesId | null)[] {
  const xi: (SpeciesId | null)[] = [...(side === "user" ? timeline.userXI : timeline.oppXI)];
  for (const c of timeline.changes) {
    if (c.minute > minute) break;
    if (c.side === side) xi[c.slot] = c.species;
  }
  return xi;
}

function activeOutfieldSlots(
  base: Pick<Timeline, "userXI" | "oppXI" | "changes">,
  side: Side,
  minute: number,
  roster: readonly OpponentPlayerRef[],
): number[] {
  const xi = xiAt(base, side, minute);
  const out: number[] = [];
  for (let slot = 1; slot < 11; slot++) {
    if (side === "user" ? xi[slot] !== null : xi[slot] !== null || roster[slot]?.kind === "shirt") {
      out.push(slot);
    }
  }
  return out.length > 0 ? out : [1, 2, 5, 8, 9];
}

export function buildTimeline(match: PlayedMatch, input: TimelineInput): Timeline {
  const movesOf = input.movesOf ?? null;
  const fielded = fieldedFor(input.lineup, match);
  const userXI = fielded.starters;
  const oppXI = match.opponent.roster.map(oppRefId);
  const incidents = match.incidents ?? [];
  const goalsOnly = match.windows === undefined;
  const finalMinute = match.extraTime === null ? 90 : 120;

  const changes: SlotChange[] = [];
  for (const i of incidents) {
    if (i.kind === "sub")
      changes.push({ minute: i.minute, side: "user", slot: i.slot, species: i.in });
    else if (i.kind === "red" || i.kind === "injury")
      changes.push({ minute: i.minute, side: i.side, slot: i.slot, species: null });
  }
  const base = { userXI, oppXI, changes };

  const userRef = (id: SpeciesId, minute: number): PitchRef => {
    const slot = xiAt(base, "user", minute).indexOf(id);
    return { side: "user", slot: slot < 0 ? null : slot, species: id, name: name(id, "") };
  };
  const oppRef = (id: SpeciesId | null, label: string, minute: number): PitchRef => {
    const slot = id === null ? -1 : xiAt(base, "opp", minute).indexOf(id);
    return { side: "opp", slot: slot < 0 ? null : slot, species: id, name: label };
  };
  const slotRef = (side: Side, slot: number, id: SpeciesId): PitchRef => ({
    side,
    slot,
    species: id,
    name: name(id, ""),
  });
  const pitchRefAt = (side: Side, slot: number, minute: number): PitchRef => {
    const xi = xiAt(base, side, minute);
    const id = xi[slot] ?? null;
    if (side === "user") return { side, slot, species: id, name: name(id, "Player") };
    const ref = match.opponent.roster[slot];
    const label = id !== null ? name(id, "Opponent") : ref ? oppRefName(ref) : "Opponent";
    return { side, slot, species: id, name: label };
  };

  const moveRng = createRng(`broadcast:${input.seed}:${input.matchIndex}:moves`);
  const beats: Beat[] = [];
  const score = { user: 0, opp: 0 };
  const scorerRef = (g: GoalEvent): PitchRef =>
    g.side === "user"
      ? userRef(g.scorer, g.minute)
      : oppRef(oppRefId(g.scorer), oppRefName(g.scorer), g.minute);
  for (const g of match.goals) {
    score[g.side]++;
    const scorer = scorerRef(g);
    const assist =
      g.assist === null
        ? null
        : g.side === "user"
          ? userRef(g.assist, g.minute)
          : oppRef(oppRefId(g.assist), oppRefName(g.assist), g.minute);
    const moveset = scorer.species === null || movesOf === null ? null : movesOf(scorer.species);
    beats.push({
      kind: "goal",
      minute: g.minute,
      side: g.side,
      scorer,
      assist,
      penalty: g.penalty,
      goalKind: g.kind ?? (g.penalty ? "penalty" : "open-play"),
      callout: shotCallout(scorer.name, moveset, moveRng),
      score: { ...score },
    });
  }
  for (const sv of match.saves ?? []) {
    const keeper =
      sv.side === "user"
        ? userRef(sv.keeper, sv.minute)
        : oppRef(sv.keeper, name(sv.keeper, ""), sv.minute);
    const attacker =
      sv.side === "user"
        ? oppRef(sv.attacker, name(sv.attacker, ""), sv.minute)
        : userRef(sv.attacker, sv.minute);
    beats.push({
      kind: "save",
      minute: sv.minute,
      side: sv.side,
      keeper,
      attacker,
      callout: saveCallout(keeper.name, movesOf === null ? null : movesOf(sv.keeper)),
    });
  }
  for (const i of incidents) {
    switch (i.kind) {
      case "yellow":
      case "red":
        beats.push({
          kind: "card",
          minute: i.minute,
          side: i.side,
          player: slotRef(i.side, i.slot, i.player),
          color: i.kind,
          secondYellow: i.secondYellow,
        });
        break;
      case "injury":
        beats.push({ kind: "injury", minute: i.minute, player: slotRef("user", i.slot, i.player) });
        break;
      case "sub":
        beats.push({
          kind: "sub",
          minute: i.minute,
          slot: i.slot,
          out: slotRef("user", i.slot, i.out),
          in: slotRef("user", i.slot, i.in),
          reason: i.reason,
          by: i.by,
        });
        break;
      case "tactic":
        beats.push({ kind: "tactic", minute: i.minute, side: i.side, tactic: i.tactic, by: i.by });
        break;
    }
  }
  const whistles: [number, WhistleLabel][] = [
    [0, "Kick off"],
    [45, "Half time"],
    [90, finalMinute === 120 ? "End of normal time" : "Full time"],
  ];
  if (finalMinute === 120) whistles.push([105, "Extra time half time"], [120, "End of extra time"]);
  // Whistles sort first at their minute, goals before the rest, then the engine's own order.
  const rank = (b: Beat): number =>
    b.kind === "whistle" ? (b.minute === 0 ? -1 : 2) : b.kind === "goal" ? 0 : 1;
  const ordered = [
    ...whistles.map(([minute, label]): Beat => ({ kind: "whistle", minute, label })),
    ...beats,
  ]
    .map((b, k) => ({ b, k }))
    .sort((p, q) => p.b.minute - q.b.minute || rank(p.b) - rank(q.b) || p.k - q.k)
    .map(({ b }) => b);

  const kicks: Kick[] = [];
  if (match.shootout !== null) {
    const pens = { user: 0, opp: 0 };
    match.shootout.kicks.forEach((k, index) => {
      if (k.scored) pens[k.side]++;
      const taker =
        k.side === "user"
          ? userRef(k.taker, finalMinute)
          : oppRef(oppRefId(k.taker), oppRefName(k.taker), finalMinute);
      kicks.push({ index, side: k.side, taker, scored: k.scored, score: { ...pens } });
    });
  }

  const frames: Frame[] = [];
  for (let from = 0; from < finalMinute; from += WINDOW) {
    const to = from + WINDOW;
    const inside = (m: number) => m > from - WINDOW && m <= from;
    const pressure = (side: Side) =>
      match.goals.filter((g) => g.side === side && inside(g.minute)).length +
      (match.saves ?? []).filter((s) => s.side !== side && inside(s.minute)).length;
    const u = pressure("user");
    const o = pressure("opp");
    const snap = match.windows?.find((w) => w.minute === to);
    frames.push({
      from,
      to,
      ball: (u - o) / (u + o + 1),
      line: snap
        ? { user: TACTIC_LINE[snap.tactic.user], opp: TACTIC_LINE[snap.tactic.opp] }
        : { user: 0, opp: 0 },
    });
  }

  const driftRng = createRng(`broadcast:${input.seed}:${input.matchIndex}:drift`);
  const drift = (): Drift => ({
    phase: driftRng.next() * TAU,
    amp: 1.5 + driftRng.next() * 2,
    speed: 0.25 + driftRng.next() * 0.35,
  });
  const drifts = { user: userXI.map(drift), opp: oppXI.map(drift) };

  const plays: PlayPhase[] = [];
  if (!goalsOnly) {
    const playRng = createRng(`broadcast:${input.seed}:${input.matchIndex}:plays`);
    // Callouts draw one number every phase from their own stream, so neither the choreography nor
    // another phase's call depends on the movesets or on which phases get a callout.
    const calloutRng = createRng(`broadcast:${input.seed}:${input.matchIndex}:callouts`);
    const slots = {
      user: FORMATIONS[input.lineup.formation].slots,
      opp: FORMATIONS[match.opponent.formation ?? OPP_SHAPE].slots,
    };
    const sofar = { plays, frames, drift: drifts };
    let lastCallout = -Infinity;
    let curSide: Side = "user";
    let curSlot = 5;
    let chain = 0;
    let lastGoal: Extract<Beat, { kind: "goal" }> | undefined;
    for (let from = 0; from < finalMinute; from += PHASE_LEN) {
      const to = from + PHASE_LEN;
      const frame = frames.find((f) => from >= f.from && to <= f.to) ?? frames[0]!;
      const goalIn = ordered.find(
        (b): b is Extract<Beat, { kind: "goal" }> =>
          b.kind === "goal" && b.minute > from && b.minute <= to,
      );
      const saveIn = ordered.find(
        (b): b is Extract<Beat, { kind: "save" }> =>
          b.kind === "save" && b.minute > from && b.minute <= to,
      );

      // After a goal the conceding side kicks off from the centre spot.
      const kickoff = lastGoal?.minute ?? null;
      if (lastGoal !== undefined) {
        curSide = lastGoal.side === "user" ? "opp" : "user";
        curSlot = kickoffTaker(
          curSide,
          slots[curSide],
          activeOutfieldSlots(base, curSide, to, match.opponent.roster),
        );
        chain = 0;
      }

      let side: Side = curSide;
      if (goalIn !== undefined) {
        side = goalIn.side;
      } else if (saveIn !== undefined) {
        side = saveIn.side === "user" ? "opp" : "user";
      } else if (kickoff === null) {
        const userBias = Math.min(0.82, Math.max(0.18, 0.5 + frame.ball * 0.32));
        const holdProb = chain < 3 ? 0.68 : 0.38;
        if (playRng.next() >= holdProb) {
          side = playRng.next() < userBias ? "user" : "opp";
        }
      }

      const pool = activeOutfieldSlots(base, side, to, match.opponent.roster);
      const defSide: Side = side === "user" ? "opp" : "user";
      const defPool = activeOutfieldSlots(base, defSide, to, match.opponent.roster);
      const sameSide = side === curSide && pool.includes(curSlot);
      // A turnover goes to the player nearest the ball where the last phase left it.
      const won = ((): { readonly slot: number; readonly at: readonly Point[] } | null => {
        const prev = plays.at(-1);
        if (sameSide || prev === undefined) return null;
        const shape =
          kickoff !== null
            ? kickoffShape(curSide, curSlot, slots.user, slots.opp)
            : phaseWaypoint(sofar, plays.length - 1, slots.user, slots.opp);
        const ball = kickoff !== null ? CENTRE : carriedBall(prev, shape);
        const slot = nearestTo(ball, pool, shape[side]);
        return slot === null ? null : { slot, at: shape[side] };
      })();
      const fromSlot = sameSide
        ? curSlot
        : (won?.slot ??
          (pool.includes(5) ? 5 : (pool[Math.floor(playRng.next() * pool.length)] ?? 5)));
      // Whoever wins the ball lays it off to one of the teammates nearest them.
      const outlets = pool.filter((s) => s !== fromSlot);
      if (won !== null) {
        const from = won.at[fromSlot] ?? CENTRE;
        const away = (s: number) => {
          const p = won.at[s] ?? CENTRE;
          return Math.hypot(p.x - from.x, p.y - from.y);
        };
        outlets.sort((a, b) => away(a) - away(b) || a - b);
        outlets.length = Math.ceil(outlets.length / 2);
      }

      let kind: PlayKind;
      let toSlot: number;
      if (!sameSide && from > 0) {
        kind = "duel";
        toSlot =
          goalIn?.scorer.slot ??
          saveIn?.attacker.slot ??
          (playRng.next() < 0.45
            ? fromSlot
            : (outlets[Math.floor(playRng.next() * outlets.length)] ?? fromSlot));
        chain = 1;
      } else {
        chain++;
        const roll = playRng.next();
        if (goalIn?.scorer.slot != null) {
          kind = fromSlot === goalIn.scorer.slot ? "dribble" : "through";
          toSlot = goalIn.scorer.slot;
        } else if (saveIn?.attacker.slot != null) {
          kind = fromSlot === saveIn.attacker.slot ? "dribble" : "through";
          toSlot = saveIn.attacker.slot;
        } else if (roll < 0.26) {
          kind = "dribble";
          toSlot = fromSlot;
        } else {
          const forward = pool.filter((s) => s !== fromSlot && s >= Math.max(4, fromSlot - 1));
          const choices = forward.length > 0 ? forward : pool.filter((s) => s !== fromSlot);
          toSlot =
            choices.length > 0 ? choices[Math.floor(playRng.next() * choices.length)]! : fromSlot;
          kind =
            toSlot >= 8 && roll > 0.78 ? "cross" : toSlot >= 7 && roll > 0.56 ? "through" : "pass";
        }
      }

      const otherOutfield = pool.filter((s) => s !== fromSlot && s !== toSlot);
      const r1 =
        otherOutfield.length > 0
          ? otherOutfield[Math.floor(playRng.next() * otherOutfield.length)]!
          : toSlot;
      const r2Pool = otherOutfield.filter((s) => s !== r1);
      const r2 = r2Pool.length > 0 ? r2Pool[Math.floor(playRng.next() * r2Pool.length)]! : r1;
      const presserSlot =
        defPool.length > 0 ? defPool[Math.floor(playRng.next() * defPool.length)]! : 5;

      const actor = pitchRefAt(side, fromSlot, to);
      const buildUpRoll = kind === "pass" || kind === "dribble" ? playRng.next() : 1;
      const finalThird = (slots[side][toSlot]?.y ?? 0) >= FINAL_THIRD_Y;
      const candidate: CalloutMoment | null =
        kind === "duel"
          ? goalIn !== undefined || saveIn !== undefined
            ? "key-duel"
            : null
          : kind === "through" || kind === "cross"
            ? finalThird
              ? kind
              : null
            : buildUpRoll < BUILD_UP_SHARE
              ? "build-up"
              : null;
      const moment =
        candidate === "key-duel" || (candidate !== null && from - lastCallout >= CALLOUT_GAP)
          ? candidate
          : null;
      if (moment !== null) lastCallout = from;
      const role = kind === "duel" ? "duel" : kind === "dribble" ? "dribble" : "pass";
      const moveset = actor.species === null || movesOf === null ? null : movesOf(actor.species);
      const call = playCallout(actor.name, moveset, role, calloutRng);
      const callout = moment === null ? null : call;

      plays.push({
        from,
        to,
        side,
        kind,
        fromSlot,
        toSlot,
        presserSlot,
        runners: [r1, r2],
        actor,
        callout,
        kickoff,
        moment,
      });
      curSide = side;
      curSlot = toSlot;
      lastGoal = ordered.findLast(
        (b): b is Extract<Beat, { kind: "goal" }> =>
          b.kind === "goal" && b.minute > from && b.minute <= to,
      );
    }
  }

  return {
    finalMinute,
    goalsOnly,
    beats: ordered,
    kicks,
    frames,
    plays,
    drift: drifts,
    userXI,
    oppXI,
    changes,
  };
}

/** The frame playing at a minute. */
export function frameAt(timeline: Pick<Timeline, "frames">, minute: number): Frame | null {
  return (
    timeline.frames.find((f) => minute > f.from && minute <= f.to) ?? timeline.frames[0] ?? null
  );
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Where a formation slot stands on a pitch drawn lengthways: the user's goal on the left. A slot's
 * engine coordinates run from its own goal (y) and across the pitch (x).
 */
export function slotPoint(
  side: Side,
  slot: { readonly x: number; readonly y: number },
  line: number,
): Point {
  const depth = Math.min(92, Math.max(4, 4 + slot.y * 0.86 + (slot.y > 10 ? line : 0)));
  return side === "user" ? { x: depth, y: slot.x } : { x: 100 - depth, y: 100 - slot.x };
}

/** A player's drifting spot at a minute; with motion off it is the slot itself. */
export function driftPoint(home: Point, d: Drift, minute: number, motion: boolean): Point {
  if (!motion) return home;
  const t = d.phase + minute * d.speed * TAU;
  return {
    x: Math.min(97, Math.max(3, home.x + d.amp * Math.sin(t))),
    y: Math.min(96, Math.max(4, home.y + d.amp * 0.8 * Math.cos(t * 0.7))),
  };
}

/** The ball between events: it sways toward the side that made chances in the last window. */
export function ambientBall(timeline: Timeline, minute: number, motion: boolean): Point {
  if (!motion) return { x: 50, y: 50 };
  const lean = frameAt(timeline, minute)?.ball ?? 0;
  return {
    x: 50 + lean * 24 + 9 * Math.sin(minute * 1.7),
    y: 50 + 22 * Math.cos(minute * 1.1),
  };
}

/** The goal mouth a side shoots at. */
export function goalMouth(side: Side): Point {
  return side === "user" ? { x: 98, y: 50 } : { x: 2, y: 50 };
}

function lerp(a: Point, b: Point, t: number): Point {
  const k = Math.min(1, Math.max(0, t));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function clampPoint(p: Point, minX = 3, maxX = 97, minY = 5, maxY = 95): Point {
  return {
    x: Math.min(maxX, Math.max(minX, p.x)),
    y: Math.min(maxY, Math.max(minY, p.y)),
  };
}

function smoothstep(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** How long each beat stays on the pitch, in real milliseconds. */
export const SHOW: Readonly<Record<Beat["kind"], number>> = {
  whistle: 1_200,
  goal: 2_600,
  save: 1_100,
  card: 1_600,
  injury: 1_800,
  sub: 1_800,
  tactic: 2_000,
};

/** The share of a goal's staging at which the ball crosses the line. */
export const GOAL_LANDS = 0.6;

/** How long the pitch takes to settle after a goal or a save leaves it, in real milliseconds. */
export const SETTLE: Readonly<Record<"goal" | "save", number>> = { goal: 600, save: 300 };

/** A goal move as it plays: from the live ball to the shot, the shot, then the ball in the net. */
export function goalBall(from: Point, shot: Point, mouth: Point, progress: number): Point {
  if (progress < 0.35) return lerp(from, shot, progress / 0.35);
  if (progress < GOAL_LANDS) return lerp(shot, mouth, (progress - 0.35) / (GOAL_LANDS - 0.35));
  return mouth;
}

/** A save as it plays: from the live ball to the shooter, the shot, the parry, then clear. */
export function saveBall(
  from: Point,
  attacker: Point,
  mouth: Point,
  deflect: Point,
  progress: number,
): Point {
  if (progress < SAVE_STRIKE) return lerp(from, attacker, progress / SAVE_STRIKE);
  if (progress < SAVE_REACH) {
    return lerp(attacker, mouth, (progress - SAVE_STRIKE) / (SAVE_REACH - SAVE_STRIKE));
  }
  if (progress < 0.65) return mouth;
  return lerp(mouth, deflect, (progress - 0.65) / 0.35);
}

/** The spot a penalty is taken from, the one the pitch draws. */
export function penaltySpot(side: Side): Point {
  return side === "user" ? { x: 89, y: 50 } : { x: 11, y: 50 };
}

/** How long a player takes to walk on or off the pitch, in real milliseconds at 1x. */
export const WALK = 1_800;

/** A player walking on from the bench or off to the touchline, timed by their own beat. */
export interface Walk {
  readonly side: Side;
  readonly slot: number;
  readonly species: SpeciesId | null;
  readonly name: string;
  readonly dir: "on" | "off";
  /** 0 to 1 through the walk; an injury's replacement waits at 0 until the injured player is seen. */
  readonly progress: number;
}

/** A free kick's fixed spot, a quarter of the pitch out from the goal it aims at. */
export function freeKickSpot(side: Side): Point {
  return side === "user" ? { x: 75, y: 50 } : { x: 25, y: 50 };
}

export type PlayerPose =
  "idle" | "run" | "sprint" | "dribble" | "cast" | "press" | "celebrate" | "dive" | "down";

export interface StagedPlayer {
  readonly side: Side;
  readonly slot: number;
  readonly species: SpeciesId | null;
  readonly name: string;
  readonly point: Point;
  readonly facing: "left" | "right";
  readonly pose: PlayerPose;
  readonly hasBall: boolean;
  readonly hot: boolean;
  readonly yellowCards: number;
  readonly callout: Callout | null;
}

export interface BallTrail {
  readonly from: Point;
  readonly to: Point;
  readonly effect: Effect | null;
  readonly type: PokemonType | null;
  readonly kind: "pass" | "shot" | "save" | "dribble";
  readonly progress: number;
}

export interface PitchStage {
  readonly players: {
    readonly user: readonly (StagedPlayer | null)[];
    readonly opp: readonly (StagedPlayer | null)[];
  };
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly loft: number;
    readonly spin: number;
    readonly effect: Effect | null;
    readonly carrier: PitchRef | null;
  };
  readonly trail: BallTrail | null;
  /** Players walking off after a red card or a substitution, until they reach the touchline. */
  readonly leaving?: readonly StagedPlayer[];
  readonly playCallout: {
    readonly side: Side;
    readonly slot: number;
    readonly species: SpeciesId | null;
    readonly point: Point;
    readonly callout: Callout;
    readonly kind: PlayKind;
    readonly moment: CalloutMoment;
  } | null;
}

export interface StageInput {
  readonly clock: number;
  readonly active: { readonly beat: Beat; readonly progress: number } | null;
  readonly kicks: number;
  readonly motion: boolean;
  readonly userSlots: FormationId | readonly { readonly x: number; readonly y: number }[];
  readonly oppSlots: FormationId | readonly { readonly x: number; readonly y: number }[];
  readonly oppLabels?: readonly string[];
  /** The goal or save the ball is acting out, or settling back from; null in open play. */
  readonly shot?: Shot | null;
  /** Players walking on or off; none with motion off. */
  readonly walks?: readonly Walk[];
}

export type ShotBeat = Extract<Beat, { kind: "goal" | "save" }>;

export interface Shot {
  readonly beat: ShotBeat;
  /** Milliseconds at 1x since its staging began: `SHOW` stages it, `SETTLE` more settles it. */
  readonly age: number;
  /** The shot still on the pitch when this one began, at its age then: it hands over the ball. */
  readonly before?: Shot | null;
}

function resolveSlots(
  spec: FormationId | readonly { readonly x: number; readonly y: number }[],
): readonly { readonly x: number; readonly y: number }[] {
  return typeof spec === "string" ? FORMATIONS[spec].slots : spec;
}

function phaseWaypoint(
  timeline: Pick<Timeline, "plays" | "frames" | "drift">,
  phaseIndex: number,
  userSlots: readonly { readonly x: number; readonly y: number }[],
  oppSlots: readonly { readonly x: number; readonly y: number }[],
): { readonly user: readonly Point[]; readonly opp: readonly Point[] } {
  const clampedIdx = Math.max(0, Math.min(timeline.plays.length - 1, phaseIndex));
  const phase = timeline.plays[clampedIdx];
  const minute = phase ? phase.to : 0;
  const frame = frameAt(timeline, minute);
  const line = frame?.line ?? { user: 0, opp: 0 };
  if (phase === undefined) {
    return {
      user: userSlots.map((s) => slotPoint("user", s, line.user)),
      opp: oppSlots.map((s) => slotPoint("opp", s, line.opp)),
    };
  }

  const carrierSlots = phase.side === "user" ? userSlots : oppSlots;
  const carrierHome = slotPoint(
    phase.side,
    carrierSlots[phase.toSlot] ?? { x: 50, y: 50 },
    line[phase.side],
  );
  const attDir = phase.side === "user" ? 1 : -1;
  const surge =
    phase.kind === "through" || phase.kind === "cross" ? 14 : phase.kind === "dribble" ? 11 : 7;
  const pullY = phase.toSlot >= 8 ? (50 - carrierHome.y) * 0.25 : 0;
  const focus = clampPoint(
    {
      x: carrierHome.x + attDir * surge,
      y: carrierHome.y + pullY,
    },
    10,
    90,
    10,
    90,
  );

  const buildSide = (
    side: Side,
    slots: readonly { readonly x: number; readonly y: number }[],
  ): Point[] => {
    const dir = side === "user" ? 1 : -1;
    const inPossession = side === phase.side;
    return slots.map((slotCoord, slot) => {
      const home = slotPoint(side, slotCoord, line[side]);
      if (slot === 0) {
        return clampPoint(
          {
            x: home.x + (inPossession ? 2.2 * dir : 0.4 * dir),
            y: 50 + (focus.y - 50) * 0.22,
          },
          3,
          97,
          38,
          62,
        );
      }
      if (inPossession && slot === phase.toSlot) {
        return focus;
      }
      if (!inPossession && slot === phase.presserSlot) {
        return clampPoint(
          {
            x: focus.x + attDir * 3.8,
            y: focus.y + (home.y >= focus.y ? 2.6 : -2.6),
          },
          6,
          94,
          8,
          92,
        );
      }
      const d = timeline.drift[side][slot];
      const cadenceX = d ? Math.sin(d.phase + phaseIndex * 1.3) * 2.2 : 0;
      const cadenceY = d ? Math.cos(d.phase + phaseIndex * 0.9) * 2.0 : 0;
      const teamShiftX = (focus.x - 50) * 0.22 + (inPossession ? 5.5 * dir : -4.5 * dir);
      const teamShiftY = (focus.y - 50) * 0.24;
      const isRunner = inPossession && (slot === phase.runners[0] || slot === phase.runners[1]);
      const runnerBoostX = isRunner ? 11 * dir : 0;
      const runnerBoostY = isRunner ? (home.y < 50 ? -3.5 : 3.5) : 0;
      return clampPoint({
        x: home.x + teamShiftX + runnerBoostX + cadenceX,
        y: home.y + teamShiftY + runnerBoostY + cadenceY,
      });
    });
  };

  return {
    user: buildSide("user", userSlots),
    opp: buildSide("opp", oppSlots),
  };
}

type Slots = readonly { readonly x: number; readonly y: number }[];
type Shape = { readonly user: readonly Point[]; readonly opp: readonly Point[] };

function attackDir(side: Side): 1 | -1 {
  return side === "user" ? 1 : -1;
}

/** Where a phase leaves the ball: at the feet of its last receiver, given where everyone stands. */
function carriedBall(phase: PlayPhase, at: Shape): Point {
  const feet = at[phase.side][phase.toSlot] ?? CENTRE;
  return clampPoint({ x: feet.x + attackDir(phase.side) * TOUCH, y: feet.y });
}

/** The slot in `pool` standing nearest a point; the first listed wins a tie. */
function nearestTo(ball: Point, pool: readonly number[], at: readonly Point[]): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const slot of pool) {
    const p = at[slot];
    if (p === undefined) continue;
    const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (dist < bestDist) {
      best = slot;
      bestDist = dist;
    }
  }
  return best;
}

/** The outfield player whose formation spot sits nearest the centre spot takes the kickoff. */
function kickoffTaker(side: Side, slots: Slots, pool: readonly number[]): number {
  const homes = slots.map((slot) => slotPoint(side, slot, 0));
  return nearestTo(CENTRE, pool, homes) ?? pool[0] ?? 5;
}

/** Both teams in their own half, the taker standing over the ball on the centre spot. */
function kickoffShape(kicking: Side, taker: number, userSlots: Slots, oppSlots: Slots): Shape {
  const build = (side: Side, slots: Slots): Point[] =>
    slots.map((slot, i) => {
      if (side === kicking && i === taker) {
        return { x: CENTRE.x - attackDir(side) * TOUCH, y: CENTRE.y };
      }
      const home = slotPoint(side, slot, 0);
      return { x: side === "user" ? Math.min(46, home.x) : Math.max(54, home.x), y: home.y };
    });
  return { user: build("user", userSlots), opp: build("opp", oppSlots) };
}

export function stagePitch(timeline: Timeline, input: StageInput): PitchStage {
  const { clock, active, kicks, motion } = input;
  const userSlots = resolveSlots(input.userSlots);
  const oppSlots = resolveSlots(input.oppSlots);
  const frame = frameAt(timeline, clock);
  const line = frame?.line ?? { user: 0, opp: 0 };
  const b = active?.beat;
  const userXI = [...xiAt(timeline, "user", clock)];
  // The injured player stays down in the slot until the replacement's own beat walks them on.
  if (b?.kind === "injury" && b.player.slot !== null) userXI[b.player.slot] = b.player.species;
  const oppXI = xiAt(timeline, "opp", clock);
  const injured = (side: Side, slot: number): boolean =>
    b?.kind === "injury" && side === "user" && b.player.slot === slot;

  const yellows = { user: new Array<number>(11).fill(0), opp: new Array<number>(11).fill(0) };
  for (const b of timeline.beats) {
    if (b.minute > clock) break;
    if (b.kind === "card" && b.color === "yellow" && b.player.slot !== null) {
      yellows[b.side][b.player.slot] = (yellows[b.side][b.player.slot] ?? 0) + 1;
    }
  }

  const labelOf = (side: Side, slot: number, id: SpeciesId | null): string => {
    if (id !== null) return speciesById(id).name;
    if (side === "opp" && input.oppLabels?.[slot]) return input.oppLabels[slot]!;
    return side === "user" ? `Slot ${slot + 1}` : `No. ${slot + 1}`;
  };

  const highlights = (b: Beat | undefined, side: Side, slot: number): boolean => {
    if (b === undefined) return false;
    if (b.kind === "goal")
      return b.side === side && (b.scorer.slot === slot || b.assist?.slot === slot);
    if (b.kind === "save")
      return (
        (b.side === side && b.keeper.slot === slot) || (b.side !== side && b.attacker.slot === slot)
      );
    if (b.kind === "card") return b.side === side && b.player.slot === slot;
    if (b.kind === "injury" || b.kind === "sub")
      return side === "user" && (b.kind === "injury" ? b.player.slot : b.slot) === slot;
    return false;
  };

  if (!motion) {
    const buildStill = (
      side: Side,
      xi: readonly (SpeciesId | null)[],
      slots: readonly { readonly x: number; readonly y: number }[],
    ): (StagedPlayer | null)[] =>
      xi.map((id, slot) => {
        if (id === null && (side === "user" || !input.oppLabels?.[slot])) return null;
        return {
          side,
          slot,
          species: id,
          name: labelOf(side, slot, id),
          point: slotPoint(side, slots[slot] ?? { x: 50, y: 50 }, line[side]),
          facing: side === "user" ? "right" : "left",
          pose: injured(side, slot) ? "down" : "idle",
          hasBall: false,
          hot: highlights(b, side, slot),
          yellowCards: yellows[side][slot] ?? 0,
          callout: null,
        };
      });
    const userPlayers = buildStill("user", userXI, userSlots);
    const oppPlayers = buildStill("opp", oppXI, oppSlots);
    let ballPoint: Point = { x: 50, y: 50 };
    if (b?.kind === "goal") ballPoint = goalMouth(b.side);
    else if (b?.kind === "save") ballPoint = goalMouth(b.side === "user" ? "opp" : "user");
    return {
      players: { user: userPlayers, opp: oppPlayers },
      ball: { x: ballPoint.x, y: ballPoint.y, loft: 0, spin: 0, effect: null, carrier: null },
      trail: null,
      playCallout: null,
    };
  }

  if (timeline.kicks.length > 0 && clock >= timeline.finalMinute) {
    const taken = kicks > 0;
    const kickIdx = Math.max(0, Math.min(kicks - 1, timeline.kicks.length - 1));
    const kick = timeline.kicks[kickIdx]!;
    const attSide = kick.side;
    const defSide: Side = attSide === "user" ? "opp" : "user";
    const spot: Point = attSide === "user" ? { x: 89, y: 50 } : { x: 11, y: 50 };
    const mouth = goalMouth(attSide);
    const takerSlot =
      kick.taker.slot ??
      (attSide === "user" && kick.taker.species !== null
        ? timeline.userXI.indexOf(kick.taker.species)
        : attSide === "opp" && kick.taker.species !== null
          ? timeline.oppXI.indexOf(kick.taker.species)
          : -1);
    const buildPenSide = (side: Side, xi: readonly (SpeciesId | null)[]): (StagedPlayer | null)[] =>
      xi.map((id, slot) => {
        if (id === null && (side === "user" || !input.oppLabels?.[slot])) return null;
        const isTaker = side === attSide && takerSlot === slot;
        const isKeeper = side === defSide && slot === 0;
        const OwnKeeper = side === attSide && slot === 0;
        const point: Point = isTaker
          ? spot
          : isKeeper
            ? { x: mouth.x === 98 ? 97 : 3, y: !taken ? 50 : kick.scored ? 43 : 54 }
            : OwnKeeper
              ? { x: side === "user" ? 6 : 94, y: 50 }
              : {
                  x: side === "user" ? 46 : 54,
                  y: 18 + slot * 6.2,
                };
        return {
          side,
          slot,
          species: id,
          name: labelOf(side, slot, id),
          point,
          facing: side === "user" ? "right" : "left",
          pose: !taken
            ? "idle"
            : isTaker
              ? kick.scored
                ? "celebrate"
                : "cast"
              : isKeeper
                ? "dive"
                : "idle",
          hasBall: !taken && isTaker,
          hot: isTaker || isKeeper,
          yellowCards: yellows[side][slot] ?? 0,
          callout: null,
        };
      });
    const target: Point = !taken
      ? spot
      : kick.scored
        ? { x: mouth.x, y: 46 }
        : { x: mouth.x === 98 ? 91 : 9, y: 36 };
    return {
      players: { user: buildPenSide("user", userXI), opp: buildPenSide("opp", oppXI) },
      ball: {
        x: target.x,
        y: target.y,
        loft: taken ? 0.25 : 0,
        spin: taken ? (kickIdx + 1) * 360 : 0,
        effect: !taken ? null : kick.scored ? "impact" : "shield",
        carrier: kick.taker,
      },
      trail: taken
        ? {
            from: spot,
            to: target,
            effect: kick.scored ? "impact" : "shield",
            type: null,
            kind: "shot",
            progress: 1,
          }
        : null,
      playCallout: null,
    };
  }

  const shot = input.shot ?? null;
  if (shot !== null && (clock > shot.beat.minute || shot.age > SHOW[shot.beat.kind])) {
    // The clock held on the beat's minute through the staging. Open play resumes from there, after
    // a goal in kickoff shape, and the gap between the staging's last frame and it fades away. A
    // clock still stopped on the minute (a manager stop) resumes nothing until it moves.
    const { beat } = shot;
    const after = beat.minute + RESUME;
    const last = stagePitch(timeline, {
      ...input,
      clock: beat.minute,
      shot: { beat, age: SHOW[beat.kind] },
    });
    const resumed = stagePitch(timeline, { ...input, clock: after, shot: null });
    const playing = stagePitch(timeline, { ...input, clock: Math.max(clock, after), shot: null });
    const t = Math.min(1, Math.max(0, (shot.age - SHOW[beat.kind]) / SETTLE[beat.kind]));
    return settleStage(last, resumed, playing, t);
  }
  const staged = shot === null ? null : shot.beat;
  const goal = staged?.kind === "goal" ? staged : null;
  const save = staged?.kind === "save" ? staged : null;
  const progress = shot === null ? 0 : Math.min(1, shot.age / SHOW[shot.beat.kind]);

  let phaseIdx = Math.max(0, Math.min(timeline.plays.length - 1, Math.floor(clock / PHASE_LEN)));
  // A kickoff starts once the clock moves past its goal, even when the goal ends a phase.
  const atBoundary = timeline.plays[phaseIdx];
  if (phaseIdx > 0 && atBoundary?.kickoff != null && clock <= atBoundary.kickoff) phaseIdx--;
  const phase = timeline.plays[phaseIdx];
  const restart = timeline.plays[phaseIdx + 1];
  // Between a goal and the end of its phase, both teams wait in kickoff shape.
  const waiting = restart?.kickoff != null && clock > restart.kickoff ? restart : undefined;
  const play = waiting === undefined ? phase : undefined;
  const u = phase ? Math.min(1, Math.max(0, (clock - phase.from) / (phase.to - phase.from))) : 0;
  const smoothU = smoothstep(u);

  const kickoffOf = (p: PlayPhase): Shape => kickoffShape(p.side, p.fromSlot, userSlots, oppSlots);
  const wpStart =
    waiting !== undefined
      ? kickoffOf(waiting)
      : phase === undefined
        ? null
        : phase.kickoff !== null
          ? kickoffOf(phase)
          : phaseWaypoint(timeline, Math.max(0, phaseIdx - 1), userSlots, oppSlots);
  const wpEnd =
    waiting !== undefined
      ? wpStart
      : phase !== undefined
        ? phaseWaypoint(timeline, phaseIdx, userSlots, oppSlots)
        : null;
  const prev = timeline.plays[phaseIdx - 1];
  // Where the ball was when this phase began: a turnover carries it from there to the winner.
  const startBall =
    phase === undefined || wpStart === null
      ? null
      : phase.kickoff !== null
        ? CENTRE
        : prev !== undefined
          ? carriedBall(prev, wpStart)
          : null;

  const baseSpot = (side: Side, slot: number): Point => {
    const slots = side === "user" ? userSlots : oppSlots;
    const home = slotPoint(side, slots[slot] ?? { x: 50, y: 50 }, line[side]);
    if (wpStart !== null && wpEnd !== null) {
      const a = wpStart[side][slot] ?? home;
      const c = wpEnd[side][slot] ?? home;
      return lerp(a, c, smoothU);
    }
    const d = timeline.drift[side][slot];
    return d === undefined ? home : driftPoint(home, d, clock, true);
  };

  const userPoints = userSlots.map((_, slot) => baseSpot("user", slot));
  const oppPoints = oppSlots.map((_, slot) => baseSpot("opp", slot));
  const pts = { user: userPoints, opp: oppPoints };

  let ballPos = ambientBall(timeline, clock, true);
  let ballLoft = 0;
  let ballEffect: Effect | null = null;
  let carrier: PitchRef | null = null;
  let trail: BallTrail | null = null;
  let playCalloutStage: PitchStage["playCallout"] = null;

  if (waiting !== undefined) {
    ballPos = CENTRE;
    carrier = {
      side: waiting.side,
      slot: waiting.fromSlot,
      species: (waiting.side === "user" ? userXI : oppXI)[waiting.fromSlot] ?? null,
      name: labelOf(
        waiting.side,
        waiting.fromSlot,
        (waiting.side === "user" ? userXI : oppXI)[waiting.fromSlot] ?? null,
      ),
    };
  } else if (phase !== undefined) {
    const attDir = phase.side === "user" ? 1 : -1;
    const fromSpot = pts[phase.side][phase.fromSlot] ?? { x: 50, y: 50 };
    const toSpot = pts[phase.side][phase.toSlot] ?? fromSpot;
    if (phase.fromSlot === phase.toSlot) {
      const stride = 1.6 + 0.5 * Math.sin(u * Math.PI * 2);
      ballPos = clampPoint({ x: toSpot.x + attDir * stride, y: toSpot.y });
      ballLoft = Math.abs(Math.sin(u * Math.PI * 2)) * 0.12;
      carrier = {
        side: phase.side,
        slot: phase.toSlot,
        species: (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
        name: labelOf(
          phase.side,
          phase.toSlot,
          (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
        ),
      };
      if (phase.callout !== null) {
        ballEffect = phase.callout.effect;
        trail = {
          from: { x: toSpot.x - attDir * 5, y: toSpot.y },
          to: ballPos,
          effect: phase.callout.effect,
          type: phase.callout.type,
          kind: "dribble",
          progress: u,
        };
      }
    } else if (u < 0.24) {
      ballPos = clampPoint({ x: fromSpot.x + attDir * 1.6, y: fromSpot.y });
      carrier = phase.actor;
      if (phase.callout !== null) ballEffect = phase.callout.effect;
    } else if (u <= PASS_LANDS) {
      // An even pace: the lowest top speed that still lands the pass, so a long ball crosses the
      // pitch over many frames instead of a few.
      const flight = (u - 0.24) / (PASS_LANDS - 0.24);
      ballPos = lerp(fromSpot, toSpot, flight);
      const peakLoft = phase.kind === "cross" ? 0.85 : phase.kind === "through" ? 0.5 : 0.22;
      ballLoft = Math.sin(flight * Math.PI) * peakLoft;
      ballEffect = phase.callout?.effect ?? null;
      carrier =
        flight < 0.5
          ? phase.actor
          : {
              side: phase.side,
              slot: phase.toSlot,
              species: (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
              name: labelOf(
                phase.side,
                phase.toSlot,
                (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
              ),
            };
      trail = {
        from: fromSpot,
        to: ballPos,
        effect: phase.callout?.effect ?? null,
        type: phase.callout?.type ?? null,
        kind: "pass",
        progress: flight,
      };
    } else {
      ballPos = clampPoint({ x: toSpot.x + attDir * 1.6, y: toSpot.y });
      carrier = {
        side: phase.side,
        slot: phase.toSlot,
        species: (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
        name: labelOf(
          phase.side,
          phase.toSlot,
          (phase.side === "user" ? userXI : oppXI)[phase.toSlot] ?? null,
        ),
      };
    }

    if (phase.kind === "duel" && startBall !== null && u < TACKLE) {
      ballPos = lerp(startBall, ballPos, smoothstep(u / TACKLE));
    }

    if (phase.callout !== null && phase.moment !== null && u >= 0.12 && u <= 0.88) {
      playCalloutStage = {
        side: phase.side,
        slot: phase.fromSlot,
        species: phase.actor.species,
        point: fromSpot,
        callout: phase.callout,
        kind: phase.kind,
        moment: phase.moment,
      };
    }
  }

  // A goal or a save takes the ball from wherever the pitch has it: open play, or the last shot
  // still settling.
  const handover = shot?.before ? stagePitch(timeline, { ...input, shot: shot.before }).ball : null;
  const liveBall = handover === null ? ballPos : { x: handover.x, y: handover.y };
  if (goal !== null) {
    const b = goal;
    const attDir = attackDir(b.side);
    const mouth = goalMouth(b.side);
    const scorerSlot = b.scorer.slot;
    const assistSlot = b.assist?.slot ?? null;
    const setPiece =
      b.goalKind === "penalty"
        ? penaltySpot(b.side)
        : b.goalKind === "free-kick"
          ? freeKickSpot(b.side)
          : null;
    if (scorerSlot !== null && pts[b.side][scorerSlot]) {
      const baseScorer = pts[b.side][scorerSlot]!;
      const targetScorer =
        setPiece !== null
          ? { x: setPiece.x - attDir * 3, y: setPiece.y }
          : clampPoint({
              x: b.side === "user" ? 82 : 18,
              y: 50 + (baseScorer.y - 50) * 0.45,
            });
      pts[b.side][scorerSlot] = lerp(baseScorer, targetScorer, Math.min(1, progress * 1.8));
    }
    if (assistSlot !== null && pts[b.side][assistSlot]) {
      const baseAssist = pts[b.side][assistSlot]!;
      pts[b.side][assistSlot] = clampPoint({
        x: baseAssist.x + attDir * 6,
        y: baseAssist.y,
      });
    }
    const defSide: Side = b.side === "user" ? "opp" : "user";
    if (pts[defSide][0]) {
      pts[defSide][0] = {
        x: mouth.x === 98 ? 96.5 : 3.5,
        y: progress > 0.35 ? 43 : 50,
      };
    }
    const scorerSpot =
      scorerSlot !== null && pts[b.side][scorerSlot]
        ? pts[b.side][scorerSlot]!
        : { x: b.side === "user" ? 80 : 20, y: 50 };
    const shotSpot = setPiece ?? scorerSpot;
    ballPos = goalBall(liveBall, shotSpot, mouth, progress);
    ballLoft =
      progress < 0.35
        ? Math.sin((progress / 0.35) * Math.PI) * 0.35
        : progress < 0.65
          ? Math.sin(((progress - 0.35) / 0.3) * Math.PI) * 0.85
          : 0;
    ballEffect = b.callout.effect;
    carrier = progress < 0.35 && b.assist ? b.assist : b.scorer;
    trail =
      progress < 0.35
        ? {
            from: liveBall,
            to: ballPos,
            effect: null,
            type: null,
            kind: "pass",
            progress: progress / 0.35,
          }
        : {
            from: shotSpot,
            to: ballPos,
            effect: b.callout.effect,
            type: b.callout.type,
            kind: "shot",
            progress: Math.min(1, (progress - 0.35) / 0.3),
          };
  } else if (save !== null) {
    const b = save;
    const attSide: Side = b.side === "user" ? "opp" : "user";
    const mouth = goalMouth(attSide);
    const attSlot = b.attacker.slot;
    // Where the shooter strikes: the ball meets them there, then flies at the keeper.
    let strike: Point = { x: attSide === "user" ? 76 : 24, y: 42 };
    if (attSlot !== null && pts[attSide][attSlot]) {
      const baseAtt = pts[attSide][attSlot]!;
      const shootSpot = clampPoint({
        x: attSide === "user" ? 78 : 22,
        y: 50 + (baseAtt.y - 50) * 0.5,
      });
      strike = lerp(baseAtt, shootSpot, Math.min(1, SAVE_STRIKE * 2));
      pts[attSide][attSlot] = lerp(baseAtt, shootSpot, Math.min(1, progress * 2));
    }
    const attackerSpot =
      attSlot !== null && pts[attSide][attSlot] ? pts[attSide][attSlot]! : strike;
    const keeperSlot = b.keeper.slot ?? 0;
    if (pts[b.side][keeperSlot]) {
      pts[b.side][keeperSlot] = {
        x: mouth.x === 98 ? 96.5 : 3.5,
        y: 50 + (attackerSpot.y - 50) * 0.18,
      };
    }
    // The parry falls back into open play: to where the ball goes on once the clock resumes.
    const resumed = stagePitch(timeline, { ...input, clock: b.minute + RESUME, shot: null }).ball;
    ballPos = saveBall(liveBall, strike, mouth, { x: resumed.x, y: resumed.y }, progress);
    ballLoft = progress < SAVE_REACH ? Math.sin((progress / SAVE_REACH) * Math.PI) * 0.65 : 0.25;
    ballEffect = b.callout.effect;
    carrier = progress < SAVE_REACH ? b.attacker : b.keeper;
    trail = {
      from: progress < SAVE_STRIKE ? liveBall : progress < SAVE_REACH ? strike : mouth,
      to: ballPos,
      effect: b.callout.effect,
      type: b.callout.type,
      kind: "save",
      progress,
    };
  }
  if (staged !== null) playCalloutStage = null;

  if (b?.kind === "sub" && pts.user[b.slot]) {
    pts.user[b.slot] = lerp({ x: 50, y: 94 }, pts.user[b.slot]!, smoothstep(active?.progress ?? 0));
  }

  const buildStagedSide = (
    side: Side,
    xi: readonly (SpeciesId | null)[],
  ): (StagedPlayer | null)[] =>
    xi.map((id, slot) => {
      if (id === null && (side === "user" || !input.oppLabels?.[slot])) return null;
      const point = pts[side][slot] ?? { x: 50, y: 50 };
      const prevPoint = wpStart?.[side][slot] ?? point;
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      const dist = Math.hypot(dx, dy);
      const hasBall = carrier?.side === side && carrier.slot === slot;
      const isCaster =
        (goal !== null &&
          goal.side === side &&
          goal.scorer.slot === slot &&
          progress >= 0.3 &&
          progress <= 0.68) ||
        (save !== null &&
          save.side !== side &&
          save.attacker.slot === slot &&
          progress < SAVE_REACH) ||
        (playCalloutStage?.side === side && playCalloutStage.slot === slot);

      let pose: PlayerPose = dist > 9 ? "sprint" : dist > 2.5 ? "run" : "idle";
      if (injured(side, slot)) {
        pose = "down";
      } else if (
        goal !== null &&
        goal.side === side &&
        (goal.scorer.slot === slot || goal.assist?.slot === slot) &&
        progress > 0.65
      ) {
        pose = "celebrate";
      } else if (
        (save !== null && save.side === side && save.keeper.slot === slot) ||
        (goal !== null && goal.side !== side && slot === 0 && progress > 0.35)
      ) {
        pose = "dive";
      } else if (isCaster) {
        pose = "cast";
      } else if (hasBall) {
        pose = "dribble";
      } else if (
        (b?.kind === "card" && b.side === side && b.player.slot === slot) ||
        (play !== undefined && play.side !== side && play.presserSlot === slot)
      ) {
        pose = "press";
      } else if (
        play !== undefined &&
        play.side === side &&
        (play.runners[0] === slot || play.runners[1] === slot)
      ) {
        pose = "sprint";
      }

      const defaultFacing = side === "user" ? "right" : "left";
      const facing: "left" | "right" =
        Math.abs(dx) > 1.2 ? (dx >= 0 ? "right" : "left") : defaultFacing;

      return {
        side,
        slot,
        species: id,
        name: labelOf(side, slot, id),
        point,
        facing,
        pose,
        hasBall,
        hot: highlights(b, side, slot) || highlights(staged ?? undefined, side, slot) || hasBall,
        yellowCards: yellows[side][slot] ?? 0,
        callout:
          playCalloutStage?.side === side && playCalloutStage.slot === slot
            ? playCalloutStage.callout
            : null,
      };
    });

  return {
    players: {
      user: buildStagedSide("user", userXI),
      opp: buildStagedSide("opp", oppXI),
    },
    ball: {
      x: ballPos.x,
      y: ballPos.y,
      loft: ballLoft,
      spin: Math.round(clock * 290),
      effect: ballEffect,
      carrier,
    },
    trail,
    playCallout: b === undefined ? playCalloutStage : null,
  };
}

/**
 * Open play as it runs on, still carrying `1 - t` (eased) of the gap between a staging's last frame
 * and the open play it resumed into. The gap is fixed, so the pull never grows with how fast play
 * runs away; the ball draws no trail until it rejoins play.
 */
function settleStage(
  last: PitchStage,
  resumed: PitchStage,
  playing: PitchStage,
  t: number,
): PitchStage {
  const left = 1 - smoothstep(t);
  const carry = (now: Point, from: Point | undefined, to: Point | undefined): Point =>
    from === undefined || to === undefined
      ? now
      : { x: now.x + (from.x - to.x) * left, y: now.y + (from.y - to.y) * left };
  const side = (s: Side): (StagedPlayer | null)[] =>
    playing.players[s].map((p, slot) =>
      p === null
        ? p
        : {
            ...p,
            point: carry(p.point, last.players[s][slot]?.point, resumed.players[s][slot]?.point),
          },
    );
  const ball = carry(playing.ball, last.ball, resumed.ball);
  return {
    players: { user: side("user"), opp: side("opp") },
    ball: {
      ...playing.ball,
      x: ball.x,
      y: ball.y,
      loft: Math.max(0, playing.ball.loft + (last.ball.loft - resumed.ball.loft) * left),
    },
    trail: left > 0 ? null : playing.trail,
    playCallout: playing.playCallout,
  };
}
