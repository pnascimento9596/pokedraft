import { familiarity } from "../scouting/fit";
import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { recapLines } from "./recap";
import { canonicalSortBy, createEngineRng, deriveSubseed, type EngineRng } from "./rng";
import { speciesById } from "./species";
import { matchLines, rateTeam } from "./team";
import {
  RunTokenError,
  type Absence,
  type BenchIndex,
  type CupRound,
  type FullLineup,
  type GoalEvent,
  type GoalKind,
  type Incident,
  type Line,
  type LineStrength,
  type ManagerAction,
  type MatchResult,
  type Opponent,
  type PenKick,
  type Role,
  type Score,
  type SaveEvent,
  type Seed,
  type Shootout,
  type Side,
  type Species,
  type SpeciesId,
  type StarterIndex,
  type Tactic,
  type WindowSnapshot,
} from "./types";

export type Phase = "group" | "knockout";

export interface MatchStarter {
  readonly species: Species;
  readonly line: Line;
  readonly role: Role;
}

export interface MatchInput {
  readonly matchIndex: number;
  readonly round: CupRound;
  readonly phase: Phase;
  readonly seed: Seed;
  readonly rating: number;
  readonly userLines: LineStrength;
  /** The user's eleven in formation slot order. */
  readonly starters: readonly MatchStarter[];
  readonly keeper: Species;
  readonly opponent: Opponent;
  /** The Boss Club's own eleven, in lineup order; the live engine always fields species. */
  readonly opponentStarters: readonly MatchStarter[];
  readonly absences: readonly Absence[];
  /**
   * The fielded lineup the starters came from. With it the user side can make substitutions and
   * pick up injuries; without it (a one-off exhibition) only cards and tactics happen.
   */
  readonly lineup?: FullLineup;
  /** Bench players who cannot come on in this match (a pre-match absence). */
  readonly unavailable?: readonly SpeciesId[];
  /** This match's coach decisions, in minute order. */
  readonly manager?: readonly ManagerAction[];
}

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

/** One chance trial, read after the engine rolled it. `slot` is the shooter's formation slot. */
export interface ChanceObservation {
  readonly window: number;
  readonly minute: number;
  readonly side: Side;
  readonly p: number;
  readonly outcome: "goal" | "saved" | "off";
  readonly kind: GoalKind | null;
  readonly shooter: SpeciesId;
  readonly slot: StarterIndex;
}

/**
 * Read-only hooks into one match. They receive plain values after the engine has used them, so
 * nothing they do can draw, mutate the match or change what happens next.
 */
export interface MatchObserver {
  readonly chance: (chance: ChanceObservation) => void;
  readonly window: (window: { readonly window: number; readonly minute: number }) => void;
}

const REGULATION_MINUTES = 90;
const EXTRA_TIME_LAST_MINUTE = 120;
const PERCENT = 100;
const FRESH = 100;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function weightedPick<T>(
  pool: readonly T[],
  key: (item: T) => number,
  weight: (item: T) => number,
  rng: EngineRng,
): T {
  const sorted = canonicalSortBy(pool, (item) => [key(item)]);
  const total = sorted.reduce((sum, item) => sum + weight(item), 0);
  let r = rng.next() * total;
  for (const item of sorted) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return sorted[sorted.length - 1]!;
}

function expectedGoals(att: LineStrength, def: LineStrength, c: EngineCoefficients): number {
  const m = c.match;
  const resistance = m.wDef * def.DEF + m.wGk * def.GK;
  const base = clamp(
    m.base + (m.spread * (att.ATT - resistance)) / PERCENT,
    m.minLambda,
    m.maxLambda,
  );
  const control = clamp(1 + (m.gammaMid * (att.MID - def.MID)) / PERCENT, m.controlLo, m.controlHi);
  return base * control;
}

function dispersion(rng: EngineRng, phase: Phase, c: EngineCoefficients): number {
  const { outer, amplitude } = c.match.dispersion[phase];
  const roll = rng.next();
  if (roll < outer) return 1 - amplitude;
  if (roll < 2 * outer) return 1 + amplitude;
  return 1;
}

export function matchLambdas(
  a: LineStrength,
  b: LineStrength,
  phase: Phase,
  struct: EngineRng,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): readonly [number, number] {
  const epsilon = dispersion(struct, phase, c);
  const factor = phase === "knockout" ? c.match.knockoutFactor : 1;
  return [expectedGoals(a, b, c) * factor * epsilon, expectedGoals(b, a, c) * factor * epsilon];
}

