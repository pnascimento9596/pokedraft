import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const FIRST_PORT = 3400;
const PORT_COUNT = 600;

/** A port in 3400 to 3999 fixed by the checkout path, so two worktrees rarely share a server. */
export function localServerPort(checkout: string): number {
  return FIRST_PORT + (createHash("sha256").update(checkout).digest().readUInt32BE(0) % PORT_COUNT);
}

export function worktreeHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export type ServerCheck =
  | { readonly kind: "match" }
  | { readonly kind: "unknown"; readonly reason: string }
  | { readonly kind: "mismatch"; readonly message: string };

export function checkServerSha(
  baseURL: string,
  head: string | null,
  served: string | null,
): ServerCheck {
  if (head === null) return { kind: "unknown", reason: "git rev-parse HEAD failed here" };
  if (served === null)
    return {
      kind: "unknown",
      reason: `${baseURL}/api/health reports no sha (started outside Playwright without VERCEL_GIT_COMMIT_SHA)`,
    };
  if (served === head) return { kind: "match" };
  return {
    kind: "mismatch",
    message:
      `The server on ${baseURL} reports sha ${served}, but this checkout is at ${head}. ` +
      `Playwright reused a server started from another worktree or an older commit. ` +
      `Stop that server, or set PLAYWRIGHT_PORT to a free port, then rebuild and rerun.`,
  };
}
