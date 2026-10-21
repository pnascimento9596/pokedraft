import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { SqlClient } from "./connect.mjs";

export const INITIAL_MIGRATION_TAG = "0000_leaderboard_entries";

export interface MigrationJournal {
  entries: { tag: string; when: number }[];
}

export interface RollbackOptions {
  dropData?: boolean;
  log?: (message: string) => void;
  rollbackDir?: string;
}

export function parseRollbackArgs(args: string[]): { dropData: boolean } {
  const normalized = args[0] === "--" ? args.slice(1) : args;
  const { values } = parseArgs({
    args: normalized,
    options: {
      "drop-data": { type: "boolean", default: false },
    },
    strict: true,
  });
  return { dropData: Boolean(values["drop-data"]) };
}

async function logLeaderboardRowCount(
  sql: SqlClient,
  log: (message: string) => void,
): Promise<void> {
  try {
    const [row] = (await sql.query("SELECT count(*)::int AS count FROM leaderboard_entries")) as {
      count: number | string;
    }[];
    log(`[db:rollback] leaderboard_entries rows: ${Number(row?.count ?? 0)}`);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : String(err);
    if (code === "42P01" || /relation "leaderboard_entries" does not exist/i.test(message)) {
      log("[db:rollback] leaderboard_entries table does not exist");
      return;
    }
    throw err;
  }
}

// Rolls back the newest applied migration with its paired drizzle/rollback/<tag>.down.sql.
// Drizzle has no down migrations, so the bookkeeping row is removed by its journal timestamp.
export async function rollbackNewest(
  sql: SqlClient,
  journal: MigrationJournal,
  options: RollbackOptions = {},
): Promise<string | null> {
  const { dropData = false, log = console.log, rollbackDir = "drizzle/rollback" } = options;
  await logLeaderboardRowCount(sql, log);
  const [last] = (await sql.query(
    "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
  )) as { created_at: string }[];
  if (!last) {
    log("[db:rollback] nothing applied");
    return null;
  }
  const entry = journal.entries.find((e) => String(e.when) === String(last.created_at));
  if (!entry) throw new Error(`no journal entry for migration created_at=${last.created_at}`);
  if (entry.tag === INITIAL_MIGRATION_TAG && !dropData) {
    throw new Error(
      "Refusing to roll back 0000_leaderboard_entries without --drop-data because it drops the leaderboard_entries table.",
    );
  }
  const down = readFileSync(path.join(rollbackDir, `${entry.tag}.down.sql`), "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  await sql.transaction([
    ...down.map((s) => sql.query(s)),
    sql.query("DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1", [entry.when]),
  ]);
  log(`[db:rollback] OK, rolled back ${entry.tag}`);
  return entry.tag;
}
