import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { admissionCtes } from "../../src/ratelimit/store";

const run = promisify(execFile);
const url = process.env.PLATFORM_TEST_DATABASE_URL;
assert(url, "PLATFORM_TEST_DATABASE_URL must name an isolated local PostgreSQL cluster");
assert.equal(new URL(url).hostname, "127.0.0.1");
const psql = process.env.PSQL_PATH ?? "/opt/homebrew/bin/psql";
const query = async (text: string) =>
  (await run(psql, [url, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", text])).stdout.trim();
const now = new Date("2026-10-09T16:00:00Z");
let key = `proof-${process.pid}`;
function statement(scope: "submit", at: Date) {
  const compiled = new PgDialect()
    .sqlToQuery(sql`WITH ${admissionCtes(scope, key, at, { max: 10, windowMs: 1000 })}
    SELECT EXISTS(SELECT 1 FROM admitted) AS allowed`);
  return compiled.sql.replace(/\$(\d+)/g, (_, index: string) => {
    const value = compiled.params[Number(index) - 1];
    return typeof value === "number" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
  });
}
async function race(label: string, count: number, expected: number, at: Date) {
  const outputs = await Promise.all(
    Array.from({ length: count }, () =>
      query(
        `BEGIN; SELECT pg_backend_pid(); SELECT pg_sleep(0.1); ${statement("submit", at)}; COMMIT;`,
      ),
    ),
  );
  const pids = outputs.map((out) => out.split("\n").find((line) => /^\d+$/.test(line)));
  const allowed = outputs.filter((out) => out.split("\n").includes("t")).length;
  assert.equal(
    new Set(pids).size,
    count,
    "every contender must own an independent PostgreSQL backend",
  );
  assert.equal(allowed, expected);
  console.log(
    JSON.stringify({
      label,
      connections: count,
      distinctBackends: new Set(pids).size,
      allowed,
      refused: count - allowed,
    }),
  );
}
await race("empty bucket race", 24, 10, now);
assert.equal(await query(`SELECT count(*) FROM rate_limit_events WHERE key_hash='${key}'`), "10");
await race("inclusive boundary", 24, 0, new Date(now.getTime() + 1000));
await race("expired window race", 24, 10, new Date(now.getTime() + 1001));
assert.equal(
  await query(
    `SELECT cardinality(attempts) FROM rate_limit_buckets WHERE scope='submit' AND key_hash='${key}'`,
  ),
  "10",
);
assert.equal(await query(`SELECT count(*) FROM rate_limit_events WHERE key_hash='${key}'`), "20");
console.log(JSON.stringify({ retainedEvents: 20, submitActiveAttempts: 10 }));

key += "-last-slot";
for (let index = 0; index < 9; index++) assert.equal(await query(statement("submit", now)), "t");
await race("last slot race", 24, 1, now);
assert.equal(await query(`SELECT count(*) FROM rate_limit_events WHERE key_hash='${key}'`), "10");
