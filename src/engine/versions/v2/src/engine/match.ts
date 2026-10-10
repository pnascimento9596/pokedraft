import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { recapLines } from "./recap";
import { canonicalSortBy, createEngineRng, deriveSubseed, type EngineRng } from "./rng";
import type {
  Absence,
  CupRound,
  GoalEvent,
  Line,
  LineStrength,
  MatchResult,
  Opponent,
  PenKick,
  Score,
  Seed,
  Shirt,
  Shootout,
  Species,
  SpeciesId,
} from "./types";

export type Phase = "group" | "knockout";

export interface MatchStarter {
  readonly species: Species;
  readonly line: Line;
}

export interface MatchInput {
  readonly matchIndex: number;
  readonly round: CupRound;
  readonly phase: Phase;
  readonly seed: Seed;
  readonly rating: number;
  readonly userLines: LineStrength;
  readonly starters: readonly MatchStarter[];
  readonly keeper: Species;
  readonly opponent: Opponent;
  readonly absences: readonly Absence[];
}

interface Streams {
  readonly struct: EngineRng;
  readonly event: EngineRng;
}

interface Period {
  readonly first: number;
  readonly last: number;
  readonly chances: number;
}

type PlayedMatch = Extract<MatchResult, { status: "played" }>;

const SHIRTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as Shirt[];
const KEEPER_SHIRT = 1;
const OPP_SHOOTOUT_ORDER = [9, 10, 11, 8, 7, 6, 5, 4, 3, 2, 1] as Shirt[];
const REGULATION_MINUTES = 90;
const EXTRA_TIME_LAST_MINUTE = 120;
const PERCENT = 100;

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

function chances(
  lambda: number,
  period: Period,
  rngs: Streams,
  c: EngineCoefficients,
  attribute: (minute: number, penalty: boolean) => GoalEvent,
): GoalEvent[] {
  const goals: GoalEvent[] = [];
  const span = period.last - period.first + 1;
  const p = Math.min(lambda / period.chances, c.match.chances.maxGoalProb);
  for (let j = 0; j < period.chances; j++) {
    const jitter = rngs.event.next();
    const minute = clamp(
      period.first + Math.floor(((j + jitter) * span) / period.chances),
      period.first,
      period.last,
    );
    if (rngs.struct.next() < p) {
      const penalty = rngs.event.next() < c.match.penaltyShare;
      goals.push(attribute(minute, penalty));
    }
  }
  return goals;
}

function userAttribution(
  starters: readonly MatchStarter[],
  rng: EngineRng,
  c: EngineCoefficients,
): (minute: number, penalty: boolean) => GoalEvent {
  const byId = (s: MatchStarter): number => s.species.id;
  const outfield = starters.filter((s) => s.line !== "GK");
  const [penaltyTaker] = canonicalSortBy(starters, (s) => [-s.species.attrs.SHO, s.species.id]);
  return (minute, penalty) => {
    if (penalty) {
      return { side: "user", minute, penalty, scorer: penaltyTaker!.species.id, assist: null };
    }
    const scorer = weightedPick(
      outfield,
      byId,
      (s) => s.species.attrs.SHO * c.match.scorerLineFactor[s.line as Exclude<Line, "GK">],
      rng,
    );
    let assist: SpeciesId | null = null;
    if (rng.next() < c.match.assistProb) {
      const creators = starters.filter((s) => s !== scorer);
      assist = weightedPick(
        creators,
        byId,
        (s) => s.species.attrs.PAS * c.match.assistLineFactor[s.line],
        rng,
      ).species.id;
    }
    return { side: "user", minute, penalty, scorer: scorer.species.id, assist };
  };
}

function oppAttribution(
  rng: EngineRng,
  c: EngineCoefficients,
): (minute: number, penalty: boolean) => GoalEvent {
  const weight = (shirt: Shirt): number => c.match.oppScorerWeights[shirt - 1]!;
  const [penaltyTaker] = canonicalSortBy(SHIRTS, (shirt) => [-weight(shirt), shirt]);
  return (minute, penalty) => {
    if (penalty) return { side: "opp", minute, penalty, scorer: penaltyTaker!, assist: null };
    const scorer = weightedPick(SHIRTS, Number, weight, rng);
    let assist: Shirt | null = null;
    if (rng.next() < c.match.assistProb) {
      assist = rng.pick(SHIRTS.filter((s) => s !== KEEPER_SHIRT && s !== scorer));
    }
    return { side: "opp", minute, penalty, scorer, assist };
  };
}

