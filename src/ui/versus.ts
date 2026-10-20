import { decodeToken } from "@/engine/token";
import { RUN_TOKEN_VERSION, type DraftSettings } from "@/engine/types";
import { RETAINED_TOKEN_VERSIONS } from "@/engine/versions/label";
import { record } from "./labels";

/** The run a challenge link dares you to beat. Only a live token can be replayed on the client. */
export type Versus =
  | { readonly kind: "live"; readonly token: string }
  | { readonly kind: "retained"; readonly token: string; readonly engine: number };

export interface TokenRun {
  readonly version: number;
  readonly settings: DraftSettings;
  readonly seed: string;
}

export function readTokenRun(token: string): TokenRun | null {
  const version = Number(/^pd(\d+)\./.exec(token)?.[1]);
  if (version !== RUN_TOKEN_VERSION && !RETAINED_TOKEN_VERSIONS.includes(version)) return null;
  try {
    // Every token version's wire format is a subset of the live one, so any known version reads
    // its settings through the live codec without a replay.
    const { settings, seed } = decodeToken(token.replace(/^pd\d+\./, `pd${RUN_TOKEN_VERSION}.`));
    return { version, settings, seed };
  } catch {
    return null;
  }
}

// Each retained token version pdN was issued by engine N, so the token names the engine.
export function versusOf(run: TokenRun, token: string): Versus {
  return run.version === RUN_TOKEN_VERSION
    ? { kind: "live", token }
    : { kind: "retained", token, engine: run.version };
}

export interface Standing {
  readonly wins: number;
  readonly draws: number;
  readonly rating: { readonly score: number };
}

export type SeedVerdict = "win" | "loss" | "level";

export const VERDICT_LINE: Readonly<Record<SeedVerdict, string>> = {
  win: "You win the seed",
  loss: "They win the seed",
  level: "Level on the seed",
};

// The leaderboard's order: wins, then draws, then Team Score.
export function seedVerdict(mine: Standing, theirs: Standing): SeedVerdict {
  const gap =
    mine.wins - theirs.wins || mine.draws - theirs.draws || mine.rating.score - theirs.rating.score;
  return gap > 0 ? "win" : gap < 0 ? "loss" : "level";
}

export function challengeText(cup: {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
}): string {
  return `I went ${record(cup.wins, cup.draws, cup.losses)}. Can you beat it on the same seed?`;
}

export function retainedLine(engine: number): string {
  return `Their run used engine v${engine}, so there is no side by side.`;
}
