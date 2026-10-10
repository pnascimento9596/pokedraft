import "server-only";
import type { CupResult, CupRound, MatchResult, Mode, Opponent, Seed, Shootout } from "../types";

// Result shapes of the retained engines (engine-1, engine-2), described against today's types.
// Their bundles carry their own copy of the branded ids, so the dispatcher bridges brands with
// one cast to these types; every shape change is then made here, type-checked.
type LivePlayed = Extract<MatchResult, { status: "played" }>;
type LegacyShootout = Omit<Shootout, "decider" | "coinWinner">;
type LegacyPlayed = Omit<LivePlayed, "shootout"> & { readonly shootout: LegacyShootout | null };
interface LegacyNotPlayed {
  readonly status: "notPlayed";
  readonly round: CupRound;
  readonly opponent: null;
}
export type LegacyCupResult = Omit<CupResult, "matches"> & {
  readonly matches: readonly (LegacyPlayed | LegacyNotPlayed)[];
};
export type LegacyLadder = (seed: Seed, mode: Mode) => Readonly<Record<CupRound, Opponent>>;

// Engine-1 and engine-2 played 5 regulation kicks, then at most 20 level pairs, then awarded
// the user one scored kick against one missed kick. Only that award goes past 25 user kicks.
const LEGACY_REGULATION_KICKS = 5;
const LEGACY_SUDDEN_DEATH_CAP = 20;

function legacyShootout(s: LegacyShootout): Shootout {
  const userKicks = s.kicks.filter((k) => k.side === "user").length;
  const decree = userKicks > LEGACY_REGULATION_KICKS + LEGACY_SUDDEN_DEATH_CAP;
  return { ...s, decider: decree ? "decree" : "kicks", coinWinner: null };
}

export function fromLegacy(cup: LegacyCupResult, ladderOf: LegacyLadder): CupResult {
  let ladder: Readonly<Record<CupRound, Opponent>> | undefined;
  const opponent = (round: CupRound): Opponent => (ladder ??= ladderOf(cup.seed, cup.mode))[round];
  return {
    ...cup,
    matches: cup.matches.map((m): MatchResult =>
      m.status === "notPlayed"
        ? { ...m, opponent: opponent(m.round) }
        : { ...m, shootout: m.shootout === null ? null : legacyShootout(m.shootout) },
    ),
  };
}
