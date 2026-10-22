import { expect, it } from "vitest";
import { freshlyMigratedDb, migratedDb } from "./fixtures";

it("gives each database fixture an independent client with real teardown", async () => {
  const first = await migratedDb();
  const second = await migratedDb();
  try {
    expect(first.client).not.toBe(second.client);
    expect(first.db).not.toBe(second.db);
    await first.client.exec(
      "INSERT INTO rate_limit_events (scope, key_hash) VALUES ('submit', 'isolation')",
    );
    await first.client.close();
    expect(first.client.closed).toBe(true);
    expect(second.client.closed).toBe(false);
    const result = await second.client.query<{ total: number }>(
      "SELECT count(*)::int AS total FROM leaderboard_entries",
    );
    expect(result.rows).toEqual([{ total: 0 }]);
    expect(
      (await second.client.query("SELECT count(*)::int AS total FROM rate_limit_events")).rows,
    ).toEqual([{ total: 0 }]);
  } finally {
    if (!first.client.closed) await first.client.close();
    if (!second.client.closed) await second.client.close();
  }
});

it("applies every migration to a genuinely empty database", async () => {
  const { client } = await freshlyMigratedDb();
  try {
    const result = await client.query<{ migrations: number; buckets: number }>(
      "SELECT (SELECT count(*) FROM drizzle.__drizzle_migrations)::int AS migrations, (SELECT count(*) FROM rate_limit_buckets)::int AS buckets",
    );
    expect(result.rows).toEqual([{ migrations: 7, buckets: 0 }]);
  } finally {
    await client.close();
  }
});