export function simulateScore(
  a: LineStrength,
  b: LineStrength,
  seed: Seed,
  scope: string,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): readonly [number, number] {
  const struct = createEngineRng(deriveSubseed(seed, "match_sim", scope));
  const [lambdaA, lambdaB] = matchLambdas(a, b, "group", struct, c);
  const n = c.match.chances.regulation;
  const goals = (lambda: number): number => {
    const p = Math.min(lambda / n, c.match.chances.maxGoalProb);
    let scored = 0;
    for (let j = 0; j < n; j++) if (struct.next() < p) scored++;
    return scored;
  };
  const goalsA = goals(lambdaA);
  return [goalsA, goals(lambdaB)];
}

// Keeper strength already lowers the goal rate through the GK line in expectedGoals. A save
// classifies a chance trial that did not score; it never prevents a goal. A trial is a slice of
// the goal rate, not a shot, so only this design share of non-goal trials is an on-target attempt.
// The share sets save volume and is not a real-world calibration.
export const ON_TARGET_SHARE = 0.15;

// Probability that a non-goal chance trial is recorded as this keeper saving this shooter.
export function saveProbability(attacker: Species, keeper: Species): number {
  const a = keeper.attrs;
  const handling = 0.35 * a.REF + 0.3 * a.DIV + 0.2 * a.HAN + 0.15 * a.GKP;
  return ON_TARGET_SHARE * clamp(0.35 + (handling - attacker.attrs.SHO) / 250, 0.1, 0.7);
}

export function assistWeight(
  starter: MatchStarter,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): number {
  const a = starter.species.attrs;
  return (0.5 * a.PAS + 0.35 * a.VIS + 0.15 * a.DRI) * c.match.assistRoleFactor[starter.role];
}

export function extraTimeFactor(starters: readonly MatchStarter[]): number {
  const stamina = starters.reduce((sum, s) => sum + s.species.attrs.STA, 0) / starters.length;
  return clamp(0.9 + stamina / 500, 0.9, 1.1);
}

export function penaltyEdge(taker: Species, keeper: Species): number {
  return (
    0.75 * taker.attrs.SHO +
    0.25 * taker.attrs.TEC -
    (keeper.attrs.REF + keeper.attrs.DIV + keeper.attrs.HAN + keeper.attrs.GKP) / 4
  );
}

function convertProb(edge: number, c: EngineCoefficients): number {
  const { base, band } = c.shootout;
  return clamp(base + (band * edge) / PERCENT, base - band, base + band);
}

function goalTieKey(g: GoalEvent): readonly [number, number] {
  if (g.side === "user") return [0, g.scorer];
  return g.scorer.kind === "species" ? [0, g.scorer.id] : [1, g.scorer.number];
}

function slotOf(side: SideState, id: SpeciesId): StarterIndex {
  return side.onPitch.findIndex((o) => o?.species.id === id) as StarterIndex;
}

function scorerOf(goal: GoalEvent): SpeciesId {
  if (goal.side === "user") return goal.scorer;
  if (goal.scorer.kind !== "species") throw new RangeError("the live engine fields species only");
  return goal.scorer.id;
}

function outcomeOf(score: Score): "W" | "D" | "L" {
  if (score.user > score.opp) return "W";
  if (score.user < score.opp) return "L";
  return "D";
}

// ---------------------------------------------------------------------------------------------
// Engine 6: the match is played as a chronological sweep over five-minute windows. Every draw a
// window makes comes from that window's own substreams and the number of draws never depends on
// what happens, so a decision taken at minute m changes nothing at or before minute m. That is
// what lets the touchline pause a match, take a decision and play on without rewriting the past.
// ---------------------------------------------------------------------------------------------

interface Occupant {
  readonly species: Species;
  /** Minute this player came on (0 for a starter). */
  readonly since: number;
  energy: number;
  yellow: boolean;
}

interface SideState {
  readonly side: Side;
  readonly slots: readonly { readonly line: Line; readonly role: Role }[];
  readonly onPitch: (Occupant | null)[];
  tactic: Tactic;
  goals: number;
  vacancies: number;
}

