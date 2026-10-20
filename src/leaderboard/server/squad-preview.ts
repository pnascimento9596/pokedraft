import "server-only";
import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, SQUAD_SIZE, type RunToken } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";

// Stored ranked tokens passed submission replay. Their pick actions describe membership;
// swaps only move those species. This avoids simulating cups when reading the board.
function squadOf(run: RunToken): readonly number[] | undefined {
  if (run.settings.mode === "builder") return undefined;
  if (run.actions.some((action) => action.type === "place" || action.type === "clear"))
    return undefined;
  const ids = run.actions.flatMap((action) => (action.type === "pick" ? [action.species] : []));
  return ids.length === SQUAD_SIZE && new Set(ids).size === SQUAD_SIZE ? ids : undefined;
}

/** A board row's squad preview from one decode of its stored token, or none when it does not decode. */
export function readStoredToken(token: string): readonly number[] | undefined {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version)) return undefined;
  try {
    return squadOf(decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`)));
  } catch {
    return undefined;
  }
}
