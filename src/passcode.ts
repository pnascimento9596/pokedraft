import { createHash, timingSafeEqual } from "node:crypto";

export const PASSCODE_COOKIE = "pokedraft_pass";
export const PASSCODE_MAX_AGE = 90 * 24 * 60 * 60;

// Paths that stay public when the gate is on, so link previews (iMessage, Discord, WhatsApp)
// can fetch the card and the share image. The gate's own form and handler must stay reachable.
const PUBLIC: readonly RegExp[] = [
  /^\/card$/,
  /^\/r\/[^/]+\/opengraph-image(?:-[\w-]+)?$/,
  /^\/_next\/static\//,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/gate$/,
  /^\/gate\/unlock$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC.some((re) => re.test(pathname));
}

export function passcodeDigest(passcode: string): string {
  return createHash("sha256").update(`pokedraft-pass:${passcode}`).digest("hex");
}

export function cookieMatches(cookie: string | undefined, passcode: string): boolean {
  if (cookie === undefined) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(passcodeDigest(passcode));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passcodeMatches(attempt: string, passcode: string): boolean {
  return cookieMatches(passcodeDigest(attempt), passcode);
}

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
