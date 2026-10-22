import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  ENGINE_VERSION,
  dailySeed,
  decodeToken,
  encodeToken,
  toIsoDate,
  type DraftSettings,
} from "@/engine";
import { leaderboardEntries, rateLimitEvents } from "@/db/schema";
import type { Db } from "@/db/types";
import type { BoardEntry } from "../../contract";
import { dailySettings } from "../../daily";
import { GRACE } from "../grace";
import { handleBoard, handleSubmit } from "../handlers";
import { drizzleStore, type LeaderboardStore } from "../store";
import { canonicalToken } from "@/ui/read-token";
import { isCoached } from "@/ui/manager/coached";
import { GOLDEN_CUP8_V6, GOLDEN_CUP8_V7, migratedDb, scriptedToken } from "./fixtures";

const SECRET = "test-secret-0123456789abcdef01234567";
const FLIP_DAY_NOON = new Date("2026-10-22T16:00:00Z");
const AFTER_UNTIL = new Date("2026-10-24T04:00:01Z");
const CUP8: DraftSettings = {
  mode: "cup8",
  formation: "4-3-3",
  gens: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  style: "classic3",
  order: "squadFirst",
};

const GRACE_V6 = {
  version: 6,
  engine: "pokedraft-engine-6",
  until: "2026-10-23T04:00:00Z",
  flipDate: toIsoDate("2026-10-21"),
} as const;

const GRACE_V7 = {
  version: 7,
  engine: "pokedraft-engine-7",
  until: "2026-10-24T04:00:00Z",
  flipDate: toIsoDate("2026-10-22"),
} as const;

interface Body {
  entry?: BoardEntry;
  entries: BoardEntry[];
  error: { code: string; message: string; nickname?: string };
}

let db: Db;
let client: PGlite;
let store: LeaderboardStore;

const pd6 = (token: string) => token.replace(/^pd\d+\./, "pd6.");
const pd7 = (token: string) => token.replace(/^pd\d+\./, "pd7.");

async function submit(body: unknown, now = FLIP_DAY_NOON, grace: unknown = GRACE_V7) {
  const req = new Request("http://local/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify(body),
  });
  const res = await handleSubmit(req, {
    store,
    ipHashSecret: SECRET,
    now: () => now,
    grace,
  } as Parameters<typeof handleSubmit>[1]);
  return { status: res.status, body: (await res.json()) as Body };
}

async function rows() {
  return db.select().from(leaderboardEntries);
}

beforeEach(async () => {
  ({ db, client } = await migratedDb());
  store = drizzleStore(() => db);
});
afterEach(async () => {
  await client.close();
});

