import "server-only";
import { SQUAD_SIZE, type RunToken } from "@/engine/types";

// Stored ranked tokens passed submission replay. Their pick actions describe membership;
// swaps only move those species. This avoids simulating cups when reading the board.
export function squadOf(run: RunToken): readonly number[] | undefined {
  if (run.settings.mode === "builder") return undefined;
  if (run.actions.some((action) => action.type === "place" || action.type === "clear"))
    return undefined;
  const ids = run.actions.flatMap((action) => (action.type === "pick" ? [action.species] : []));
  return ids.length === SQUAD_SIZE && new Set(ids).size === SQUAD_SIZE ? ids : undefined;
}
