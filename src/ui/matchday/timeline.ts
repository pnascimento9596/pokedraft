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
import { TIRED_REACH, energyAt, isTired, type EnergyWindow } from "./fatigue";
import { stageKick, waitingPoint } from "./shootout";

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
// The build-up share and the callout gap are tuned for 90 minutes. Extra time scales both, so a
// 120' match calls about as many moves as a 90' one.
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
    const length = finalMinute / 90;
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
            : buildUpRoll < BUILD_UP_SHARE / length
              ? "build-up"
              : null;
      const moment =
        candidate === "key-duel" ||
        (candidate !== null && from - lastCallout >= CALLOUT_GAP * length)
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
/** The share of a goal's staging at which the scorer strikes the ball. */
const STRIKE = 0.35;
/** A set piece: by now the ball sits on its spot, the taker waits at the run-up, a wall has formed. */
const SET_PLACED = 0.18;
/** A set piece: the taker has stepped up to the ball, and pauses there until the strike. */
const STEPPED_UP = 0.27;
/** A header: the ball has gone out wide and the cross starts. */
const CROSS_FROM = 0.2;
/** How high the ball is when a header meets it. */
const CROSS_LOFT = 0.85;
/** How far behind the ball a set-piece taker starts the run-up. */
const RUN_UP = 5;
/** A free kick's wall: how far toward goal it stands, and the gap between its three players. */
const WALL_GAP = 9;
const WALL_SPACING = 4;
/** How far a free kick's curve bows off the straight line, as its control point's offset. */
const CURL = 14;
/** How far a solo run swerves around the defender who steps in. */
const SWERVE = 5;
const SOLO_TOUCHES = 4;
/** A solo run: by now the scorer has the ball at their feet, and the defender has stepped in. */
const SOLO_GATHER = 0.1;
const PRESSER_IN = 0.2;

/**
 * How long the pitch takes to settle after a goal or a save leaves it, in real milliseconds at 1x.
 * A save can leave its shooter most of the pitch from open play, so it eases back as slowly as a
 * goal does.
 */
export const SETTLE: Readonly<Record<"goal" | "save", number>> = { goal: 600, save: 600 };
/** The share of the way back to open play a parry carries the ball; the settle carries the rest. */
const PARRY = 0.5;

/** A goal move as it plays: from the live ball to the shot, the shot, then the ball in the net. */
export function goalBall(from: Point, shot: Point, mouth: Point, progress: number): Point {
  if (progress < STRIKE) return lerp(from, shot, progress / STRIKE);
  if (progress < GOAL_LANDS) return lerp(shot, mouth, (progress - STRIKE) / (GOAL_LANDS - STRIKE));
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
  /** The beat's minute: a player going off leaves from where that moment found them. */
  readonly minute: number;
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
  /** Energy 0 to 100 from the latest window; null for the opponent and anyone with no window. */
  readonly energy: number | null;
}