describe("grace window (catches runs played on the retired engine refused the moment the engine flips)", () => {
  it("sets GRACE for engine 7 until 2026-10-24T04:00:00Z with flipDate 2026-10-22", () => {
    expect(GRACE).toEqual(GRACE_V7);
  });

  it("accepts a retired-engine all-time run sent by the old page with 201 and stores its own engine", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-all"));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    expect([res.status, res.body.entry?.engineVersion, res.body.entry?.token]).toEqual([
      201,
      "pokedraft-engine-7",
      token,
    ]);
    const [row] = await rows();
    expect([row!.engineVersion, row!.token, row!.dailyDate, row!.coached]).toEqual([
      "pokedraft-engine-7",
      token,
      null,
      false,
    ]);
  });

  it("accepts the same run from a page that reloaded onto the live engine with 201", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-reloaded"));
    const res = await submit({ nickname: "Misty", token, engineVersion: "pokedraft-engine-8" });
    expect([res.status, res.body.entry?.engineVersion]).toEqual([201, "pokedraft-engine-7"]);
  });

  it("refuses a retired-engine run from a page that names a third engine with 409", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-third"));
    const res = await submit({ nickname: "Brock", token, engineVersion: "pokedraft-engine-6" });
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("refuses an engine-6 run with 409 once engine 7's grace window replaces engine 6's", async () => {
    const token = pd6(scriptedToken(CUP8, "grace-v6-closed"));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-6" });
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("refuses a retired-engine run with 409 once the window closes", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-late"));
    const res = await submit(
      { nickname: "Ash", token, engineVersion: "pokedraft-engine-7" },
      AFTER_UNTIL,
    );
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("refuses a retired-engine run with 409 when no window is set, as today", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-none"));
    const res = await submit({ nickname: "Ash", token }, FLIP_DAY_NOON, null);
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("refuses a retired-engine run for the flip day's Daily with 409, so one date never mixes engines", async () => {
    const token = pd7(scriptedToken(dailySettings("4-3-3"), dailySeed(toIsoDate("2026-10-22"))));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("accepts a retired-engine run for the previous day's Daily with 201 on that date", async () => {
    const token = pd7(scriptedToken(dailySettings("4-3-3"), dailySeed(toIsoDate("2026-10-21"))));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    expect([res.status, res.body.entry?.dailyDate, res.body.entry?.engineVersion]).toEqual([
      201,
      "2026-10-21",
      "pokedraft-engine-7",
    ]);
  });

  it("refuses a live-engine run for the previous day's pre-flip Daily with 409 (catches 6g note 3: pre-flip daily board mixing engines)", async () => {
    const token = scriptedToken(dailySettings("4-3-3"), dailySeed(toIsoDate("2026-10-21")));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-8" });
    expect([res.status, res.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    expect(await rows()).toEqual([]);
  });

  it("refuses a forged pd6 token carrying an engine-7 taker tuple in parseSubmission without spending an attempt (catches 6b3 skeptics)", async () => {
    const run = decodeToken(scriptedToken(CUP8, "grace-forged-taker"));
    const forgedPd6 = pd6(
      encodeToken({
        ...run,
        manager: [{ type: "taker", match: 0, minute: 0, set: "penalty", slot: 10 as never }],
      }),
    );
    expect(canonicalToken(forgedPd6)).toBeNull();
    const res = await submit(
      {
        nickname: "Ash",
        token: forgedPd6,
        engineVersion: "pokedraft-engine-6",
      },
      new Date("2026-10-21T16:00:00Z"),
      GRACE_V6,
    );
    expect([res.status, res.body.error.code]).toEqual([422, "ILLEGAL_ACTION"]);
    expect(await db.select().from(rateLimitEvents)).toEqual([]);
  });

  it("answers a retry with 200 and a copy under another nickname with 409 DUPLICATE_TOKEN", async () => {
    const token = pd7(scriptedToken(CUP8, "grace-retry"));
    const first = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    const retry = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-8" });
    const copy = await submit({ nickname: "Gary", token, engineVersion: "pokedraft-engine-7" });
    expect([first.status, retry.status, retry.body.entry?.token]).toEqual([201, 200, token]);
    expect([copy.status, copy.body.error.code, copy.body.error.nickname]).toEqual([
      409,
      "DUPLICATE_TOKEN",
      "Ash",
    ]);
    expect(await rows()).toHaveLength(1);
  });

  it("ranks a grace run among its own engine's runs and lists it under all engines only", async () => {
    await db.insert(leaderboardEntries).values({
      nickname: "Lance",
      mode: "cup8",
      variant: "classic3.squadFirst.g123456789",
      seed: "live-ahead",
      token: "pd8.live-ahead",
      teamScore: 999,
      wins: 8,
      draws: 0,
      losses: 0,
      engineVersion: ENGINE_VERSION,
      coached: false,
      runFingerprint: "fp-live-ahead",
      ipHash: "seeded",
    });
    const token = pd7(scriptedToken(CUP8, "grace-rank"));
    const res = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    expect([res.status, res.body.entry?.rank]).toEqual([201, 1]);
    const retry = await submit({ nickname: "Ash", token });
    expect([retry.status, retry.body.entry?.rank]).toEqual([200, 1]);

    const board = async (q: string) =>
      (
        (await (
          await handleBoard(new URL(`http://local/api/leaderboard?${q}`), store)
        ).json()) as Body
      ).entries.map((e) => e.nickname);
    expect(await board("mode=cup8&scope=all")).toEqual(["Lance"]);
    expect(await board("mode=cup8&scope=all&engine=all")).toEqual(["Lance", "Ash"]);
  });

  it("keeps the exact engine rule for live tokens inside the window", async () => {
    const token = scriptedToken(CUP8, "grace-live");
    const stale = await submit({ nickname: "Ash", token, engineVersion: "pokedraft-engine-7" });
    expect([stale.status, stale.body.error.code]).toEqual([409, "ENGINE_VERSION_MISMATCH"]);
    const live = await submit({ nickname: "Ash", token, engineVersion: ENGINE_VERSION });
    expect([live.status, live.body.entry?.engineVersion]).toEqual([201, "pokedraft-engine-8"]);
  });
});

// Issued by the engine 6 codec at 8059458: GOLDEN_CUP8_V6's draft with one touchline tactic.
// Never regenerate it.
const COACHED_V6 =
  "pd6.W1siYyIsIjQtMi0zLTEiLCIxMjM0NTY3ODkiLCJjIiwicyJdLCJnb2xkZW4tY3VwOCIsW1siciIsInQiXSxbInAiLDg0" +
  "OSwiczAiXSxbInAiLDMxNSwiczEiXSxbInAiLDI3MiwiczIiXSxbInAiLDY5MSwiczMiXSxbInAiLDQ1MywiczQiXSxbInAi" +
  "LDc1NCwiczUiXSxbInIiLCJyIl0sWyJwIiw3ODUsInM2Il0sWyJwIiwxNzUsInM3Il0sWyJwIiw2NjMsInM4Il0sWyJwIiwx" +
  "ODgsInM5Il0sWyJwIiw4MDcsInMxMCJdLFsicCIsNzg0LCJiMCJdLFsicCIsNzAzLCJiMSJdLFsicCIsOTQyLCJiMiJdLFsi" +
  "cCIsMTQ1LCJiMyJdLFsicCIsODg0LCJiNCJdXSxbWyJ0IiwwLDMwLCJhIl1dXQ";
const COACHED_V7 = pd7(COACHED_V6);

describe("canonical form across the flip (regression guard, no RED: behaviour already correct; catches a stored engine 6 or engine 7 row that a retry no longer matches)", () => {
  it("re-encodes a stored engine 6 or engine 7 token to the exact stored string", () => {
    expect(canonicalToken(GOLDEN_CUP8_V6)).toBe(GOLDEN_CUP8_V6);
    expect(canonicalToken(GOLDEN_CUP8_V7)).toBe(GOLDEN_CUP8_V7);
    expect(canonicalToken(COACHED_V6)).toBe(COACHED_V6);
    expect(canonicalToken(COACHED_V7)).toBe(COACHED_V7);
    expect(isCoached(COACHED_V6)).toBe(true);
    expect(isCoached(COACHED_V7)).toBe(true);
  });
});
