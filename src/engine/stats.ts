import { canonicalSortBy } from "./rng";
import type { Awards, PlayerLine } from "./types";

export interface PlayerTally extends PlayerLine {
  readonly cleanSheetPoints: number;
  readonly quality: number;
}

export const AWARD_POINTS = {
  goal: 3,
  assist: 2,
  cleanSheet: { GK: 2, DEF: 1 },
} as const;

function line({ species, goals, assists, appearances }: PlayerTally): PlayerLine {
  return { species, goals, assists, appearances };
}

function best(
  tallies: readonly PlayerTally[],
  key: (t: PlayerTally) => readonly number[],
): PlayerTally | undefined {
  return canonicalSortBy(tallies, key)[0];
}

export function awards(tallies: readonly PlayerTally[]): Awards {
  const scorer = best(
    tallies.filter((t) => t.goals > 0),
    (t) => [-t.goals, -t.assists, t.appearances, t.species],
  );
  const creator = best(
    tallies.filter((t) => t.assists > 0),
    (t) => [-t.assists, -t.goals, t.appearances, t.species],
  );
  const points = (t: PlayerTally): number =>
    AWARD_POINTS.goal * t.goals + AWARD_POINTS.assist * t.assists + t.cleanSheetPoints;
  const star = best(tallies, (t) => [-points(t), -t.quality, t.species]);
  if (star === undefined) throw new RangeError("awards() needs at least one player");
  return {
    goldenBoot: scorer ? line(scorer) : null,
    topAssister: creator ? line(creator) : null,
    playerOfTournament: line(star),
  };
}
