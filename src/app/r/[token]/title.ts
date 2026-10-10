import type { ReplayedRun } from "@/components/share/card";
import { FRIENDLY_LABEL, record } from "@/ui/labels";

export function runTitle(run: ReplayedRun | null): string {
  if (run === null) return "pokedraft: broken run link";
  const { draft, cup } = run;
  const line = `${record(cup.wins, cup.draws, cup.losses)}, Team Score ${cup.rating.score}`;
  if (draft.settings.mode === "builder") return `pokedraft ${FRIENDLY_LABEL}: ${line}`;
  return `pokedraft run: ${line}`;
}
