import { NextResponse } from "next/server";
import { clientIp, hashIp, usableSecret } from "@/leaderboard/server/handlers";
import {
  PASSCODE_COOKIE,
  PASSCODE_MAX_AGE,
  passcodeDigest,
  passcodeMatches,
  safeNext,
} from "@/passcode";
import type { RateLimiter } from "@/ratelimit/store";

export const GATE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 } as const;

export interface UnlockDeps {
  readonly limiter: RateLimiter;
  readonly now: () => Date;
  readonly passcode: string | undefined;
  readonly ipHashSecret: string | undefined;
}

function back(req: Request, next: string, error: string): NextResponse {
  const url = new URL("/gate", req.url);
  url.searchParams.set("next", next);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function handleUnlock(req: Request, deps: UnlockDeps): Promise<NextResponse> {
  const form = await req.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const { passcode } = deps;
  if (!passcode) return NextResponse.redirect(new URL(next, req.url), 303);

  // Every attempt counts, right or wrong. If the limiter cannot run, the gate stays shut.
  if (!usableSecret(deps.ipHashSecret)) {
    console.error("IP_HASH_SECRET is missing or shorter than 32 characters");
    return back(req, next, "unavailable");
  }
  try {
    const key = hashIp(clientIp(req), deps.ipHashSecret);
    if (!(await deps.limiter.consume("gate", key, deps.now(), GATE_LIMIT))) {
      return back(req, next, "limited");
    }
  } catch {
    return back(req, next, "unavailable");
  }

  if (!passcodeMatches(String(form.get("passcode") ?? ""), passcode)) {
    return back(req, next, "1");
  }
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(PASSCODE_COOKIE, passcodeDigest(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASSCODE_MAX_AGE,
  });
  return res;
}
