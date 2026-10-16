import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { recapLines } from "./recap";
import { canonicalSortBy, createEngineRng, deriveSubseed, type EngineRng } from "./rng";
import type {
  Absence,
  CupRound,
  GoalEvent,
  GoalKind,
  Line,
  LineStrength,
  MatchResult,
  Opponent,
  PenKick,
  Role,
  Score,
  SaveEvent,
  Seed,
  Shootout,
  Species,
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
  readonly starters: readonly MatchStarter[];
  readonly keeper: Species;
  readonly opponent: Opponent;
  /** The Boss Club's own eleven, in lineup order; the live engine always fields species. */
  readonly opponentStarters: readonly MatchStarter[];
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
  nonGoal: (minute: number) => void,
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
    } else {
      nonGoal(minute);
    }
  }
  return goals;
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

function saveAttribution(
  side: "user" | "opp",
  attackers: readonly MatchStarter[],
  keeper: Species,
  rng: EngineRng,
  c: EngineCoefficients,
  saves: SaveEvent[],
): (minute: number) => void {
  const shooters = attackers.filter((s) => c.match.roleFactor[s.role] > 0);
  if (shooters.length === 0) throw new RangeError("save attribution needs eligible shooters");
  return (minute) => {
    const attacker = weightedPick(
      shooters,
      (s) => s.species.id,
      (s) => Math.max(1, s.species.attrs.SHO) * c.match.roleFactor[s.role],
      rng,
    ).species;
    if (rng.next() < saveProbability(attacker, keeper)) {
      saves.push({ kind: "save", side, minute, attacker: attacker.id, keeper: keeper.id });
    }
  };
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

function attribution(
  side: "user" | "opp",
  starters: readonly MatchStarter[],
  rng: EngineRng,
  c: EngineCoefficients,
): (minute: number, penalty: boolean) => GoalEvent {
  const shooters = starters.filter((s) => c.match.roleFactor[s.role] > 0);
  const [penaltyTaker] = canonicalSortBy(starters, (s) => [-s.species.attrs.SHO, s.species.id]);
  return (minute, penalty) => {
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
      ? penaltyTaker!
      : weightedPick(
          shooters,
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
    const assisted = (kind === "open-play" || kind === "header") && rng.next() < c.match.assistProb;
    const assist = assisted
      ? weightedPick(
          starters.filter((s) => s !== scorer && c.match.assistRoleFactor[s.role] > 0),
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
  };
}

function convertProb(edge: number, c: EngineCoefficients): number {
  const { base, band } = c.shootout;
  return clamp(base + (band * edge) / PERCENT, base - band, base + band);
}

function shootout(input: MatchInput, rng: EngineRng, c: EngineCoefficients): Shootout {
  const userTakers = canonicalSortBy(input.starters, (s) => [-s.species.attrs.SHO, s.species.id]);
  const oppTakers = canonicalSortBy(input.opponentStarters, (s) => [
    -s.species.attrs.SHO,
    s.species.id,
  ]);
  const opponentKeeper = input.opponentStarters.find((s) => s.role === "GK")?.species;
  if (!opponentKeeper) throw new RangeError("opponent must field a goalkeeper");
  const kicks: PenKick[] = [];
  let user = 0;
  let opp = 0;
  let userKicks = 0;
  let oppKicks = 0;

  const kickUser = (): void => {
    const taker = userTakers[userKicks % userTakers.length]!.species;
    const scored = rng.next() < convertProb(penaltyEdge(taker, opponentKeeper), c);
    if (scored) user++;
    userKicks++;
    kicks.push({ side: "user", taker: taker.id, scored });
  };
  const kickOpp = (): void => {
    const taker = oppTakers[oppKicks % oppTakers.length]!;
    const scored = rng.next() < convertProb(penaltyEdge(taker.species, input.keeper), c);
    if (scored) opp++;
    oppKicks++;
    kicks.push({ side: "opp", taker: { kind: "species", id: taker.species.id }, scored });
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
  // Still level at the cap: a coin from the same stream, with no side favoured.
  const coinWinner = user === opp ? (rng.next() < 0.5 ? "user" : "opp") : null;
  return {
    user,
    opp,
    keeper: input.keeper.id,
    kicks,
    decider: coinWinner === null ? "kicks" : "coin",
    coinWinner,
  };
}

function count(goals: readonly GoalEvent[]): Score {
  return {
    user: goals.filter((g) => g.side === "user").length,
    opp: goals.filter((g) => g.side === "opp").length,
  };
}

function goalTieKey(g: GoalEvent): readonly [number, number] {
  if (g.side === "user") return [0, g.scorer];
  return g.scorer.kind === "species" ? [0, g.scorer.id] : [1, g.scorer.number];
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
  const saves: SaveEvent[] = [];
  const opponentKeeper = input.opponentStarters.find((s) => s.role === "GK")?.species;
  if (!opponentKeeper) throw new RangeError("opponent must field a goalkeeper");
  // Each keeper draws from its own stream, so one side's chance count never shifts the other's saves.
  const saveRng = (side: "user" | "opp") =>
    createEngineRng(deriveSubseed(input.seed, "save_events", `${scope}:${side}`));
  const saveUser = saveAttribution(
    "user",
    input.opponentStarters,
    input.keeper,
    saveRng("user"),
    c,
    saves,
  );
  const saveOpp = saveAttribution("opp", input.starters, opponentKeeper, saveRng("opp"), c, saves);
  const scoreUser = attribution("user", input.starters, rngs.event, c);
  const scoreOpp = attribution("opp", input.opponentStarters, rngs.event, c);

  const full: Period = { first: 1, last: REGULATION_MINUTES, chances: c.match.chances.regulation };
  const goals = [
    ...chances(lambdaUser, full, rngs, c, scoreUser, saveOpp),
    ...chances(lambdaOpp, full, rngs, c, scoreOpp, saveUser),
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
      ...chances(
        lambdaUser * c.match.extraTimeFraction * extraTimeFactor(input.starters),
        extra,
        rngs,
        c,
        scoreUser,
        saveOpp,
      ),
      ...chances(
        lambdaOpp * c.match.extraTimeFraction * extraTimeFactor(input.opponentStarters),
        extra,
        rngs,
        c,
        scoreOpp,
        saveUser,
      ),
    ];
    goals.push(...etGoals);
    extraTime = count(etGoals);
    outcome = outcomeOf(extraTime);
    if (outcome === "D") {
      penalties = shootout(input, rngs.struct, c);
      outcome =
        penalties.coinWinner === null
          ? outcomeOf(penalties)
          : penalties.coinWinner === "user"
            ? "W"
            : "L";
    }
  }

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
