import { decodeToken, encodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, type RunToken } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";

/**
 * A live or retained token's settings, seed and actions, read without a replay, or null when it
 * does not decode. Every token version's wire format is a subset of the live one, so the live
 * codec reads any known version once its prefix is rewritten.
 */
export function readAnyToken(token: string): RunToken | null {
  return readVersioned(token)?.run ?? null;
}

/**
 * The run's one spelling, its own version prefix on the live codec's re-encoding, or null when it
 * does not decode. Two links to the same run can differ in JSON spacing.
 */
export function canonicalToken(token: string): string | null {
  const read = readVersioned(token);
  return read === null ? null : encodeToken(read.run).replace(/^pd\d+\./, `pd${read.version}.`);
}

function readVersioned(token: string): { readonly version: number; readonly run: RunToken } | null {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version)) return null;
  try {
    return { version, run: decodeToken(token, version) };
  } catch {
    return null;
  }
}
