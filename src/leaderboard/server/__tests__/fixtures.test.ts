import { expect, it } from "vitest";
import { migratedDb } from "./fixtures";

it("gives each database fixture an independent client with real teardown", async () => {
  const first = await migratedDb();
  const second = await migratedDb();
  try {
    expect(first.client).not.toBe(second.client);
    expect(first.db).not.toBe(second.db);
    await first.client.close();
    expect(first.client.closed).toBe(true);
    expect(second.client.closed).toBe(false);
    const result = await second.client.query<{ total: number }>("SELECT count(*)::int AS total FROM leaderboard_entries");
    expect(result.rows).toEqual([{ total: 0 }]);
  } finally {
    if (!first.client.closed) await first.client.close();
    if (!second.client.closed) await second.client.close();
  }
});
