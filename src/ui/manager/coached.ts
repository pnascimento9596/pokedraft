import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION } from "@/engine/types";

/**
 * Whether a stored run was coached from the touchline: its token carries at least one manager
 * decision. Read from the token at read time, so no column holds it. Tokens older than manager
 * mode, and any token that does not decode, were not coached.
 */
export function isCoached(token: string): boolean {
  if (!token.startsWith(`pd${RUN_TOKEN_VERSION}.`)) return false;
  try {
    return (decodeToken(token).manager?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
