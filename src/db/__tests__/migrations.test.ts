import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("keeps the all-time index in migration metadata so the next generate cannot create it again", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const previous = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0001_snapshot.json"), "utf8"),
  );
  const current = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0002_snapshot.json"), "utf8"),
  );
  expect(current.prevId).toBe(previous.id);
  expect(
    current.tables["public.leaderboard_entries"].indexes.leaderboard_entries_alltime_idx,
  ).toMatchObject({
    name: "leaderboard_entries_alltime_idx",
    isUnique: false,
    method: "btree",
  });
});

it("backfills serialized buckets from event history without deleting admission evidence", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const root = path.resolve(import.meta.dirname, "../../..");
  try {
    for (const name of [
      "0000_leaderboard_entries.sql",
      "0001_rate_limit_events.sql",
      "0002_alltime_board_idx.sql",
    ]) {
      await client.exec(readFileSync(path.join(root, "drizzle", name), "utf8"));
    }
    await client.exec(
      "INSERT INTO rate_limit_events (scope, key_hash, created_at) VALUES ('submit', 'retained', '2026-10-09T15:00:00Z'), ('submit', 'retained', '2026-10-09T16:00:00Z'), ('gate', 'retained', '2026-10-09T16:00:00Z')",
    );
    await client.exec(
      readFileSync(path.join(root, "drizzle/0003_serialized_rate_limit.sql"), "utf8"),
    );
    expect(
      (
        await client.query(
          "SELECT scope, cardinality(attempts) AS attempts FROM rate_limit_buckets ORDER BY scope",
        )
      ).rows,
    ).toEqual([
      { scope: "gate", attempts: 1 },
      { scope: "submit", attempts: 2 },
    ]);
    expect(
      (await client.query("SELECT count(*)::int AS events FROM rate_limit_events")).rows,
    ).toEqual([{ events: 3 }]);
    const metadata = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0003_snapshot.json"), "utf8"),
    );
    expect(
      metadata.tables["public.rate_limit_buckets"].compositePrimaryKeys
        .rate_limit_buckets_scope_key_hash_pk.columns,
    ).toEqual(["scope", "key_hash"]);
  } finally {
    await client.close();
  }
});
