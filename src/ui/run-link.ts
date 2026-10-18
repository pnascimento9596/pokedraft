export function runHref(token: string): string {
  const [version, payload] = token.split(".");
  return `/r/${version}?t=${payload}`;
}

export function runTokenFromUrl(url: Pick<URL, "pathname" | "searchParams">): string | null {
  const match = /^\/r\/([^/]+)$/.exec(url.pathname);
  if (match === null) return null;
  try {
    const token = decodeURIComponent(match[1]!);
    if (!/^pd\d+$/.test(token)) return token;
    const payloads = url.searchParams.getAll("t");
    if (payloads.length !== 1 || !/^[A-Za-z0-9_-]+$/.test(payloads[0]!)) return null;
    return `${token}.${payloads[0]}`;
  } catch {
    return null;
  }
}

/** A goal's link: the run link, then the played match to watch and the goal's minute. */
export function goalHref(token: string, watch: number, minute: number): string {
  return `${runHref(token)}&watch=${watch}&at=${minute}`;
}

type QueryValue = string | readonly string[] | undefined;

// Plain decimal digits only, so "1.5", "-1", "0049" and repeated keys fall back.
function count(v: QueryValue): number | null {
  return typeof v === "string" && /^(0|[1-9]\d{0,2})$/.test(v) ? Number(v) : null;
}

/**
 * The replay a goal link opens: `watch` counts played matches from 0 and `at` is a minute inside
 * that match. Anything else is null, and the page opens as a plain shared run.
 */
export function watchAt(
  watch: QueryValue,
  at: QueryValue,
  cup: { readonly matches: readonly { readonly status: string; readonly extraTime?: unknown }[] },
): { readonly matchIndex: number; readonly minute: number } | null {
  const w = count(watch);
  const minute = count(at);
  if (w === null || minute === null) return null;
  const played = cup.matches.flatMap((m, i) => (m.status === "played" ? [i] : []));
  const matchIndex = played[w];
  if (matchIndex === undefined) return null;
  const last = cup.matches[matchIndex]!.extraTime === null ? 90 : 120;
  return minute <= last ? { matchIndex, minute } : null;
}

/** The `watch` number of the match at `matchIndex`: how many played matches come before it. */
export function watchIndex(
  cup: { readonly matches: readonly { readonly status: string }[] },
  matchIndex: number,
): number {
  return cup.matches.slice(0, matchIndex).filter((m) => m.status === "played").length;
}