interface UserBench {
  readonly lineup: FullLineup;
  readonly available: (Species | null)[];
  subsUsed: number;
}

type Item =
  | { readonly kind: "trial"; readonly minute: number; readonly side: Side; readonly order: number }
  | {
      readonly kind: "incident";
      readonly minute: number;
      readonly side: Side;
      readonly order: number;
      readonly slot: StarterIndex;
      readonly injury: number;
      readonly card: number;
    };

function invalid(message: string): never {
  throw new RunTokenError("invalidAction", message);
}

function windowChances(total: number, windows: number, w: number): number {
  return Math.floor(((w + 1) * total) / windows) - Math.floor((w * total) / windows);
}

function defaultTactic(opponent: Opponent): Tactic {
  switch (opponent.tacticalStyle) {
    case "pressing":
      return "press";
    case "direct":
      return "counter";
    default:
      return "balanced";
  }
}

// The auto coach: protect a late lead, chase a deficit, otherwise play the default.
function autoTactic(base: Tactic, minute: number, own: number, other: number): Tactic {
  const diff = own - other;
  if (minute >= 75 && diff >= 1) return "defend";
  if ((minute >= 60 && diff <= -1) || (minute >= 45 && diff <= -2)) return "attack";
  return base;
}

function tacticMultipliers(
  side: SideState,
  opponent: Opponent,
  c: EngineCoefficients,
): readonly [number, number] {
  if (side.side === "user" && opponent.tacticalStyle && opponent.tacticalStyle !== "balanced") {
    const edge = c.manager.styleEdges[opponent.tacticalStyle][side.tactic];
    if (edge) return edge;
  }
  return c.manager.tactics[side.tactic];
}

function onField(side: SideState): MatchStarter[] {
  const out: MatchStarter[] = [];
  side.onPitch.forEach((o, i) => {
    if (o !== null)
      out.push({ species: o.species, line: side.slots[i]!.line, role: side.slots[i]!.role });
  });
  return out;
}

function keeperOf(side: SideState): Species {
  const i = side.slots.findIndex((s) => s.role === "GK");
  const keeper = side.onPitch[i];
  if (!keeper) throw new RangeError(`${side.side} has no goalkeeper on the pitch`);
  return keeper.species;
}

function tiredLines(lines: LineStrength, side: SideState, c: EngineCoefficients): LineStrength {
  const factor = (line: Line): number => {
    const own = side.onPitch.filter((o, i) => o !== null && side.slots[i]!.line === line);
    if (own.length === 0) return 1;
    const floor = c.manager.tiredFloor;
    return own.reduce((sum, o) => sum + floor + ((1 - floor) * o!.energy) / FRESH, 0) / own.length;
  };
  return {
    GK: lines.GK * factor("GK"),
    DEF: lines.DEF * factor("DEF"),
    MID: lines.MID * factor("MID"),
    ATT: lines.ATT * factor("ATT"),
  };
}

function drain(side: SideState, minutes: number, c: EngineCoefficients): void {
  if (minutes <= 0) return;
  const press = side.tactic === "press" ? c.manager.pressDrain : 1;
  for (const o of side.onPitch) {
    if (o === null) continue;
    const loss = c.manager.drain * press * (1.4 - o.species.attrs.STA / PERCENT) * minutes;
    o.energy = Math.max(0, o.energy - loss);
  }
}

function pickScorer(
  pool: readonly MatchStarter[],
  kind: GoalKind,
  rng: EngineRng,
  c: EngineCoefficients,
): MatchStarter {
  return weightedPick(
    pool.filter((s) => c.match.roleFactor[s.role] > 0),
    (s) => s.species.id,
    (s) => {
      const a = s.species.attrs;
      const skill =
        kind === "header"
          ? 0.5 * a.SHO + 0.35 * a.AER + 0.15 * a.PHY
          : kind === "solo"
            ? 0.5 * a.SHO + 0.35 * a.DRI + 0.15 * a.ACC
            : kind === "free-kick"
              ? 0.6 * a.SHO + 0.4 * a.TEC
              : a.SHO;
      return Math.max(1, skill) * c.match.roleFactor[s.role];
    },
    rng,
  );
}

