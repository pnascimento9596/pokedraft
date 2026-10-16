import { FORMATION_IDS, type FormationId } from "@/engine/types";
import type { FormationTotals, LifetimeTotals } from "./lifetime";
import type { RunRecord } from "./runs";

// Formation win rates read the lifetime totals when this browser has them, so they keep counting
// past the 50 retained runs. Species counts need squads, which only the retained history holds.
export function careerSummary(runs: readonly RunRecord[], lifetime: LifetimeTotals | null = null) {
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
  const fromHistory = (formation: FormationId): FormationTotals => {
    const selected = ranked.filter((run) => run.formation === formation);
    return {
      runs: selected.length,
      wins: selected.reduce((total, run) => total + run.wins, 0),
      draws: selected.reduce((total, run) => total + run.draws, 0),
      losses: selected.reduce((total, run) => total + run.losses, 0),
    };
  };
  const formations = FORMATION_IDS.map((formation) => {
    const tally =
      lifetime === null
        ? fromHistory(formation)
        : (lifetime.formations[formation] ?? { runs: 0, wins: 0, draws: 0, losses: 0 });
    const matches = tally.wins + tally.draws + tally.losses;
    return {
      formation,
      runs: tally.runs,
      wins: tally.wins,
      matches,
      winRate: matches === 0 ? null : tally.wins / matches,
    };
  }).filter((entry) => entry.runs > 0);
  return {
    rankedRuns: ranked.length,
    coveredRuns,
    species,
    formations,
    formationSource: lifetime === null ? ("history" as const) : ("lifetime" as const),
  };
}
