import { readFileSync } from "node:fs";
import path from "node:path";
import type { SqlClient } from "./connect.mjs";

export interface MigrationJournal {
  entries: { tag: string; when: number }[];
}

export interface RollbackOptions {
  dropData?: boolean;
  log?: (message: string) => void;
  rollbackDir?: string;
}

export function parseRollbackArgs(args: string[]): { dropData: boolean } {
  void args;
  return { dropData: false };
}

// Rolls back the newest applied migration with its paired drizzle/rollback/<tag>.down.sql.
// Drizzle has no down migrations, so the bookkeeping row is removed by its journal timestamp.
export async function rollbackNewest(
  sql: SqlClient,
  journal: MigrationJournal,
  options: RollbackOptions = {},
): Promise<string | null> {
  const { log = console.log, rollbackDir = "drizzle/rollback" } = options;
  const [last] = (await sql.query(
    "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
  )) as { created_at: string }[];
  if (!last) {
    log("[db:rollback] nothing applied");
    return null;
  }
  const entry = journal.entries.find((e) => String(e.when) === String(last.created_at));
  if (!entry) throw new Error(`no journal entry for migration created_at=${last.created_at}`);
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
