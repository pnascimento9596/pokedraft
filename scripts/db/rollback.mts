import { readFileSync } from "node:fs";
import { connect } from "./connect.mjs";
import { parseRollbackArgs, rollbackNewest, type MigrationJournal } from "./rollback-core.mjs";

const { dropData } = parseRollbackArgs(process.argv.slice(2));
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as MigrationJournal;
const { sql, host } = connect();
console.log(`[db:rollback] target endpoint ${host}`);
await rollbackNewest(sql, journal, { dropData });