export interface BallTrail {
  readonly from: Point;
  readonly to: Point;
  readonly effect: Effect | null;
  readonly type: PokemonType | null;
  readonly kind: "pass" | "cross" | "shot" | "save" | "dribble";
  readonly progress: number;
  /** The control point of the curve drawn from `from` to `to`, when the ball bends. */
  readonly via?: Point;
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
  /** How far through the kick in progress the shootout is, 0 to 1 (see `kickProgress`). */
  readonly kickProgress?: number;
  readonly motion: boolean;
  readonly userSlots: FormationId | readonly { readonly x: number; readonly y: number }[];
  readonly oppSlots: FormationId | readonly { readonly x: number; readonly y: number }[];
  readonly oppLabels?: readonly string[];
  /** The goal or save the ball is acting out, or settling back from; null in open play. */
  readonly shot?: Shot | null;
  /** Players walking on or off; none with motion off. */
  readonly walks?: readonly Walk[];
  /** The match's window snapshots, for the user's energy; none on an engine that kept none. */
  readonly windows?: readonly EnergyWindow[];
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

/** How deep from its own goal line a team's kickoff shape starts squeezing players together. */
const KICKOFF_SQUEEZE = 36;

/** Both teams in their own half, the taker standing over the ball on the centre spot. */
function kickoffShape(kicking: Side, taker: number, userSlots: Slots, oppSlots: Slots): Shape {
  const build = (side: Side, slots: Slots): Point[] =>
    slots.map((slot, i) => {
      if (side === kicking && i === taker) {
        return { x: CENTRE.x - attackDir(side) * TOUCH, y: CENTRE.y };
      }
      const home = slotPoint(side, slot, 0);
      const depth = side === "user" ? home.x : 100 - home.x;
      // Everyone ahead of the midfield line squeezes into it in order, so no two stack up.
      const held =
        depth <= KICKOFF_SQUEEZE ? depth : KICKOFF_SQUEEZE + (depth - KICKOFF_SQUEEZE) / 7;
      return { x: side === "user" ? held : 100 - held, y: home.y };
    });
  return { user: build("user", userSlots), opp: build("opp", oppSlots) };
}

/** The phase a clock falls in, and the restart both teams wait for in kickoff shape after a goal. */
function phaseAt(
  timeline: Pick<Timeline, "plays">,
  clock: number,
): { readonly idx: number; readonly phase?: PlayPhase; readonly waiting?: PlayPhase } {
  let idx = Math.max(0, Math.min(timeline.plays.length - 1, Math.floor(clock / PHASE_LEN)));
  // A kickoff starts once the clock moves past its goal, even when the goal ends a phase.
  const atBoundary = timeline.plays[idx];
  if (idx > 0 && atBoundary?.kickoff != null && clock <= atBoundary.kickoff) idx--;
  const restart = timeline.plays[idx + 1];
  const waiting = restart?.kickoff != null && clock > restart.kickoff ? restart : undefined;
  return { idx, phase: timeline.plays[idx], waiting };
}

/** A cubic Hermite segment from `a` to `b` with end tangents `ta` and `tb`, per unit of `u`. */
function hermite(a: Point, ta: Point, b: Point, tb: Point, u: number): Point {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = 3 * u2 - 2 * u3;
  const h11 = u3 - u2;
  return {
    x: h00 * a.x + h10 * ta.x + h01 * b.x + h11 * tb.x,
    y: h00 * a.y + h10 * ta.y + h01 * b.y + h11 * tb.y,
  };
}

/** Half the step from `a` to `b`: a Catmull-Rom tangent; none without a neighbour. */
function tangent(a: Point | undefined, b: Point | undefined): Point {
  return a === undefined || b === undefined
    ? { x: 0, y: 0 }
    : { x: (b.x - a.x) / 2, y: (b.y - a.y) / 2 };
}

/** The closest two teammates may stand, in percent of the pitch length. */
const PERSONAL_SPACE = 4;
/** The pitch is drawn 100 long by 64 wide, so a step across counts 0.64 of one along it. */
const ACROSS = 0.64;

/**
 * Under this distance the push fades out toward nothing. A push that always restored the full
 * spacing would flip sides in one frame when two teammates' paths cross; the fade spreads that
 * swap over the frames the crossing takes.
 */
const CROSSING = PERSONAL_SPACE / 2;

/**
 * One pass over every pair of teammates, in slot order: a pair closer than `PERSONAL_SPACE` steps
 * apart along the line between them, half the shortfall each, fading out below `CROSSING`.
 */
function pushApart(points: readonly Point[]): Point[] {
  const out = points.map((p) => ({ x: p.x, y: p.y * ACROSS }));
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]!;
      const b = out[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= PERSONAL_SPACE || dist === 0) continue;
      const [nx, ny] = [dx / dist, dy / dist];
      const half = ((PERSONAL_SPACE - dist) / 2) * Math.min(1, dist / CROSSING);
      out[i] = { x: a.x - nx * half, y: a.y - ny * half };
      out[j] = { x: b.x + nx * half, y: b.y + ny * half };
    }
  }
  return out.map((p) => ({ x: p.x, y: p.y / ACROSS }));
}

