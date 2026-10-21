import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/db/types";
import { rateLimitEvents } from "@/db/schema";
import { drizzleLimiter } from "@/ratelimit/store";
import { dailySettings } from "@/leaderboard/daily";
import { dailySeed, toIsoDate } from "@/engine/rng";
import { handleSubmit } from "../handlers";
import { drizzleStore } from "../store";
import { migratedDb, scriptedToken } from "./fixtures";

const NOW = new Date("2026-10-09T16:00:00Z");
let db: Db;
let client: PGlite;
beforeEach(async () => {
  ({ db, client } = await migratedDb());
});
afterEach(async () => {
  await client.close();
});

it.each([false, true])(
  "uses two actual SQL queries for a fresh submission (daily=%s), admission then insert with its rank, and two for a free retry",
  async (daily) => {
    const token = scriptedToken(
      dailySettings("4-3-3"),
      daily ? dailySeed(toIsoDate("2026-10-09")) : "admission-alltime",
    );
    const store = drizzleStore(() => db);
    const deps = {
      store,
      limiter: drizzleLimiter(() => db),
      now: () => NOW,
      ipHashSecret: "test-secret-0123456789abcdef01234567",
      grace: null,
    };
    const post = () =>
      new Request("http://local/api/leaderboard", {
        method: "POST",
        body: JSON.stringify({ nickname: "Ash", token }),
      });
    const query = vi.spyOn(client, "query");
    expect((await handleSubmit(post(), deps)).status).toBe(201);
    expect(query).toHaveBeenCalledTimes(2);
    query.mockClear();
    expect((await handleSubmit(post(), deps)).status).toBe(200);
    expect(query).toHaveBeenCalledTimes(2);
    query.mockRestore();
    expect(await db.select().from(rateLimitEvents)).toHaveLength(1);
  },
);

it("keeps admitted event history while expiring the exact inclusive sliding window", async () => {
  const limiter = drizzleLimiter(() => db);
  const rule = { max: 2, windowMs: 1000 };
  expect(await limiter.consume("gate", "boundary", NOW, rule)).toBe(true);
  expect(await limiter.consume("gate", "boundary", NOW, rule)).toBe(true);
  expect(await limiter.consume("gate", "boundary", new Date(NOW.getTime() + 1000), rule)).toBe(
    false,
  );
  expect(await limiter.consume("gate", "boundary", new Date(NOW.getTime() + 1001), rule)).toBe(
    true,
  );
  expect(await db.select().from(rateLimitEvents)).toHaveLength(3);
});
