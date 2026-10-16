import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { canonicalSortBy } from "./rng";
import type { Awards, Contribution, PlayerLine } from "./types";

export interface PlayerTally extends PlayerLine {
  readonly cleanSheets: number;
  readonly cleanSheetPoints: number;
  readonly minutes: number;
  readonly quality: number;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

export function contribution(
  t: PlayerTally,
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): Contribution {
  const minutes = t.minutes / c.awards.minutesPerPoint;
  return {
    species: t.species,
    goals: t.goals,
    assists: t.assists,
    cleanSheets: t.cleanSheets,
    minutes: t.minutes,
    points: {
      goals: c.awards.goal * t.goals,
      assists: c.awards.assist * t.assists,
      cleanSheets: t.cleanSheetPoints,
      minutes: round2(minutes),
    },
    total: round2(
      c.awards.goal * t.goals + c.awards.assist * t.assists + t.cleanSheetPoints + minutes,
    ),
  };
}

function line({ species, goals, assists, appearances }: PlayerTally): PlayerLine {
  return { species, goals, assists, appearances };
}

function best(
  tallies: readonly PlayerTally[],
  key: (t: PlayerTally) => readonly number[],
): PlayerTally | undefined {
  return canonicalSortBy(tallies, key)[0];
}

export function awards(
  tallies: readonly PlayerTally[],
  c: EngineCoefficients = ENGINE_COEFFICIENTS,
): Awards {
  const scorer = best(
    tallies.filter((t) => t.goals > 0),
    (t) => [-t.goals, -t.assists, t.appearances, t.species],
  );
  const creator = best(
    tallies.filter((t) => t.assists > 0),
    (t) => [-t.assists, -t.goals, t.appearances, t.species],
  );
  const star = best(tallies, (t) => [-contribution(t, c).total, -t.quality, t.species]);
  if (star === undefined) throw new RangeError("awards() needs at least one player");
  return {
    goldenBoot: scorer ? line(scorer) : null,
    topAssister: creator ? line(creator) : null,
    playerOfTournament: line(star),
    potContribution: contribution(star, c),
  };
}