/** How many phases back a tired player's shortfall is carried. */
const TIRED_DEPTH = 4;
/** How far back the pose and facing look to read a player's velocity, in match minutes. */
const LOOK_BACK = 0.02;
/** Speeds that turn a stroll into a run and a run into a sprint, in pitch percent per minute. */
const RUN_SPEED = 2;
const SPRINT_SPEED = 7.2;
/** Sideways speed under which a player keeps facing the goal they attack. */
const TURN_SPEED = 1;
/** The share of a goal or save staging over which the keeper and the assist react. */
const REACT = 0.2;
/** Where a substitute walks on from. */
const BENCH: Point = { x: 50, y: 94 };

/** Which way a player looks: along their sideways speed, else at the goal they attack. */
function facingFor(side: Side, sideways: number): "left" | "right" {
  if (Math.abs(sideways) > TURN_SPEED) return sideways > 0 ? "right" : "left";
  return side === "user" ? "right" : "left";
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
  const windows = input.windows ?? [];
  const energyOf = (side: Side, slot: number, id: SpeciesId | null, minute: number) =>
    side === "user" ? energyAt(windows, slot, id, minute) : null;

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
          energy: energyOf(side, slot, id, clock),
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
    // The kick in progress, or the last kick's reaction held once the shootout is over.
    const done = kicks >= timeline.kicks.length;
    const kick = timeline.kicks[done ? timeline.kicks.length - 1 : kicks]!;
    const staged = stageKick(kick, done ? 1 : (input.kickProgress ?? 0));
    const attSide = kick.side;
    const defSide: Side = attSide === "user" ? "opp" : "user";
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
        const point: Point = isTaker
          ? staged.taker.point
          : isKeeper
            ? staged.keeper.point
            : slot === 0
              ? { x: side === "user" ? 6 : 94, y: 50 }
              : waitingPoint(side, slot);
        return {
          side,
          slot,
          species: id,
          name: labelOf(side, slot, id),
          point,
          facing: side === "user" ? "right" : "left",
          pose: isTaker ? staged.taker.pose : isKeeper ? staged.keeper.pose : "idle",
          hasBall: isTaker && staged.taker.hasBall,
          hot: isTaker || isKeeper,
          yellowCards: yellows[side][slot] ?? 0,
          callout: null,
          energy: null,
        };
      });
    return {
      players: { user: buildPenSide("user", userXI), opp: buildPenSide("opp", oppXI) },
      ball: {
        x: staged.ball.point.x,
        y: staged.ball.point.y,
        loft: staged.ball.loft,
        spin: staged.ball.spin,
        effect: staged.ball.effect,
        carrier: kick.taker,
      },
      trail: staged.trail,
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

  const { idx: phaseIdx, phase, waiting } = phaseAt(timeline, clock);
  const play = waiting === undefined ? phase : undefined;
  const u = phase ? Math.min(1, Math.max(0, (clock - phase.from) / (phase.to - phase.from))) : 0;

  const kickoffOf = (p: PlayPhase): Shape => kickoffShape(p.side, p.fromSlot, userSlots, oppSlots);
  const raw = new Map<number, Shape>();
  const rawWaypoint = (i: number): Shape => {
    let shape = raw.get(i);
    if (shape === undefined) {
      shape = phaseWaypoint(timeline, i, userSlots, oppSlots);
      raw.set(i, shape);
    }
    return shape;
  };
  // A tired player covers `TIRED_REACH` of the way from where they start a phase to its waypoint,
  // so they fall behind play. Where they start is itself short of the last waypoint, back
  // `TIRED_DEPTH` phases; what is left beyond that is under 0.15^4 of a move. Each waypoint is a
  // fixed function of its index, so the spline through them stays continuous.
  const reached = new Map<string, Shape>();
  const waypoint = (i: number, depth = TIRED_DEPTH): Shape => {
    const p = timeline.plays[i];
    if (depth === 0 || p === undefined || windows.length === 0) return rawWaypoint(i);
    const key = `${i}:${depth}`;
    const known = reached.get(key);
    if (known !== undefined) return known;
    const xi = xiAt(timeline, "user", p.from);
    const shape = rawWaypoint(i);
    let out = shape;
    if (xi.some((id, slot) => isTired(energyAt(windows, slot, id, p.from)))) {
      const from = startShape(i, depth - 1);
      out = {
        user: shape.user.map((to, slot) =>
          isTired(energyAt(windows, slot, xi[slot] ?? null, p.from)) && from.user[slot]
            ? lerp(from.user[slot]!, to, TIRED_REACH)
            : to,
        ),
        opp: shape.opp,
      };
    }
    reached.set(key, out);
    return out;
  };
  // Where everyone stands as phase `i` begins: kickoff shape after a goal, else where the last
  // phase left them.
  const startShape = (i: number, depth = TIRED_DEPTH): Shape => {
    const p = timeline.plays[i];
    return p?.kickoff != null ? kickoffOf(p) : waypoint(Math.max(0, i - 1), depth);
  };
  const spaced = (shape: Shape): Shape => ({
    user: pushApart(shape.user),
    opp: pushApart(shape.opp),
  });
  // Open play at any clock: a Catmull-Rom spline through the waypoints, so players carry their
  // speed from one phase into the next. A kickoff, the opening phase and the phase before a
  // kickoff start or end at rest.
  const shapeAt = (c: number): Shape => {
    const at = phaseAt(timeline, c);
    if (at.waiting !== undefined) return spaced(kickoffOf(at.waiting));
    const p = at.phase;
    if (p === undefined) {
      const homes = (side: Side, slots: Slots): Point[] =>
        slots.map((slot, i) => {
          const home = slotPoint(side, slot, line[side]);
          const d = timeline.drift[side][i];
          return d === undefined ? home : driftPoint(home, d, c, true);
        });
      return spaced({ user: homes("user", userSlots), opp: homes("opp", oppSlots) });
    }
    const from = startShape(at.idx);
    const to = waypoint(at.idx);
    const before = p.kickoff !== null || at.idx === 0 ? null : startShape(at.idx - 1);
    const next = timeline.plays[at.idx + 1];
    const after = next !== undefined && next.kickoff === null ? waypoint(at.idx + 1) : null;
    const k = Math.min(1, Math.max(0, (c - p.from) / (p.to - p.from)));
    const curve = (side: Side): Point[] =>
      to[side].map((b, slot) => {
        const a = from[side][slot] ?? b;
        const ta = tangent(before?.[side][slot], b);
        const tb = tangent(a, after?.[side][slot]);
        return clampPoint(hermite(a, ta, b, tb, k), 3, 97, 4, 96);
      });
    return spaced({ user: curve("user"), opp: curve("opp") });
  };

  const prev = timeline.plays[phaseIdx - 1];
  // Where the ball was when this phase began: a turnover carries it from there to the winner.
  const startBall =
    phase === undefined || waiting !== undefined
      ? null
      : phase.kickoff !== null
        ? CENTRE
        : prev !== undefined
          ? carriedBall(prev, spaced(startShape(phaseIdx)))
          : null;

  const here = shapeAt(clock);
  const back = shapeAt(Math.max(0, clock - LOOK_BACK));
  const velocity = (side: Side, slot: number): Point => {
    const a = back[side][slot];
    const c = here[side][slot];
    return a === undefined || c === undefined
      ? { x: 0, y: 0 }
      : { x: (c.x - a.x) / LOOK_BACK, y: (c.y - a.y) / LOOK_BACK };
  };
  const pts = { user: [...here.user], opp: [...here.opp] };

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
      // A duel's winner runs on after the tackle, so their pass leaves from where they won the
      // ball instead of riding the run.
      const won =
        phase.kind === "duel"
          ? shapeAt(phase.from + TACKLE * (phase.to - phase.from))[phase.side][phase.fromSlot]
          : undefined;
      const release =
        won === undefined ? fromSpot : clampPoint({ x: won.x + attDir * TOUCH, y: won.y });
      ballPos = lerp(release, toSpot, flight);
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
        from: release,
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

  const present = (side: Side, slot: number): boolean =>
    pts[side][slot] !== undefined &&
    ((side === "user" ? userXI : oppXI)[slot] != null ||
      (side === "opp" && Boolean(input.oppLabels?.[slot])));
  const refAt = (side: Side, slot: number): PitchRef => {
    const id = (side === "user" ? userXI : oppXI)[slot] ?? null;
    return { side, slot, species: id, name: labelOf(side, slot, id) };
  };
  let goalStage: GoalStage | null = null;

  // A goal or a save takes the ball from wherever the pitch has it: open play, or the last shot
  // still settling.
  const handover = shot?.before ? stagePitch(timeline, { ...input, shot: shot.before }).ball : null;
  const liveBall = handover === null ? ballPos : { x: handover.x, y: handover.y };
  if (goal !== null) {
    goalStage = stageGoal(goal, progress, liveBall, pts, present, refAt);
    ballPos = goalStage.ball;
    ballLoft = goalStage.loft;
    ballEffect = goal.callout.effect;
    carrier = goalStage.carrier;
    trail = goalStage.trail;
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
      const set = { x: mouth.x === 98 ? 96.5 : 3.5, y: 50 + (attackerSpot.y - 50) * 0.18 };
      pts[b.side][keeperSlot] = lerp(pts[b.side][keeperSlot]!, set, smoothstep(progress / REACT));
    }
    // The parry falls back toward open play, where the ball goes on once the clock resumes.
    const resumed = stagePitch(timeline, { ...input, clock: b.minute + RESUME, shot: null }).ball;
    const parried = lerp(mouth, { x: resumed.x, y: resumed.y }, PARRY);
    ballPos = saveBall(liveBall, strike, mouth, parried, progress);
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

  const walks = input.walks ?? [];
  const xiOf = (side: Side) => (side === "user" ? userXI : oppXI);
  // A substitute on their way on, whatever banner shows meanwhile.
  const walkingOn = (side: Side, slot: number): Walk | undefined =>
    walks.find(
      (w) => w.dir === "on" && w.side === side && w.slot === slot && xiOf(side)[slot] === w.species,
    );
  for (const w of walks) {
    const spot = pts[w.side][w.slot];
    if (spot !== undefined && walkingOn(w.side, w.slot) === w) {
      pts[w.side][w.slot] = lerp(BENCH, spot, smoothstep(w.progress));
    }
  }

  // An injured player stays down where the injury found them, so they walk off from that
  // spot. Play, and the ball, carry on around them.
  if (b?.kind === "injury" && b.player.slot !== null) {
    const down = shapeAt(b.minute).user[b.player.slot];
    if (down !== undefined) pts.user[b.player.slot] = down;
  }

  const buildStagedSide = (
    side: Side,
    xi: readonly (SpeciesId | null)[],
  ): (StagedPlayer | null)[] =>
    xi.map((id, slot) => {
      if (id === null && (side === "user" || !input.oppLabels?.[slot])) return null;
      const point = pts[side][slot] ?? { x: 50, y: 50 };
      const v = velocity(side, slot);
      const speed = Math.hypot(v.x, v.y);
      const comingOn = walkingOn(side, slot);
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

      let pose: PlayerPose = speed > SPRINT_SPEED ? "sprint" : speed > RUN_SPEED ? "run" : "idle";
      const inWall = goal !== null && goal.side !== side && goalStage?.wall.includes(slot);
      if (injured(side, slot)) {
        pose = "down";
      } else if (comingOn !== undefined && comingOn.progress < 1) {
        pose = "run";
      } else if (inWall) {
        pose = progress >= SET_PLACED ? "idle" : "run";
      } else if (goal !== null && goal.side !== side && goalStage?.beaten === slot) {
        pose = "press";
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

      const sideways = comingOn !== undefined && comingOn.progress < 1 ? point.x - BENCH.x : v.x;
      // A wall keeps its side's facing while it shuffles into place.
      const facing = inWall ? (side === "user" ? "right" : "left") : facingFor(side, sideways);

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
        energy: energyOf(side, slot, id, clock),
      };
    });

  // Sent off or substituted: from their spot in the shape at the beat to the nearer touchline,
  // in a straight line while play runs on without them.
  const leaving = walks.flatMap((w): StagedPlayer[] => {
    const spot = (w.minute === clock ? here : shapeAt(w.minute))[w.side][w.slot];
    const home = (w.side === "user" ? userSlots : oppSlots)[w.slot];
    if (w.dir !== "off" || spot === undefined || home === undefined) return [];
    const edge = { x: spot.x, y: slotPoint(w.side, home, 0).y < 50 ? 0 : 100 };
    return [
      {
        side: w.side,
        slot: w.slot,
        species: w.species,
        name: w.name,
        point: lerp(spot, edge, smoothstep(w.progress)),
        facing: facingFor(w.side, 0),
        pose: "run",
        hasBall: false,
        hot: false,
        yellowCards: 0,
        callout: null,
        energy: null,
      },
    ];
  });

  return {
    players: {
      user: buildStagedSide("user", userXI),
      opp: buildStagedSide("opp", oppXI),
    },
    leaving,
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

type GoalBeat = Extract<Beat, { kind: "goal" }>;

/** A goal as the pitch acts it out at one moment, by the kind the engine recorded. */
interface GoalStage {
  readonly ball: Point;
  readonly loft: number;
  readonly carrier: PitchRef;
  readonly trail: BallTrail | null;
  /** The defenders lined up in a free kick's wall. */
  readonly wall: readonly number[];
  /** The defender a solo run goes past. */
  readonly beaten: number | null;
}

function bezier(a: Point, c: Point, b: Point, t: number): Point {
  const k = Math.min(1, Math.max(0, t));
  const m = 1 - k;
  return {
    x: m * m * a.x + 2 * m * k * c.x + k * k * b.x,
    y: m * m * a.y + 2 * m * k * c.y + k * k * b.y,
  };
}

/** The outfield players of a side nearest a point, nearest first; a tie goes to the lower slot. */
function nearestOutfield(
  at: readonly Point[],
  side: Side,
  to: Point,
  present: (side: Side, slot: number) => boolean,
  exclude: number | null,
): number[] {
  const away = (slot: number) => Math.hypot(at[slot]!.x - to.x, at[slot]!.y - to.y);
  return at
    .map((_, slot) => slot)
    .filter((slot) => slot !== 0 && slot !== exclude && present(side, slot))
    .sort((a, b) => away(a) - away(b) || a - b);
}

/**
 * Stages a goal by its kind, moving the players it involves in `pts`. Every kind strikes the ball
 * at `STRIKE` and has it over the line at `GOAL_LANDS`, starting from the live ball.
 */
function stageGoal(
  goal: GoalBeat,
  progress: number,
  live: Point,
  pts: { readonly user: Point[]; readonly opp: Point[] },
  present: (side: Side, slot: number) => boolean,
  refAt: (side: Side, slot: number) => PitchRef,
): GoalStage {
  const side = goal.side;
  const attDir = attackDir(side);
  const defSide: Side = side === "user" ? "opp" : "user";
  const mouth = goalMouth(side);
  const scorerSlot =
    goal.scorer.slot !== null && pts[side][goal.scorer.slot] ? goal.scorer.slot : null;
  const scorerBase =
    scorerSlot === null ? { x: side === "user" ? 80 : 20, y: 50 } : pts[side][scorerSlot]!;
  const moveScorer = (p: Point) => {
    if (scorerSlot !== null) pts[side][scorerSlot] = p;
  };
  if (pts[defSide][0]) {
    const dive = smoothstep((progress - STRIKE) / REACT);
    pts[defSide][0] = lerp(
      pts[defSide][0]!,
      { x: mouth.x === 98 ? 96.5 : 3.5, y: 50 - 7 * dive },
      smoothstep(progress / REACT),
    );
  }
  const flight = Math.min(1, Math.max(0, (progress - STRIKE) / (GOAL_LANDS - STRIKE)));
  const shot = (from: Point, to: Point, via?: Point): BallTrail => ({
    from,
    to,
    effect: goal.callout.effect,
    type: goal.callout.type,
    kind: "shot",
    progress: Math.min(1, (progress - STRIKE) / 0.3),
    ...(via === undefined ? {} : { via }),
  });
  const quiet = { wall: [], beaten: null } as const;

  switch (goal.goalKind) {
    case "penalty":
    case "free-kick": {
      const spot = goal.goalKind === "penalty" ? penaltySpot(side) : freeKickSpot(side);
      const runUp = { x: spot.x - attDir * RUN_UP, y: spot.y };
      const over = { x: spot.x - attDir * TOUCH, y: spot.y };
      moveScorer(
        progress < SET_PLACED
          ? lerp(scorerBase, runUp, smoothstep(progress / SET_PLACED))
          : lerp(runUp, over, smoothstep((progress - SET_PLACED) / (STEPPED_UP - SET_PLACED))),
      );
      const wall =
        goal.goalKind === "free-kick"
          ? nearestOutfield(pts[defSide], defSide, spot, present, null).slice(0, 3)
          : [];
      [...wall]
        .sort((a, b) => pts[defSide][a]!.y - pts[defSide][b]!.y || a - b)
        .forEach((slot, k) => {
          const place = { x: spot.x + attDir * WALL_GAP, y: spot.y + (k - 1) * WALL_SPACING };
          pts[defSide][slot] = lerp(pts[defSide][slot]!, place, smoothstep(progress / SET_PLACED));
        });
      const bend = { x: (spot.x + mouth.x) / 2, y: spot.y - CURL };
      const curls = goal.goalKind === "free-kick";
      const ball =
        progress < STRIKE
          ? lerp(live, spot, progress / SET_PLACED)
          : progress >= GOAL_LANDS
            ? mouth
            : curls
              ? bezier(spot, bend, mouth, flight)
              : lerp(spot, mouth, flight);
      return {
        ball,
        loft: progress < STRIKE ? 0 : Math.sin(flight * Math.PI) * (curls ? 0.6 : 0.25),
        carrier: goal.scorer,
        trail:
          progress < STRIKE ? null : shot(spot, ball, curls ? lerp(spot, bend, flight) : undefined),
        wall,
        beaten: null,
      };
    }
    case "header": {
      const wing = { x: side === "user" ? 84 : 16, y: live.y < 50 ? 12 : 88 };
      const meet = {
        x: side === "user" ? 88 : 12,
        y: 50 + Math.min(8, Math.max(-8, (scorerBase.y - 50) * 0.3)),
      };
      const bend = { x: (wing.x + meet.x) / 2 + attDir * 6, y: (wing.y + meet.y) / 2 };
      const nearest = nearestOutfield(pts[side], side, wing, present, scorerSlot)[0];
      const crosser = goal.assist ?? (nearest === undefined ? null : refAt(side, nearest));
      if (crosser?.slot != null && pts[side][crosser.slot]) {
        const out = { x: wing.x - attDir * TOUCH, y: wing.y };
        pts[side][crosser.slot] = lerp(
          pts[side][crosser.slot]!,
          out,
          smoothstep(progress / CROSS_FROM),
        );
      }
      moveScorer(lerp(scorerBase, meet, smoothstep(progress / STRIKE)));
      if (progress < CROSS_FROM) {
        const t = progress / CROSS_FROM;
        const ball = lerp(live, wing, t);
        return {
          ball,
          loft: Math.sin(t * Math.PI) * 0.2,
          carrier: crosser ?? goal.scorer,
          trail: { from: live, to: ball, effect: null, type: null, kind: "pass", progress: t },
          ...quiet,
        };
      }
      if (progress < STRIKE) {
        const c = (progress - CROSS_FROM) / (STRIKE - CROSS_FROM);
        const ball = bezier(wing, bend, meet, c);
        return {
          ball,
          loft: CROSS_LOFT * Math.sin((c * Math.PI) / 2) + 0.3 * Math.sin(c * Math.PI),
          carrier: goal.scorer,
          trail: {
            from: wing,
            to: ball,
            effect: null,
            type: null,
            kind: "cross",
            progress: c,
            via: lerp(wing, bend, c),
          },
          ...quiet,
        };
      }
      const ball = progress >= GOAL_LANDS ? mouth : lerp(meet, mouth, flight);
      return {
        ball,
        loft: CROSS_LOFT * (1 - flight),
        carrier: goal.scorer,
        trail: shot(meet, ball),
        ...quiet,
      };
    }
    case "solo": {
      const target = clampPoint({
        x: side === "user" ? 82 : 18,
        y: 50 + (scorerBase.y - 50) * 0.45,
      });
      const mid = lerp(scorerBase, target, 0.5);
      const beaten = nearestOutfield(pts[defSide], defSide, mid, present, null)[0] ?? null;
      const from = beaten === null ? mid : pts[defSide][beaten]!;
      if (beaten !== null) {
        pts[defSide][beaten] = lerp(from, mid, smoothstep(progress / PRESSER_IN));
      }
      const away = from.y >= mid.y ? -1 : 1;
      const u = smoothstep(progress / STRIKE);
      const run = lerp(scorerBase, target, u);
      const feet = clampPoint({ x: run.x, y: run.y + away * SWERVE * Math.sin(u * Math.PI) });
      moveScorer(feet);
      const strike = clampPoint({ x: target.x + attDir * TOUCH, y: target.y });
      if (progress < STRIKE) {
        const touch = TOUCH * (1 + 0.6 * Math.abs(Math.sin(SOLO_TOUCHES * Math.PI * u)));
        const chain = clampPoint({ x: feet.x + attDir * touch, y: feet.y });
        const ball = lerp(live, chain, progress / SOLO_GATHER);
        return {
          ball,
          loft: Math.abs(Math.sin(SOLO_TOUCHES * Math.PI * u)) * 0.1,
          carrier: goal.scorer,
          trail: {
            from: live,
            to: ball,
            effect: null,
            type: null,
            kind: "dribble",
            progress: progress / STRIKE,
          },
          wall: [],
          beaten,
        };
      }
      const ball = progress >= GOAL_LANDS ? mouth : lerp(strike, mouth, flight);
      return {
        ball,
        loft: Math.sin(flight * Math.PI) * 0.5,
        carrier: goal.scorer,
        trail: shot(strike, ball),
        wall: [],
        beaten,
      };
    }
    case "open-play": {
      const assistSlot = goal.assist?.slot ?? null;
      moveScorer(
        lerp(
          scorerBase,
          clampPoint({ x: side === "user" ? 82 : 18, y: 50 + (scorerBase.y - 50) * 0.45 }),
          Math.min(1, progress * 1.8),
        ),
      );
      if (assistSlot !== null && pts[side][assistSlot]) {
        const baseAssist = pts[side][assistSlot]!;
        pts[side][assistSlot] = clampPoint({
          x: baseAssist.x + attDir * 6 * smoothstep(progress / REACT),
          y: baseAssist.y,
        });
      }
      const shotSpot = scorerSlot === null ? scorerBase : pts[side][scorerSlot]!;
      const ball = goalBall(live, shotSpot, mouth, progress);
      return {
        ball,
        loft:
          progress < STRIKE
            ? Math.sin((progress / STRIKE) * Math.PI) * 0.35
            : progress < 0.65
              ? Math.sin(((progress - STRIKE) / 0.3) * Math.PI) * 0.85
              : 0,
        carrier: progress < STRIKE && goal.assist ? goal.assist : goal.scorer,
        trail:
          progress < STRIKE
            ? {
                from: live,
                to: ball,
                effect: null,
                type: null,
                kind: "pass",
                progress: progress / STRIKE,
              }
            : shot(shotSpot, ball),
        ...quiet,
      };
    }
  }
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
    leaving: playing.leaving?.map((p) => {
      const same = (q: StagedPlayer) =>
        q.side === p.side && q.slot === p.slot && q.species === p.species;
      const from = last.leaving?.find(same)?.point;
      const to = resumed.leaving?.find(same)?.point;
      return { ...p, point: carry(p.point, from, to) };
    }),
    playCallout: playing.playCallout,
  };
}
