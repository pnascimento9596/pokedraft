import { readFileSync } from "node:fs";
import { connect } from "./connect.mjs";

// Rolls back the newest applied migration with its paired drizzle/rollback/<tag>.down.sql.
// Drizzle has no down migrations, so the bookkeeping row is removed by its journal timestamp.
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: { tag: string; when: number }[];
};
const { sql, host } = connect();
console.log(`[db:rollback] target endpoint ${host}`);
const [last] = (await sql.query(
  "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
)) as { created_at: string }[];
if (!last) {
  console.log("[db:rollback] nothing applied");
  process.exit(0);
}
const entry = journal.entries.find((e) => String(e.when) === String(last.created_at));
if (!entry) throw new Error(`no journal entry for migration created_at=${last.created_at}`);
const down = readFileSync(`drizzle/rollback/${entry.tag}.down.sql`, "utf8")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
await sql.transaction([
  ...down.map((s) => sql.query(s)),
  sql.query("DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1", [entry.when]),
]);
console.log(`[db:rollback] OK, rolled back ${entry.tag}`);
