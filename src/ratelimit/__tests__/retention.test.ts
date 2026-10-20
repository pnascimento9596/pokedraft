import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/db/types";
import { drizzleStore } from "@/leaderboard/server/store";
import { migratedDb } from "@/leaderboard/server/__tests__/fixtures";
import { drizzleLimiter } from "../store";

const NOW = new Date("2026-10-16T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR_RULE = { max: 10, windowMs: 60 * 60 * 1000 };

let db: Db;
let client: PGlite;
beforeEach(async () => {
  ({ db, client } = await migratedDb());
});
afterEach(async () => {
  await client.close();
});

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

async function seedEvent(key: string, at: string): Promise<void> {
  await client.query(
    "INSERT INTO rate_limit_events (scope, key_hash, created_at) VALUES ('submit', $1, $2)",
    [key, at],
  );
}

async function seedBucket(key: string, attempts: string[], scope = "submit"): Promise<void> {
  await client.query(
    "INSERT INTO rate_limit_buckets (scope, key_hash, attempts) VALUES ($1, $2, $3::timestamptz[])",
    [scope, key, `{${attempts.join(",")}}`],
  );
}

async function eventKeys(): Promise<string[]> {
  const res = await client.query<{ key_hash: string }>(
    "SELECT key_hash FROM rate_limit_events ORDER BY key_hash",
  );
  return res.rows.map((r) => r.key_hash);
}

async function bucketKeys(): Promise<string[]> {
  const res = await client.query<{ k: string }>(
    "SELECT scope || ':' || key_hash AS k FROM rate_limit_buckets ORDER BY k",
  );
  return res.rows.map((r) => r.k);
}

describe("rate-limit retention (catches rows for keys that never return being kept forever)", () => {
  it("prunes events older than 7 days and keeps the 7-day boundary and recent ones", async () => {
    await seedEvent("old-a", ago(7 * DAY + 1));
    await seedEvent("old-b", ago(30 * DAY));
    await seedEvent("edge", ago(7 * DAY));
    await seedEvent("recent", ago(60_000));
    await seedEvent("visitor", ago(8 * DAY));

    expect(await drizzleLimiter(() => db).consume("submit", "visitor", NOW, HOUR_RULE)).toBe(true);

    expect(await eventKeys()).toEqual(["edge", "recent", "visitor"]);
  });

  it("prunes buckets whose newest attempt is older than 1 day, never the key being admitted", async () => {
    await seedBucket("stale", [ago(2 * DAY), ago(DAY + 1)]);
    await seedBucket("stale", [ago(3 * DAY)], "gate");
    await seedBucket("edge", [ago(DAY)]);
    await seedBucket("mixed", [ago(5 * DAY), ago(10_000)]);
    await seedBucket("visitor", [ago(9 * DAY)]);

    expect(await drizzleLimiter(() => db).consume("submit", "visitor", NOW, HOUR_RULE)).toBe(true);

    expect(await bucketKeys()).toEqual(["submit:edge", "submit:mixed", "submit:visitor"]);
    const own = await client.query<{ attempts: Date[] }>(
      "SELECT attempts FROM rate_limit_buckets WHERE key_hash = 'visitor'",
    );
    expect(own.rows[0]!.attempts.map((d) => d.toISOString())).toEqual([NOW.toISOString()]);
  });

  it("deletes at most 50 events and 50 buckets per admission", async () => {
    for (let i = 0; i < 60; i++) {
      const key = `old-${String(i).padStart(2, "0")}`;
      await seedEvent(key, ago(10 * DAY + i));
      await seedBucket(key, [ago(2 * DAY + i)]);
    }
    const limiter = drizzleLimiter(() => db);

    expect(await limiter.consume("submit", "first", NOW, HOUR_RULE)).toBe(true);
    const events = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_limit_events WHERE key_hash LIKE 'old-%'",
    );
    const buckets = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_limit_buckets WHERE key_hash LIKE 'old-%'",
    );
    expect([events.rows[0]!.n, buckets.rows[0]!.n]).toEqual([10, 10]);

    expect(await limiter.consume("submit", "second", NOW, HOUR_RULE)).toBe(true);
    expect(await eventKeys()).toEqual(["first", "second"]);
    expect(await bucketKeys()).toEqual(["submit:first", "submit:second"]);
  });

  it("prunes in a refused admission too, so a locked-out key still sweeps", async () => {
    const rule = { max: 1, windowMs: 60 * 60 * 1000 };
    const limiter = drizzleLimiter(() => db);
    expect(await limiter.consume("gate", "locked", NOW, rule)).toBe(true);
    await seedEvent("old", ago(8 * DAY));
    await seedBucket("old", [ago(2 * DAY)]);

    expect(await limiter.consume("gate", "locked", NOW, rule)).toBe(false);

    expect(await eventKeys()).toEqual(["locked"]);
    expect(await bucketKeys()).toEqual(["gate:locked"]);
  });

  it("prunes inside the leaderboard admission statement as well", async () => {
    await seedEvent("old", ago(8 * DAY));
    await seedBucket("old", [ago(2 * DAY)]);

    const admission = await drizzleStore(() => db).admitSubmission(
      "not-a-real-token",
      "Ash",
      { mode: "cup8", dailyDate: null, engine: "current" },
      "player",
      NOW,
      HOUR_RULE,
    );

    expect(admission).toEqual({ kind: "admitted" });
    expect(await eventKeys()).toEqual(["player"]);
    expect(await bucketKeys()).toEqual(["submit:player"]);
  });

  it("refuses a window longer than the 1-day bucket idle cutoff (catches pruning a bucket whose attempts are still inside the window)", async () => {
    const limiter = drizzleLimiter(() => db);
    await expect(
      limiter.consume("submit", "k", NOW, { max: 1, windowMs: 2 * DAY }),
    ).rejects.toThrow(
      new RangeError("rate-limit window 172800000 ms exceeds bucket idle cutoff 86400000 ms"),
    );
    expect(await limiter.consume("submit", "k", NOW, { max: 1, windowMs: DAY })).toBe(true);
  });
});
