import { parseArgs } from "node:util";
import { connect } from "./connect.mjs";

// The one sanctioned production row deletion: a nickname's daily entries for one date.
const { values } = parseArgs({
  options: { nickname: { type: "string" }, date: { type: "string" } },
});
if (!values.nickname || !values.date || !/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
  throw new Error("usage: delete-entry.mts --nickname <name> --date YYYY-MM-DD");
}
const { sql, host } = connect();
console.log(`[db:delete-entry] target endpoint ${host}`);
const deleted = (await sql.query(
  "DELETE FROM leaderboard_entries WHERE nickname = $1 AND daily_date = $2 RETURNING id, mode",
  [values.nickname, values.date],
)) as { id: string; mode: string }[];
console.log(`[db:delete-entry] deleted ${deleted.length} row(s)`, deleted);
