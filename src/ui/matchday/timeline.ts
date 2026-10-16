import { createRng } from "@/lib/rng";
import type { Moveset } from "@/data/movesets";
import { speciesById } from "@/engine/species";
import type {
  FullLineup,
  GoalEvent,
  GoalKind,
  MatchResult,
  OpponentPlayerRef,
  Score,
  Side,
  SpeciesId,
  Tactic,
} from "@/engine/types";
import { fieldedFor } from "@/ui/manager/touchline";
import { saveCallout, shotCallout, type Callout } from "./moves";

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
  /** -1 (pinned in the user's half) to 1 (camped in the opponent's). */
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

export interface Timeline {
  readonly finalMinute: 90 | 120;
  /** A retained engine recorded only goals: no windows, incidents or saves to stage. */
  readonly goalsOnly: boolean;
  readonly beats: readonly Beat[];
  readonly kicks: readonly Kick[];
  readonly frames: readonly Frame[];
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
const TAU = Math.PI * 2;

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
    const inside = (m: number) => m > from && m <= to;
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
  return {
    finalMinute,
    goalsOnly,
    beats: ordered,
    kicks,
    frames,
    drift: { user: userXI.map(drift), opp: oppXI.map(drift) },
    userXI,
    oppXI,
    changes,
  };
}

/** The frame playing at a minute. */
export function frameAt(timeline: Timeline, minute: number): Frame | null {
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

/** The ball between events: it sways toward the side making chances in this window. */
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

/** A goal move as it plays: assist to scorer, the shot, then the ball in the net. */
export function goalBall(from: Point, scorer: Point, mouth: Point, progress: number): Point {
  if (progress < 0.35) return lerp(from, scorer, progress / 0.35);
  if (progress < 0.6) return lerp(scorer, mouth, (progress - 0.35) / 0.25);
  return mouth;
}
