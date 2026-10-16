import "server-only";
import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, SQUAD_SIZE } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";

// Stored ranked tokens passed submission replay. Their pick actions describe membership;
// swaps only move those species. This avoids simulating cups when reading the board.
export function squadPreview(token: string): readonly number[] | undefined {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version)) return undefined;
  try {
    const run = decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`));
    if (run.settings.mode === "builder") return undefined;
    if (run.actions.some((action) => action.type === "place" || action.type === "clear"))
      return undefined;
    const ids = run.actions.flatMap((action) => (action.type === "pick" ? [action.species] : []));
    return ids.length === SQUAD_SIZE && new Set(ids).size === SQUAD_SIZE ? ids : undefined;
  } catch {
    return undefined;
  }
}
