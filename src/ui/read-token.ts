import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, type RunToken } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";

/**
 * A live or retained token's settings, seed and actions, read without a replay, or null when it
 * does not decode. Every token version's wire format is a subset of the live one, so the live
 * codec reads any known version once its prefix is rewritten.
 */
export function readAnyToken(token: string): RunToken | null {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version)) return null;
  try {
    return decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`));
  } catch {
    return null;
  }
}
