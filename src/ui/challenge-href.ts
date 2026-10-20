import { challengeLink } from "./settings";
import { readTokenRun } from "./versus";

export function challengeHref(token: string): string | null {
  const run = readTokenRun(token);
  return run === null ? null : challengeLink(run.settings, run.seed);
}

// The same-seed challenge that also carries the run to beat.
export function versusHref(token: string): string | null {
  const href = challengeHref(token);
  return href === null ? null : `${href}&vs=${encodeURIComponent(token)}`;
}
