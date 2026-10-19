import { parseArgs } from "node:util";
import { backfillRuns } from "../../src/leaderboard/server/backfill";
import { connect } from "./connect.mjs";

// Run with node --conditions=react-server: the replay dispatcher imports "server-only".
const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const { sql, host } = connect();
console.log(`[db:backfill-runs] target endpoint ${host}`);
process.exitCode = await backfillRuns(
  {
    query: (text, params = []) => sql.query(text, [...params]) as Promise<unknown[]>,
    transaction: async (statements) => {
      await sql.transaction(statements.map(({ text, params }) => sql.query(text, [...params])));
    },
  },
  { dryRun: values["dry-run"], log: (line) => console.log(`[db:backfill-runs] ${line}`) },
);
