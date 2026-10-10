import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { leaderboardEntries } from "@/db/schema";
import type { Db } from "@/db/types";
import type { DraftSettings } from "@/engine";
import { clientIp, handleSubmit, hashIp } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { migratedDb, scriptedToken } from "./fixtures";

const NOW = new Date("2026-10-09T16:00:00Z");
const SECRET = "test-secret-0123456789abcdef01234567";
const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};

let db: Db;
let client: PGlite;
let store: LeaderboardStore;

beforeEach(async () => {
  ({ db, client } = await migratedDb());
  store = drizzleStore(() => db);
});
afterEach(async () => {
  await client.close();
});

function post(body: unknown, headers: Record<string, string>): Request {
  return new Request("http://local/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("client IP (catches a spoofable first x-forwarded-for hop beating Vercel's header)", () => {
  it("prefers x-real-ip, then the first x-forwarded-for hop, then unknown", () => {
    const h = (o: Record<string, string>) => new Request("http://local/", { headers: o });
    expect(clientIp(h({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "6.6.6.6, 10.0.0.1" }))).toBe(
      "198.51.100.9",
    );
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(h({}))).toBe("unknown");
  });
});

describe("IP hash (catches an unkeyed hash that anyone can brute-force from the IPv4 space)", () => {
  it("is HMAC-SHA256 of the IP under the secret", () => {
    expect(hashIp("203.0.113.7", SECRET)).toBe(
      "a3f44a585b68d73be09a10c3fd364c23d94fe2b7490b49b357357502e71a5edd",
    );
    expect(hashIp("203.0.113.7", `${SECRET}x`)).not.toBe(hashIp("203.0.113.7", SECRET));
  });
});

describe("submit hardening", () => {
  it("counts rejected submissions toward the per-IP limit (catches 422s that never throttle)", async () => {
    const headers = { "x-real-ip": "198.51.100.1", "x-forwarded-for": "198.51.100.1" };
    for (let i = 0; i < 10; i++) {
      const res = await handleSubmit(post({ nickname: "Ash", token: "not-a-token" }, headers), {
        store,
        now: () => NOW,
      });
      expect(res.status).toBe(422);
    }
    const res = await handleSubmit(
      post({ nickname: "Ash", token: scriptedToken(CUP8, "lb-cup8") }, headers),
      { store, now: () => NOW },
    );
    expect(res.status).toBe(429);
    expect(await db.select().from(leaderboardEntries)).toHaveLength(0);
  });

  it("returns 201 with rank null when the rank lookup fails after the insert (catches a 503 for a saved run)", async () => {
    const flaky: LeaderboardStore = {
      ...store,
      rankOf: () => Promise.reject(new Error("rank query timed out")),
    };
    const res = await handleSubmit(
      post({ nickname: "Ash", token: scriptedToken(CUP8, "lb-cup8") }, { "x-real-ip": "198.51.100.2" }),
      { store: flaky, now: () => NOW },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { entry: { rank: number | null; nickname: string } };
    expect(body.entry.nickname).toBe("Ash");
    expect(body.entry.rank).toBeNull();
    expect(await db.select().from(leaderboardEntries)).toHaveLength(1);
  });
});
