import "server-only";
import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, SQUAD_SIZE, type RunToken } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { isCoached, MANAGER_TOKEN_VERSIONS } from "@/ui/manager/coached";

export interface StoredTokenView {
  readonly squadSpeciesIds: readonly number[] | undefined;
  readonly coached: boolean;
}

// Stored ranked tokens passed submission replay. Their pick actions describe membership;
// swaps only move those species. This avoids simulating cups when reading the board.
function squadOf(run: RunToken): readonly number[] | undefined {
  if (run.settings.mode === "builder") return undefined;
  if (run.actions.some((action) => action.type === "place" || action.type === "clear"))
    return undefined;
  const ids = run.actions.flatMap((action) => (action.type === "pick" ? [action.species] : []));
  return ids.length === SQUAD_SIZE && new Set(ids).size === SQUAD_SIZE ? ids : undefined;
}

/**
 * A board row's squad preview and Coached chip from one decode of its stored token. A token the
 * live decoder rejects has no preview and falls back to `isCoached`, which reads the raw payload.
 * The live decoder drops an empty manager list that `isCoached` would count; no canonical token
 * carries one, because `encodeToken` omits it.
 */
export function readStoredToken(token: string): StoredTokenView {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  const fallback = (): StoredTokenView => ({
    squadSpeciesIds: undefined,
    coached: isCoached(token),
  });
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version))
    return fallback();
  let run: RunToken;
  try {
    run = decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`));
  } catch {
    return fallback();
  }
  const managerVersion = (MANAGER_TOKEN_VERSIONS as readonly number[]).includes(version);
  return {
    squadSpeciesIds: squadOf(run),
    coached: managerVersion && run.manager !== undefined && run.manager.length > 0,
  };
}
