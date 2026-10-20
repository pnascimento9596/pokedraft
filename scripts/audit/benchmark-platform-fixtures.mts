import assert from "node:assert/strict";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const folder = path.resolve(import.meta.dirname, "../../drizzle");
async function direct() {
  const client = await PGlite.create();
  await migrate(drizzle(client), { migrationsFolder: folder });
  return client;
}
const base = await direct();
let blob: Blob;
try {
  blob = await base.dumpDataDir("none");
} finally {
  await base.close();
}
const results: { iteration: number; mode: string; ms: number; closed: boolean }[] = [];
for (let iteration = 0; iteration < 6; iteration++) {
  for (const mode of ["migrate", "snapshot"]) {
    const start = performance.now();
    const client = mode === "migrate" ? await direct() : await PGlite.create({ loadDataDir: blob });
    try {
      const state = await client.query(
        "SELECT (SELECT count(*) FROM leaderboard_entries)::int AS entries, (SELECT count(*) FROM rate_limit_buckets)::int AS buckets, (SELECT count(*) FROM drizzle.__drizzle_migrations)::int AS migrations",
      );
      assert.deepEqual(state.rows, [{ entries: 0, buckets: 0, migrations: 6 }]);
    } finally {
      await client.close();
    }
    assert.equal(client.closed, true);
    results.push({
      iteration,
      mode,
      ms: Math.round(performance.now() - start),
      closed: client.closed,
    });
  }
}
console.log(JSON.stringify({ snapshotBytes: blob.size, results }));
