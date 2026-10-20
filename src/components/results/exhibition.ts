import {
  FORMATIONS,
  speciesById,
  type GoalEvent,
  type OpponentPlayerRef,
  type Score,
  type Seed,
  type Shootout,
} from "@/engine";
import { simulateMatch, type MatchStarter, type Phase } from "@/engine/match";
import { matchLines, rateTeam } from "@/engine/team";
import type { FullLineup } from "@/engine";
import type { ExhibitionFixture } from "@/ui/manager/exhibition-decide";
import type { PlayedMatch } from "./format";

export type ExhibitionFormat = "single" | "two-legs";
export type TieDecision = "aggregate" | "extra-time" | "penalties";

type Fixture = ExhibitionFixture;

interface Scope {
  readonly seed: Seed;
  readonly own: FullLineup;
  readonly other: FullLineup;
  readonly rematch: number;
}

export interface TwoLegTie {
  readonly legs: readonly [PlayedMatch, PlayedMatch];
  /** Leg 2 as shown: its 90 minutes, plus extra time and penalties when the aggregate was level. */
  readonly leg2: {
    readonly score: Score;
    readonly goals: readonly GoalEvent[];
    readonly extraTime: boolean;
    readonly shootout: Shootout | null;
  };
  /** The knockout simulation whose extra time and shootout leg 2 used, or null. */
  readonly decider: PlayedMatch | null;
  readonly aggregate: Score;
  readonly decidedBy: TieDecision;
  readonly winner: "user" | "opp";
}

// The cap only guards termination. The engine clamps both expected-goal rates, so a level 90
// minutes always has a real chance: about 1 in 70 for the widest mismatch measured (820 against
// 174), which makes reaching this cap a probability near e^-285.
export const TIE_BREAK_ATTEMPTS = 20_000;

function starters(lineup: FullLineup): MatchStarter[] {
  const formation = FORMATIONS[lineup.formation];
  return lineup.starters.map((id, i) => ({
    species: speciesById(id),
    line: formation.slots[i]!.line,
    role: formation.slots[i]!.role,
  }));
}

export function exhibitionFixture(
  own: FullLineup,
  other: FullLineup,
  otherName: string,
): Fixture | null {
  const rating = rateTeam(own);
  const opposition = rateTeam(other);
  const ownStarters = starters(own);
  const keeper = ownStarters.find((player) => player.line === "GK");
  if (keeper === undefined) return null;
  return {
    matchIndex: 0,
    round: "F",
    rating: rating.score,
    userLines: matchLines(rating),
    starters: ownStarters,
    keeper: keeper.species,
    opponent: {
      id: "exhibition",
      name: otherName,
      score: opposition.score,
      lines: matchLines(opposition),
      roster: other.starters.map((id) => ({ kind: "species", id }) as OpponentPlayerRef),
    },
    opponentStarters: starters(other),
    absences: [],
    lineup: own,
  };
}

function play(fixture: Fixture, phase: Phase, scope: readonly unknown[]): PlayedMatch {
  return simulateMatch({ ...fixture, phase, seed: JSON.stringify(scope) as Seed });
}

// The scope is the one the single exhibition has always used.
export function singleSeed(scope: Scope): Seed {
  return JSON.stringify([scope.seed, scope.own, scope.other, scope.rematch]) as Seed;
}

export function playSingle(fixture: Fixture, scope: Scope): PlayedMatch {
  return simulateMatch({ ...fixture, phase: "group", seed: singleSeed(scope) });
}

export function legSeed(scope: Scope, leg: 1 | 2): Seed {
  return JSON.stringify([...twoLegBase(scope), leg]) as Seed;
}

function twoLegBase(scope: Scope) {
  return [scope.seed, scope.own, scope.other, scope.rematch, "two-legs"] as const;
}

function add(a: Score, b: Score): Score {
  return { user: a.user + b.user, opp: a.opp + b.opp };
}

// Each leg is a 90-minute group-phase match in its own scope. The engine only plays extra time
// when a knockout match is level after its own 90 minutes, so a level aggregate takes its extra
// time and penalties from the first knockout simulation, in its own numbered scope, whose 90
// minutes ended level. Only that match's minutes 91 to 120 and its shootout are used.
export function playTwoLegs(fixture: Fixture, scope: Scope): TwoLegTie {
  const base = twoLegBase(scope);
  const legs = [
    simulateMatch({ ...fixture, phase: "group", seed: legSeed(scope, 1) }),
    simulateMatch({ ...fixture, phase: "group", seed: legSeed(scope, 2) }),
  ] as const;
  const afterNinety = add(legs[0].regulation, legs[1].regulation);
  if (afterNinety.user !== afterNinety.opp) {
    return {
      legs,
      leg2: { score: legs[1].regulation, goals: legs[1].goals, extraTime: false, shootout: null },
      decider: null,
      aggregate: afterNinety,
      decidedBy: "aggregate",
      winner: afterNinety.user > afterNinety.opp ? "user" : "opp",
    };
  }
  for (let attempt = 0; attempt < TIE_BREAK_ATTEMPTS; attempt++) {
    const decider = play(fixture, "knockout", [...base, "tie-break", attempt]);
    if (decider.extraTime === null) continue;
    if (decider.outcome === "D") throw new RangeError("a knockout match ended level");
    const extraGoals = decider.goals.filter((goal) => goal.minute > 90);
    return {
      legs,
      leg2: {
        score: add(legs[1].regulation, decider.extraTime),
        goals: [...legs[1].goals, ...extraGoals],
        extraTime: true,
        shootout: decider.shootout,
      },
      decider,
      aggregate: add(afterNinety, decider.extraTime),
      decidedBy: decider.shootout === null ? "extra-time" : "penalties",
      winner: decider.outcome === "W" ? "user" : "opp",
    };
  }
  throw new RangeError(`no level knockout match in ${TIE_BREAK_ATTEMPTS} tie-break attempts`);
}
