import { FORMATION_IDS } from "@/engine/types";
import type { RunRecord } from "./runs";

export function careerSummary(runs: readonly RunRecord[]) {
  const ranked = runs.filter((run) => !run.friendly && run.bucket !== "builder");
  const species = new Map<number, { drafted: number; champion: number }>();
  let coveredRuns = 0;
  for (const run of ranked) {
    if (!run.squadSpeciesIds) continue;
    coveredRuns++;
    for (const id of run.squadSpeciesIds) {
      const previous = species.get(id) ?? { drafted: 0, champion: 0 };
      species.set(id, {
        drafted: previous.drafted + 1,
        champion: previous.champion + Number(run.finish === "champion"),
      });
    }
  }
  const formations = FORMATION_IDS.map((formation) => {
    const selected = ranked.filter((run) => run.formation === formation);
    const wins = selected.reduce((total, run) => total + run.wins, 0);
    const matches = selected.reduce((total, run) => total + run.wins + run.draws + run.losses, 0);
    return {
      formation,
      runs: selected.length,
      wins,
      matches,
      winRate: matches === 0 ? null : wins / matches,
    };
  }).filter((entry) => entry.runs > 0);
  return { rankedRuns: ranked.length, coveredRuns, species, formations };
}
