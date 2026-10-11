import { randomUUID } from "node:crypto";

// One JSON line per server error, read from the Vercel runtime log. Driver messages embed the SQL
// parameters (nickname, IP hash, token), so only the error name and the SQLSTATE are written.

export function requestIdOf(headers: Headers): string {
  return headers.get("x-vercel-id") ?? `local-${randomUUID()}`;
}

function sqlstate(e: unknown): string | null {
  for (
    let cur: unknown = e, depth = 0;
    typeof cur === "object" && cur !== null && depth < 5;
    depth++
  ) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

export function logServerError(where: string, requestId: string, e: unknown): void {
  const name = e instanceof Error ? e.name : typeof e;
  console.error(JSON.stringify({ level: "error", where, requestId, name, sqlstate: sqlstate(e) }));
}
