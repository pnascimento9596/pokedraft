/**
 * `T` when every element is a positive integer literal, `never` otherwise. The leaderboard store
 * splices these versions into SQL text, so a fraction, a negative, zero or a widened `number`
 * must not compile. `coachedSqlFor` repeats the check at module load.
 */
export type PositiveIntegers<T extends readonly number[]> = {
  [K in keyof T]: `${T[K]}` extends `-${string}` | "0"
    ? false
    : `${T[K]}` extends `${bigint}`
      ? true
      : false;
}[number] extends true
  ? T
  : never;

const VERSIONS = [6] as const;

/**
 * Token versions whose payload carries the manager list as its fourth element:
 * `[compactSettings, seed, actions, manager?]`, with `manager` written only when non-empty. A new
 * token version that keeps this layout is appended here, so runs stored under a retained version
 * keep their Coached marker after the live decoder moves on.
 */
export const MANAGER_TOKEN_VERSIONS: PositiveIntegers<typeof VERSIONS> = VERSIONS;

const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

function payloadOf(token: string): string | null {
  for (const v of MANAGER_TOKEN_VERSIONS) {
    const prefix = `pd${v}.`;
    if (token.startsWith(prefix)) return token.slice(prefix.length);
  }
  return null;
}

/**
 * Whether a stored run was coached from the touchline: its token carries at least one manager
 * decision. Read from the token at read time, so no column holds it. The rule is the payload
 * array having more than three elements, read straight from the JSON without the live decoder,
 * so it also holds for retained versions. `coachedSql` in the leaderboard store is the same rule
 * in SQL, and a PGlite test pins the two together. Tokens of any other version, and any token that
 * does not parse, were not coached.
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
