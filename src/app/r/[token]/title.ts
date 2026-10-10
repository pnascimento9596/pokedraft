import { replay } from "@/engine";
import { FRIENDLY_LABEL, record } from "@/ui/labels";

export function runTitle(token: string): string {
  try {
    const { draft, cup } = replay(token);
    const line = `${record(cup.wins, cup.draws, cup.losses)}, Team Score ${cup.rating.score}`;
    if (draft.settings.mode === "builder") return `pokedraft ${FRIENDLY_LABEL}: ${line}`;
    return `pokedraft run: ${line}`;
  } catch {
    return "pokedraft: broken run link";
  }
}
