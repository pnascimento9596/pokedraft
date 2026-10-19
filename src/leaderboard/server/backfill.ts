import "server-only";
import { z } from "zod";
import { replayAnyVersion, tokenVersion } from "@/engine/versions";
import { isCoached } from "@/ui/manager/coached";
import { runFingerprint } from "./fingerprint";

export interface BackfillDb {
  query(text: string, params?: readonly unknown[]): Promise<readonly unknown[]>;
  /** Runs every statement in one transaction. */
  transaction(statements: readonly Statement[]): Promise<void>;
}

interface Statement {
  readonly text: string;
  readonly params: readonly unknown[];
}

const pendingRows = z.array(
  z.object({
    id: z.string(),
    token: z.string(),
    wins: z.number().int(),
    draws: z.number().int(),
    losses: z.number().int(),
    team_score: z.number().int(),
  }),
);
type Pending = z.infer<typeof pendingRows>[number];

type Outcome =
  | {
      readonly ok: true;
      readonly id: string;
      readonly coached: boolean;
      readonly fingerprint: string;
    }
  | { readonly ok: false; readonly reason: string };

const SELECT_PENDING = `SELECT id, token, wins, draws, losses, team_score FROM leaderboard_entries
  WHERE coached IS NULL OR run_fingerprint IS NULL ORDER BY created_at, id`;
const UPDATE_ONE =
  "UPDATE leaderboard_entries SET coached = $2, run_fingerprint = $3 WHERE id = $1";

const record = (w: number, d: number, l: number, score: number) =>
  `${w}-${d}-${l}, Team Score ${score}`;

async function compute(row: Pending): Promise<Outcome> {
  try {
    const { draft, cup } = await replayAnyVersion(row.token);
    const replayed = record(cup.wins, cup.draws, cup.losses, cup.rating.score);
    const held = record(row.wins, row.draws, row.losses, row.team_score);
    if (replayed !== held) return { ok: false, reason: `stored ${held}; replay ${replayed}` };
    return {
      ok: true,
      id: row.id,
      coached: isCoached(row.token),
      fingerprint: runFingerprint(draft, cup),
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

function versionLabel(token: string): string {
  try {
    return `pd${tokenVersion(token)}`;
  } catch {
    return "unknown";
  }
}

/**
 * Fills `coached` and `run_fingerprint` on rows that lack either, by replaying each stored token
 * with the engine that issued it. Any row that cannot be replayed, or whose stored record differs
 * from its replay, refuses the whole run: nothing is written rather than a guessed value. Returns
 * the process exit code.
 */
export async function backfillRuns(
  db: BackfillDb,
  options: { readonly dryRun: boolean; readonly log: (line: string) => void },
): Promise<number> {
  const { dryRun, log } = options;
  const rows = pendingRows.parse(await db.query(SELECT_PENDING));
  const planned: { readonly label: string; readonly outcome: Outcome }[] = [];
  for (const row of rows) {
    planned.push({
      label: `id=${row.id} version=${versionLabel(row.token)}`,
      outcome: await compute(row),
    });
  }
  const refused = planned.filter((p) => !p.outcome.ok);
  if (refused.length > 0) {
    for (const { label, outcome } of refused) {
      if (!outcome.ok) log(`refused ${label}: ${outcome.reason}`);
    }
    log(`refused ${refused.length} row(s); nothing written`);
    return 1;
  }
  const updates = planned.flatMap(({ label, outcome }) => {
    if (!outcome.ok) return [];
    log(`${label} coached=${outcome.coached} run_fingerprint=${outcome.fingerprint}`);
    return [{ text: UPDATE_ONE, params: [outcome.id, outcome.coached, outcome.fingerprint] }];
  });
  if (dryRun) {
    log(`dry run: ${updates.length} row(s) would be updated, nothing written`);
    return 0;
  }
  if (updates.length > 0) await db.transaction(updates);
  log(`updated ${updates.length} row(s)`);
  return 0;
}