function convertProb(edge: number, c: EngineCoefficients): number {
  const { base, band } = c.shootout;
  return clamp(base + (band * edge) / PERCENT, base - band, base + band);
}

function shootout(input: MatchInput, rng: EngineRng, c: EngineCoefficients): Shootout {
  const userTakers = canonicalSortBy(input.starters, (s) => [-s.species.attrs.SHO, s.species.id]);
  const pOpp = convertProb(
    input.opponent.lines.ATT - (input.keeper.attrs.REF + input.keeper.attrs.DIV) / 2,
    c,
  );
  const kicks: PenKick[] = [];
  let user = 0;
  let opp = 0;
  let userKicks = 0;
  let oppKicks = 0;

  const kickUser = (scoredOverride?: boolean): void => {
    const taker = userTakers[userKicks % userTakers.length]!.species;
    const scored =
      scoredOverride ?? rng.next() < convertProb(taker.attrs.SHO - input.opponent.lines.GK, c);
    if (scored) user++;
    userKicks++;
    kicks.push({ side: "user", taker: taker.id, scored });
  };
  const kickOpp = (scoredOverride?: boolean): void => {
    const taker = OPP_SHOOTOUT_ORDER[oppKicks % OPP_SHOOTOUT_ORDER.length]!;
    const scored = scoredOverride ?? rng.next() < pOpp;
    if (scored) opp++;
    oppKicks++;
    kicks.push({ side: "opp", taker, scored });
  };

  const regulation = c.shootout.kicks;
  const clinched = (): boolean =>
    user > opp + (regulation - oppKicks) || opp > user + (regulation - userKicks);
  while ((userKicks < regulation || oppKicks < regulation) && !clinched()) {
    if (userKicks <= oppKicks) kickUser();
    else kickOpp();
  }
  for (let round = 0; user === opp && round < c.shootout.maxSuddenDeath; round++) {
    kickUser();
    kickOpp();
  }
  if (user === opp) {
    kickUser(true);
    kickOpp(false);
  }
  return { user, opp, keeper: input.keeper.id, kicks };
}

function count(goals: readonly GoalEvent[]): Score {
  return {
    user: goals.filter((g) => g.side === "user").length,
    opp: goals.filter((g) => g.side === "opp").length,
  };
}

function outcomeOf(score: Score): "W" | "D" | "L" {
  if (score.user > score.opp) return "W";
  if (score.user < score.opp) return "L";
  return "D";
}

export function simulateMatch(
  input: MatchInput,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): PlayedMatch {
  const scope = `match:${input.matchIndex}`;
  const rngs: Streams = {
    struct: createEngineRng(deriveSubseed(input.seed, "match_sim", scope)),
    event: createEngineRng(deriveSubseed(input.seed, "event_gen", scope)),
  };
  const [lambdaUser, lambdaOpp] = matchLambdas(
    input.userLines,
    input.opponent.lines,
    input.phase,
    rngs.struct,
    c,
  );
  const scoreUser = userAttribution(input.starters, rngs.event, c);
  const scoreOpp = oppAttribution(rngs.event, c);

  const full: Period = { first: 1, last: REGULATION_MINUTES, chances: c.match.chances.regulation };
  const goals = [
    ...chances(lambdaUser, full, rngs, c, scoreUser),
    ...chances(lambdaOpp, full, rngs, c, scoreOpp),
  ];
  const regulation = count(goals);

  let extraTime: Score | null = null;
  let penalties: Shootout | null = null;
  let outcome = outcomeOf(regulation);
  if (input.phase === "knockout" && outcome === "D") {
    const extra: Period = {
      first: REGULATION_MINUTES + 1,
      last: EXTRA_TIME_LAST_MINUTE,
      chances: c.match.chances.extraTime,
    };
    const etGoals = [
      ...chances(lambdaUser * c.match.extraTimeFraction, extra, rngs, c, scoreUser),
      ...chances(lambdaOpp * c.match.extraTimeFraction, extra, rngs, c, scoreOpp),
    ];
    goals.push(...etGoals);
    extraTime = count(etGoals);
    outcome = outcomeOf(extraTime);
    if (outcome === "D") {
      penalties = shootout(input, rngs.struct, c);
      outcome = outcomeOf(penalties);
    }
  }

  const ordered = [...goals].sort(
    (a, b) =>
      a.minute - b.minute ||
      (a.side === b.side ? 0 : a.side === "user" ? -1 : 1) ||
      a.scorer - b.scorer,
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