function goalEvent(
  side: Side,
  pool: readonly MatchStarter[],
  minute: number,
  penalty: boolean,
  rng: EngineRng,
  c: EngineCoefficients,
): GoalEvent {
  const roll = penalty ? 1 : rng.next();
  const kind: GoalKind = penalty
    ? "penalty"
    : roll < 0.12
      ? "header"
      : roll < 0.2
        ? "free-kick"
        : roll < 0.38
          ? "solo"
          : "open-play";
  const scorer = penalty
    ? canonicalSortBy(pool, (s) => [-s.species.attrs.SHO, s.species.id])[0]!
    : pickScorer(pool, kind, rng, c);
  const creators = pool.filter((s) => s !== scorer && c.match.assistRoleFactor[s.role] > 0);
  const assisted = (kind === "open-play" || kind === "header") && rng.next() < c.match.assistProb;
  const assist =
    assisted && creators.length > 0
      ? weightedPick(
          creators,
          (s) => s.species.id,
          (s) => Math.max(1, assistWeight(s, c)),
          rng,
        ).species.id
      : null;
  return side === "user"
    ? { side, minute, penalty, kind, scorer: scorer.species.id, assist }
    : {
        side,
        minute,
        penalty,
        kind,
        scorer: { kind: "species", id: scorer.species.id },
        assist: assist === null ? null : { kind: "species", id: assist },
      };
}

function replacementFor(
  bench: UserBench,
  role: Role,
  c: EngineCoefficients,
): { readonly species: Species; readonly index: BenchIndex } | null {
  if (bench.subsUsed >= c.manager.maxSubs) return null;
  const options = bench.available.flatMap((sp, index) =>
    sp === null ? [] : [{ species: sp, index: index as BenchIndex }],
  );
  if (options.length === 0) return null;
  const cover = options.filter(
    (o) => familiarity(o.species.bestRoles, role) >= c.availability.familiarityFloor,
  );
  return canonicalSortBy(cover.length > 0 ? cover : options, (o) => [
    -o.species.quality[role],
    o.species.id,
  ])[0]!;
}

function shootoutOf(
  user: SideState,
  opp: SideState,
  rng: EngineRng,
  c: EngineCoefficients,
): Shootout {
  const userTakers = canonicalSortBy(onField(user), (s) => [-s.species.attrs.SHO, s.species.id]);
  const oppTakers = canonicalSortBy(onField(opp), (s) => [-s.species.attrs.SHO, s.species.id]);
  const userKeeper = keeperOf(user);
  const oppKeeper = keeperOf(opp);
  const kicks: PenKick[] = [];
  let u = 0;
  let o = 0;
  let userKicks = 0;
  let oppKicks = 0;
  const kickUser = (): void => {
    const taker = userTakers[userKicks % userTakers.length]!.species;
    const scored = rng.next() < convertProb(penaltyEdge(taker, oppKeeper), c);
    if (scored) u++;
    userKicks++;
    kicks.push({ side: "user", taker: taker.id, scored });
  };
  const kickOpp = (): void => {
    const taker = oppTakers[oppKicks % oppTakers.length]!.species;
    const scored = rng.next() < convertProb(penaltyEdge(taker, userKeeper), c);
    if (scored) o++;
    oppKicks++;
    kicks.push({ side: "opp", taker: { kind: "species", id: taker.id }, scored });
  };
  const regulation = c.shootout.kicks;
  const clinched = (): boolean =>
    u > o + (regulation - oppKicks) || o > u + (regulation - userKicks);
  while ((userKicks < regulation || oppKicks < regulation) && !clinched()) {
    if (userKicks <= oppKicks) kickUser();
    else kickOpp();
  }
  for (let round = 0; u === o && round < c.shootout.maxSuddenDeath; round++) {
    kickUser();
    kickOpp();
  }
  const coinWinner = u === o ? (rng.next() < 0.5 ? "user" : "opp") : null;
  return {
    user: u,
    opp: o,
    keeper: userKeeper.id,
    kicks,
    decider: coinWinner === null ? "kicks" : "coin",
    coinWinner,
  };
}

export function simulateMatch(
  input: MatchInput,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): PlayedMatch {
  return playMatchCore(input, c);
}

