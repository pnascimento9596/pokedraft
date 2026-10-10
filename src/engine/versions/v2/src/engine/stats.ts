import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";
import { canonicalSortBy } from "./rng";
import type { Awards, PlayerLine } from "./types";

export interface PlayerTally extends PlayerLine {
  readonly cleanSheetPoints: number;
  readonly quality: number;
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
  const points = (t: PlayerTally): number =>
    c.awards.goal * t.goals + c.awards.assist * t.assists + t.cleanSheetPoints;
  const star = best(tallies, (t) => [-points(t), -t.quality, t.species]);
  if (star === undefined) throw new RangeError("awards() needs at least one player");
  return {
    goldenBoot: scorer ? line(scorer) : null,
    topAssister: creator ? line(creator) : null,
    playerOfTournament: line(star),
  };
}
