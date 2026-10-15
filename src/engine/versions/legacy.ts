import "server-only";
import type {
  CupResult,
  CupRound,
  GoalEvent,
  MatchResult,
  Mode,
  Opponent,
  OpponentPlayerRef,
  PenKick,
  Seed,
  Shirt,
  Shootout,
} from "../types";

// Result shapes of the retained engines (engine-1, engine-2, engine-3), described against today's
// types. Their bundles carry their own copy of the branded ids, so the dispatcher bridges brands with
// one cast to these types; every shape change is then made here, type-checked.
type LivePlayed = Extract<MatchResult, { status: "played" }>;
type UserGoal = Extract<GoalEvent, { side: "user" }>;
export type UserKick = Extract<PenKick, { side: "user" }>;

// A retained engine's opponents had no Pokemon to field: shirt numbers only.
type LegacyOppGoal = Omit<Extract<GoalEvent, { side: "opp" }>, "scorer" | "assist"> & {
  readonly scorer: Shirt;
  readonly assist: Shirt | null;
};
export type LegacyOppKick = Omit<Extract<PenKick, { side: "opp" }>, "taker"> & {
  readonly taker: Shirt;
};
type LegacyShootout = Omit<Shootout, "decider" | "coinWinner" | "kicks"> & {
  readonly kicks: readonly (UserKick | LegacyOppKick)[];
};
type LegacyPlayed = Omit<LivePlayed, "shootout" | "goals" | "opponent"> & {
  readonly opponent: Omit<Opponent, "roster">;
  readonly goals: readonly (UserGoal | LegacyOppGoal)[];
  readonly shootout: LegacyShootout | null;
};
interface LegacyNotPlayed {
  readonly status: "notPlayed";
  readonly round: CupRound;
  readonly opponent: null;
}
export type LegacyCupResult = Omit<CupResult, "matches" | "awards"> & {
  readonly matches: readonly (LegacyPlayed | LegacyNotPlayed)[];
  readonly awards: Omit<CupResult["awards"], "potContribution">;
};
type LegacyV3Shootout = LegacyShootout & Pick<Shootout, "decider" | "coinWinner">;
type LegacyV3Played = Omit<LegacyPlayed, "shootout"> & {
  readonly shootout: LegacyV3Shootout | null;
};
export type LegacyV3CupResult = Omit<LegacyCupResult, "matches" | "awards"> & {
  readonly matches: readonly (LegacyV3Played | LegacyNotPlayed)[];
  readonly awards: CupResult["awards"];
};
export type LegacyLadder = (
  seed: Seed,
  mode: Mode,
) => Readonly<Record<CupRound, Omit<Opponent, "roster">>>;

// Engine-1 and engine-2 played 5 regulation kicks, then at most 20 level pairs, then awarded
// the user one scored kick against one missed kick. Only that award goes past 25 user kicks.
const LEGACY_REGULATION_KICKS = 5;
const LEGACY_SUDDEN_DEATH_CAP = 20;

const SHIRT_ROSTER: readonly OpponentPlayerRef[] = Array.from(
  { length: 11 },
  (_, i): OpponentPlayerRef => ({ kind: "shirt", number: (i + 1) as Shirt }),
);
export { SHIRT_ROSTER as LEGACY_SHIRT_ROSTER };

const legacyRef = (shirt: Shirt): OpponentPlayerRef => ({ kind: "shirt", number: shirt });

const legacyGoal = (g: UserGoal | LegacyOppGoal): GoalEvent =>
  g.side === "user"
    ? g
    : {
        ...g,
        scorer: legacyRef(g.scorer),
        assist: g.assist === null ? null : legacyRef(g.assist),
      };

const legacyKick = (k: UserKick | LegacyOppKick): PenKick =>
  k.side === "user" ? k : { ...k, taker: legacyRef(k.taker) };

function legacyShootout(s: LegacyShootout | LegacyV3Shootout, version: 1 | 2 | 3): Shootout {
  if (version === 3 && "decider" in s) return { ...s, kicks: s.kicks.map(legacyKick) };
  const userKicks = s.kicks.filter((k) => k.side === "user").length;
  const decree = userKicks > LEGACY_REGULATION_KICKS + LEGACY_SUDDEN_DEATH_CAP;
  return {
    ...s,
    kicks: s.kicks.map(legacyKick),
    decider: decree ? "decree" : "kicks",
    coinWinner: null,
  };
}

const legacyOpponent = (o: Omit<Opponent, "roster">): Opponent => ({ ...o, roster: SHIRT_ROSTER });

export function fromLegacy(cup: LegacyCupResult, ladderOf: LegacyLadder): CupResult;
export function fromLegacy(cup: LegacyV3CupResult, ladderOf: LegacyLadder, version: 3): CupResult;
export function fromLegacy(
  cup: LegacyCupResult | LegacyV3CupResult,
  ladderOf: LegacyLadder,
  version: 1 | 2 | 3 = 1,
): CupResult {
  let ladder: Readonly<Record<CupRound, Omit<Opponent, "roster">>> | undefined;
  const opponent = (round: CupRound): Opponent =>
    legacyOpponent((ladder ??= ladderOf(cup.seed, cup.mode))[round]);
  return {
    ...cup,
    awards: {
      ...cup.awards,
      potContribution:
        version === 3 && "potContribution" in cup.awards ? cup.awards.potContribution : null,
    },
    matches: cup.matches.map((m): MatchResult =>
      m.status === "notPlayed"
        ? { ...m, opponent: opponent(m.round) }
        : {
            ...m,
            opponent: legacyOpponent(m.opponent),
            goals: m.goals.map(legacyGoal),
            shootout: m.shootout === null ? null : legacyShootout(m.shootout, version),
          },
    ),
  };
}