// The one body behind simulateMatch and matchStory. `observe` is only ever called through `?.`,
// so the match plays the same draws in the same order with or without it.
export function playMatchCore(
  input: MatchInput,
  c: EngineCoefficients,
  observe?: MatchObserver,
): PlayedMatch {
  const scope = `match:${input.matchIndex}`;
  const m = c.manager;
  const structMatch = createEngineRng(deriveSubseed(input.seed, "match_sim", scope));
  const epsilon = dispersion(structMatch, input.phase, c);
  const factor = input.phase === "knockout" ? c.match.knockoutFactor : 1;

  const fresh = (species: Species): Occupant => ({
    species,
    since: 0,
    energy: FRESH,
    yellow: false,
  });
  const user: SideState = {
    side: "user",
    slots: input.starters.map((s) => ({ line: s.line, role: s.role })),
    onPitch: input.starters.map((s) => fresh(s.species)),
    tactic: "balanced",
    goals: 0,
    vacancies: 0,
  };
  const oppBase = defaultTactic(input.opponent);
  const opp: SideState = {
    side: "opp",
    slots: input.opponentStarters.map((s) => ({ line: s.line, role: s.role })),
    onPitch: input.opponentStarters.map((s) => fresh(s.species)),
    tactic: oppBase,
    goals: 0,
    vacancies: 0,
  };
  if (keeperOf(user).id !== input.keeper.id)
    throw new RangeError("keeper must play in the GK slot");
  keeperOf(opp);

  const unavailable = new Set(input.unavailable ?? []);
  const bench: UserBench | null =
    input.lineup === undefined
      ? null
      : {
          lineup: input.lineup,
          available: input.lineup.bench.map((id) => (unavailable.has(id) ? null : speciesById(id))),
          subsUsed: 0,
        };
  let userLines = input.userLines;
  const oppLines = input.opponent.lines;

  const goals: GoalEvent[] = [];
  const saves: SaveEvent[] = [];
  const incidents: Incident[] = [];
  const windows: WindowSnapshot[] = [];
  const actions = [...(input.manager ?? [])];
  let nextAction = 0;
  let managed = false;
  let lastMinute = 0;

  const advance = (minute: number): void => {
    drain(user, minute - lastMinute, c);
    drain(opp, minute - lastMinute, c);
    lastMinute = Math.max(lastMinute, minute);
  };

  // A slot a red card emptied falls back to its original starter here, so rateTeam still rates
  // that player. The vacancy multipliers in rate() are calibrated to correct for that too.
  const refreshUserLines = (): void => {
    if (bench === null) return;
    const starters = user.onPitch.map((o, i) => o?.species.id ?? bench.lineup.starters[i]!);
    const lineup: FullLineup = {
      formation: bench.lineup.formation,
      starters: starters as unknown as FullLineup["starters"],
      bench: bench.lineup.bench,
    };
    userLines = matchLines(rateTeam(lineup, c), c);
  };

  const substitute = (
    slot: StarterIndex,
    index: BenchIndex,
    minute: number,
    reason: "injury" | "tactical" | "fatigue",
    by: "manager" | "auto",
    leaving: Species,
  ): void => {
    const incoming = bench!.available[index]!;
    bench!.available[index] = null;
    bench!.subsUsed++;
    user.onPitch[slot] = { species: incoming, since: minute, energy: FRESH, yellow: false };
    incidents.push({
      kind: "sub",
      side: "user",
      minute,
      slot,
      out: leaving.id,
      in: incoming.id,
      reason,
      by,
    });
    refreshUserLines();
  };

  const applyManager = (a: ManagerAction): void => {
    managed = true;
    if (a.type === "tactic") {
      if (a.tactic !== user.tactic) {
        user.tactic = a.tactic;
        incidents.push({
          kind: "tactic",
          side: "user",
          minute: a.minute,
          tactic: a.tactic,
          by: "manager",
        });
      }
      return;
    }
    if (bench === null) invalid("this match has no bench to bring on");
    const current = user.onPitch[a.slot];
    if (!current) invalid(`slot ${a.slot} has nobody to take off at minute ${a.minute}`);
    if (bench.subsUsed >= m.maxSubs) invalid("no substitutions left");
    if (!bench.available[a.bench]) invalid(`bench player ${a.bench} cannot come on`);
    substitute(a.slot, a.bench, a.minute, "tactical", "manager", current.species);
  };

  // Decisions recorded at minute <= t take effect before anything at minute > t happens.
  const applyDecisionsUpTo = (t: number): void => {
    while (nextAction < actions.length && actions[nextAction]!.minute <= t) {
      const a = actions[nextAction]!;
      advance(a.minute);
      applyManager(a);
      nextAction++;
    }
  };

  const pendingInjurySub = (minute: number, slot: StarterIndex): ManagerAction | null => {
    for (let k = nextAction; k < actions.length; k++) {
      const a = actions[k]!;
      if (a.minute > minute) break;
      if (a.minute === minute && a.type === "sub" && a.slot === slot) {
        actions.splice(k, 1);
        return a;
      }
    }
    return null;
  };

  const boundary = (t: number): void => {
    applyDecisionsUpTo(t);
    // Any manager decision switches the auto coach off for the user side, fatigue subs included.
    // Pinned by manager.test.ts "hands the touchline to the manager".
    if (!managed) {
      const next = autoTactic("balanced", t, user.goals, opp.goals);
      if (next !== user.tactic) {
        user.tactic = next;
        incidents.push({ kind: "tactic", side: "user", minute: t, tactic: next, by: "auto" });
      }
      if (bench !== null && m.autoSubMinutes.includes(t)) {
        const tired = canonicalSortBy(
          user.onPitch.flatMap((o, i) =>
            o !== null && user.slots[i]!.role !== "GK" && o.energy < m.autoSubEnergy
              ? [{ o, i: i as StarterIndex }]
              : [],
          ),
          (x) => [x.o.energy, x.i],
        )[0];
        if (tired) {
          const pick = replacementFor(bench, user.slots[tired.i]!.role, c);
          if (pick) substitute(tired.i, pick.index, t, "fatigue", "auto", tired.o.species);
        }
      }
    }
    // A Boss Club has no named bench, so it rotates by refreshing its most tired outfield player at
    // the same checks, which keeps fresh legs from being a user-only edge.
    if (m.autoSubMinutes.includes(t)) {
      const tired = canonicalSortBy(
        opp.onPitch.flatMap((o, i) =>
          o !== null && opp.slots[i]!.role !== "GK" && o.energy < m.autoSubEnergy ? [{ o, i }] : [],
        ),
        (x) => [x.o.energy, x.i],
      )[0];
      if (tired) tired.o.energy = FRESH;
    }
    const oppNext = autoTactic(oppBase, t, opp.goals, user.goals);
    if (oppNext !== opp.tactic) {
      opp.tactic = oppNext;
      incidents.push({ kind: "tactic", side: "opp", minute: t, tactic: oppNext, by: "auto" });
    }
  };

  const rate = (attacking: SideState, defending: SideState, base: number): number => {
    const attLines = tiredLines(attacking.side === "user" ? userLines : oppLines, attacking, c);
    const defLines = tiredLines(defending.side === "user" ? userLines : oppLines, defending, c);
    const [own] = tacticMultipliers(attacking, input.opponent, c);
    const [, gives] = tacticMultipliers(defending, input.opponent, c);
    const [vacOwn, vacGives] = m.vacancy;
    let lambda = expectedGoals(attLines, defLines, c) * factor * epsilon * base * own * gives;
    for (let k = 0; k < attacking.vacancies; k++) lambda *= vacOwn;
    for (let k = 0; k < defending.vacancies; k++) lambda *= vacGives;
    return lambda;
  };

  const incident = (it: Extract<Item, { kind: "incident" }>): void => {
    const side = it.side === "user" ? user : opp;
    const occupant = side.onPitch[it.slot];
    if (!occupant) return;
    const slot = side.slots[it.slot]!;
    const press = side.tactic === "press" ? m.pressHazard : 1;
    const perWindow = REGULATION_MINUTES / m.windowMinutes;
    const isKeeper = slot.role === "GK";
    if (it.side === "user" && bench !== null) {
      const canReplace = replacementFor(bench, slot.role, c) !== null;
      const hazard =
        (m.injuriesPerMatch / (side.slots.length * perWindow)) *
        (1.5 - occupant.species.attrs.STA / PERCENT) *
        press *
        (isKeeper ? (canReplace ? 0.5 : 0) : 1);
      if (it.injury < hazard) {
        incidents.push({
          kind: "injury",
          side: "user",
          minute: it.minute,
          slot: it.slot,
          player: occupant.species.id,
        });
        const chosen = pendingInjurySub(it.minute, it.slot);
        if (chosen !== null && chosen.type === "sub") {
          if (!bench.available[chosen.bench] || bench.subsUsed >= m.maxSubs) {
            invalid(`bench player ${chosen.bench} cannot replace the injured player`);
          }
          managed = true;
          substitute(it.slot, chosen.bench, it.minute, "injury", "manager", occupant.species);
        } else {
          const pick = replacementFor(bench, slot.role, c);
          if (pick) substitute(it.slot, pick.index, it.minute, "injury", "auto", occupant.species);
          else {
            side.onPitch[it.slot] = null;
            side.vacancies++;
          }
        }
        return;
      }
    }
    if (isKeeper) return;
    const weight = m.cardLineWeight[slot.line] * press;
    const outfield = side.slots.length - 1;
    const red = (m.redsPerMatch / (outfield * perWindow)) * weight;
    const yellow =
      (m.yellowsPerMatch / (outfield * perWindow)) *
      weight *
      (occupant.yellow ? m.bookedCaution : 1);
    if (it.card < red || (it.card < red + yellow && occupant.yellow)) {
      incidents.push({
        kind: "red",
        side: it.side,
        minute: it.minute,
        slot: it.slot,
        player: occupant.species.id,
        secondYellow: it.card >= red,
      });
      side.onPitch[it.slot] = null;
      side.vacancies++;
    } else if (it.card < red + yellow) {
      occupant.yellow = true;
      incidents.push({
        kind: "yellow",
        side: it.side,
        minute: it.minute,
        slot: it.slot,
        player: occupant.species.id,
        secondYellow: false,
      });
    }
  };

  const playWindow = (
    index: number,
    first: number,
    chancesPerSide: number,
    total: number,
    base: { readonly user: number; readonly opp: number },
  ): void => {
    const w = `${scope}:w${index}`;
    const timing = createEngineRng(deriveSubseed(input.seed, "match_timing", w));
    const struct = createEngineRng(deriveSubseed(input.seed, "match_sim", w));
    const event = createEngineRng(deriveSubseed(input.seed, "event_gen", w));
    const saveRng = {
      user: createEngineRng(deriveSubseed(input.seed, "save_events", `${w}:user`)),
      opp: createEngineRng(deriveSubseed(input.seed, "save_events", `${w}:opp`)),
    };
    const hazards = createEngineRng(deriveSubseed(input.seed, "match_incidents", w));
    const span = m.windowMinutes;
    const items: Item[] = [];
    (["user", "opp"] as const).forEach((side, sideOrder) => {
      for (let j = 0; j < chancesPerSide; j++) {
        const minute = first + Math.floor(((j + timing.next()) * span) / chancesPerSide);
        items.push({ kind: "trial", minute, side, order: sideOrder * 100 + j });
      }
    });
    (["user", "opp"] as const).forEach((side, sideOrder) => {
      for (let slot = 0; slot < 11; slot++) {
        const minute = first + hazards.int(span);
        const injury = hazards.next();
        const card = hazards.next();
        items.push({
          kind: "incident",
          minute,
          side,
          order: 1000 + sideOrder * 100 + slot,
          slot: slot as StarterIndex,
          injury,
          card,
        });
      }
    });
    items.sort((a, b) => a.minute - b.minute || a.order - b.order);

    boundary(first - 1);
    for (const it of items) {
      applyDecisionsUpTo(it.minute - 1);
      advance(it.minute);
      if (it.kind === "incident") {
        incident(it);
        continue;
      }
      const attacking = it.side === "user" ? user : opp;
      const defending = it.side === "user" ? opp : user;
      const p = Math.min(
        rate(attacking, defending, base[it.side]) / total,
        c.match.chances.maxGoalProb,
      );
      const pool = onField(attacking);
      if (struct.next() < p) {
        const penalty = event.next() < c.match.penaltyShare;
        const goal = goalEvent(it.side, pool, it.minute, penalty, event, c);
        goals.push(goal);
        attacking.goals++;
        observe?.chance({
          window: index,
          minute: it.minute,
          side: it.side,
          p,
          outcome: "goal",
          kind: goal.kind ?? null,
          shooter: scorerOf(goal),
          slot: slotOf(attacking, scorerOf(goal)),
        });
      } else {
        const keeperSide: Side = defending.side;
        const rng = saveRng[keeperSide];
        const keeper = keeperOf(defending);
        const shooters = pool.filter((s) => c.match.roleFactor[s.role] > 0);
        const attacker = weightedPick(
          shooters,
          (s) => s.species.id,
          (s) => Math.max(1, s.species.attrs.SHO) * c.match.roleFactor[s.role],
          rng,
        ).species;
        const saved = rng.next() < saveProbability(attacker, keeper);
        if (saved) {
          saves.push({
            kind: "save",
            side: keeperSide,
            minute: it.minute,
            attacker: attacker.id,
            keeper: keeper.id,
          });
        }
        observe?.chance({
          window: index,
          minute: it.minute,
          side: it.side,
          p,
          outcome: saved ? "saved" : "off",
          kind: null,
          shooter: attacker.id,
          slot: slotOf(attacking, attacker.id),
        });
      }
    }
    // The snapshot is what the touchline sees when it pauses at this minute, so decisions taken
    // at the window's last minute land at the next boundary, after it is recorded.
    const last = first + span - 1;
    advance(last);
    windows.push({
      minute: last,
      score: { user: user.goals, opp: opp.goals },
      tactic: { user: user.tactic, opp: opp.tactic },
      energy: user.onPitch.map((o) => (o === null ? null : Math.round(o.energy))),
      onPitch: user.onPitch.map((o) => o?.species.id ?? null),
    });
    observe?.window({ window: index, minute: last });
  };

  const regWindows = REGULATION_MINUTES / m.windowMinutes;
  for (let w = 0; w < regWindows; w++) {
    playWindow(
      w,
      w * m.windowMinutes + 1,
      windowChances(c.match.chances.regulation, regWindows, w),
      c.match.chances.regulation,
      { user: 1, opp: 1 },
    );
  }
  const regulation: Score = { user: user.goals, opp: opp.goals };

  let extraTime: Score | null = null;
  let penalties: Shootout | null = null;
  let outcome = outcomeOf(regulation);
  if (input.phase === "knockout" && outcome === "D") {
    const etWindows = (EXTRA_TIME_LAST_MINUTE - REGULATION_MINUTES) / m.windowMinutes;
    // Each side's extra-time rate is its own stamina-weighted share of a full match, set by
    // whoever is on the pitch at the final whistle of normal time.
    const etBase = {
      user: c.match.extraTimeFraction * extraTimeFactor(onField(user)),
      opp: c.match.extraTimeFraction * extraTimeFactor(onField(opp)),
    };
    for (let w = 0; w < etWindows; w++) {
      playWindow(
        regWindows + w,
        REGULATION_MINUTES + w * m.windowMinutes + 1,
        windowChances(c.match.chances.extraTime, etWindows, w),
        c.match.chances.extraTime,
        etBase,
      );
    }
    extraTime = { user: user.goals - regulation.user, opp: opp.goals - regulation.opp };
    outcome = outcomeOf(extraTime);
    if (outcome === "D") {
      penalties = shootoutOf(
        user,
        opp,
        createEngineRng(deriveSubseed(input.seed, "match_sim", `${scope}:shootout`)),
        c,
      );
      outcome =
        penalties.coinWinner === null
          ? outcomeOf(penalties)
          : penalties.coinWinner === "user"
            ? "W"
            : "L";
    }
  }
  if (nextAction < actions.length) invalid("a coach decision falls after the final whistle");

  const ordered = [...goals].sort(
    (a, b) =>
      a.minute - b.minute ||
      (a.side === b.side ? 0 : a.side === "user" ? -1 : 1) ||
      goalTieKey(a)[0] - goalTieKey(b)[0] ||
      goalTieKey(a)[1] - goalTieKey(b)[1],
  );

  return {
    status: "played",
    round: input.round,
    opponent: input.opponent,
    regulation,
    extraTime,
    shootout: penalties,
    outcome,
    goals: ordered,
    saves: canonicalSortBy(saves, (s) => [
      s.minute,
      s.side === "user" ? 0 : 1,
      s.keeper,
      s.attacker,
    ]),
    incidents,
    windows,
    absences: input.absences,
    rating: input.rating,
    recap: recapLines({
      matchIndex: input.matchIndex,
      opponent: input.opponent,
      regulation,
      extraTime,
      shootout: penalties,
      outcome,
      goals: ordered,
    }),
  };
}
