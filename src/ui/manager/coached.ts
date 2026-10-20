/**
 * Token versions whose payload carries the manager list as its fourth element:
 * `[compactSettings, seed, actions, manager?]`, with `manager` written only when non-empty. A new
 * token version that keeps this layout is appended here, so runs stored under a retained version
 * keep their Coached marker after the live decoder moves on.
 */
export const MANAGER_TOKEN_VERSIONS: readonly number[] = [6, 7];

const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

function payloadOf(token: string): string | null {
  for (const v of MANAGER_TOKEN_VERSIONS) {
    const prefix = `pd${v}.`;
    if (token.startsWith(prefix)) return token.slice(prefix.length);
  }
  return null;
}

/**
 * Whether a run was coached from the touchline: its token carries at least one manager decision.
 * Submit stores it in the `coached` column, which the board filter and the Coached chip read. The
 * rule is the payload array having more than three elements, read straight from the JSON without
 * the live decoder, so it also holds for retained versions. Tokens of any other version, and any
 * token that does not parse, were not coached.
 */
export function isCoached(token: string): boolean {
  const body = payloadOf(token);
  if (body === null) return false;
  try {
    const b64 = body.replaceAll("-", "+").replaceAll("_", "/");
    const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const payload: unknown = JSON.parse(decoder.decode(bytes));
    return Array.isArray(payload) && payload.length > 3;
  } catch {
    return false;
  }
}
