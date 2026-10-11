// Sink for the report-only CSP (next.config.ts). Each violation becomes one summary line in the
// runtime log: the directive, the blocked origin and the page path, never a query string.
const MAX_BYTES = 8 * 1024;
const MAX_LINES = 5;

type Fields = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function originOrKeyword(v: string | null): string | null {
  if (v === null) return null;
  try {
    const url = new URL(v);
    return url.protocol.startsWith("http") ? url.origin : url.protocol.replace(":", "");
  } catch {
    return v.slice(0, 40);
  }
}

function pathOf(v: string | null): string | null {
  if (v === null) return null;
  try {
    return new URL(v).pathname.slice(0, 200);
  } catch {
    return null;
  }
}

// Three shapes reach report-uri: legacy { "csp-report": {...} } (Chromium), WebKit's
// { type, url, "csp-report": {...} }, and Reporting API objects { type, body } (single or batched).
function violation(r: unknown): Fields | null {
  const o = r as { type?: unknown; body?: Fields; "csp-report"?: Fields } | null;
  const legacy = o?.["csp-report"];
  if (legacy !== undefined && legacy !== null && typeof legacy === "object") {
    return {
      directive: legacy["effective-directive"] ?? legacy["violated-directive"],
      blocked: legacy["blocked-uri"],
      page: legacy["document-uri"],
      disposition: legacy.disposition,
    };
  }
  if (o?.type === "csp-violation" && o.body !== undefined && o.body !== null) {
    return {
      directive: o.body.effectiveDirective,
      blocked: o.body.blockedURL,
      page: o.body.documentURL,
      disposition: o.body.disposition,
    };
  }
  return null;
}

function violations(raw: unknown): Fields[] {
  return [raw].flat().flatMap((r): Fields[] => {
    const v = violation(r);
    return v === null ? [] : [v];
  });
}

export async function POST(req: Request): Promise<Response> {
  const done = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return done;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return done;
  }
  for (const v of violations(raw).slice(0, MAX_LINES)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        where: "csp-report",
        directive: str(v.directive)?.slice(0, 40) ?? null,
        blocked: originOrKeyword(str(v.blocked)),
        page: pathOf(str(v.page)),
        disposition: str(v.disposition),
      }),
    );
  }
  return done;
}
