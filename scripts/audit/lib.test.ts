import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendJsonl,
  minutesSinceTouch,
  newYorkDate,
  readJsonl,
  timedFetch,
  touchLogFile,
  vercelInfo,
  whenQuiet,
} from "./lib.mjs";

const cacheDir = path.join(import.meta.dirname, "../../node_modules/.cache/audit-lib-tests");
let dir: string;

beforeEach(() => {
  mkdirSync(cacheDir, { recursive: true });
  dir = mkdtempSync(path.join(cacheDir, "t-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

type Gate = { load1: number; quiet: boolean; waitedMs: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("newYorkDate", () => {
  it("uses the New York calendar day in summer time", () => {
    expect(newYorkDate(new Date("2026-10-11T03:30:00Z"))).toBe("2026-10-10");
    expect(newYorkDate(new Date("2026-10-11T04:00:00Z"))).toBe("2026-10-11");
  });

  it("uses the New York calendar day in winter time", () => {
    expect(newYorkDate(new Date("2026-01-01T04:59:59Z"))).toBe("2025-12-31");
    expect(newYorkDate(new Date("2026-01-01T05:00:00Z"))).toBe("2026-01-01");
  });
});

describe("JSONL files", () => {
  it("reads nothing from a file that does not exist", () => {
    expect(readJsonl(path.join(dir, "missing.jsonl"))).toEqual([]);
  });

  it("creates the directory and keeps one record per line, in order", () => {
    const file = path.join(dir, "deep/er/records.jsonl");
    appendJsonl(file, { n: 1 });
    appendJsonl(file, { n: 2, text: "two" });
    expect(readJsonl(file)).toEqual([{ n: 1 }, { n: 2, text: "two" }]);
  });
});

describe("minutesSinceTouch", () => {
  it("is infinite when nothing was touched", () => {
    expect(minutesSinceTouch(dir, "prod:api")).toBe(Number.POSITIVE_INFINITY);
  });

  it("counts only touches that start with the prefix, from the newest one", () => {
    const now = Date.now();
    const log = touchLogFile(dir);
    appendJsonl(log, { at: "x", epochMs: now - 40 * 60_000, what: "prod:api" });
    appendJsonl(log, { at: "x", epochMs: now - 20 * 60_000, what: "prod:api-page:/leaderboard" });
    appendJsonl(log, { at: "x", epochMs: now - 1 * 60_000, what: "prod:card" });
    expect(minutesSinceTouch(dir, "prod:api")).toBeCloseTo(20, 1);
    expect(minutesSinceTouch(dir, "prod:card")).toBeCloseTo(1, 1);
    expect(minutesSinceTouch(dir, "prod:r")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("vercelInfo", () => {
  it("keeps the two regions and drops the request id", () => {
    const headers = new Headers({
      "x-vercel-id": "iad1::iad1::abc12-1760000000000-0123456789ab",
      "x-vercel-cache": "MISS",
      "cache-control": "no-store",
    });
    expect(vercelInfo(headers)).toEqual({
      regions: ["iad1", "iad1"],
      cache: "MISS",
      cacheControl: "no-store",
    });
  });

  it("reports no regions when the header is missing", () => {
    expect(vercelInfo(new Headers())).toEqual({ regions: [], cache: null, cacheControl: null });
  });
});

describe("whenQuiet", () => {
  it("runs the task at once on a quiet machine and removes the lock", async () => {
    const result = await whenQuiet(
      dir,
      "test",
      { maxLoad: 1e9, pollMs: 5 },
      async (gate: Gate) => ({
        quiet: gate.quiet,
        lockHeld: existsSync(path.join(dir, "measure.lock")),
      }),
    );
    expect(result).toEqual({ quiet: true, lockHeld: true });
    expect(existsSync(path.join(dir, "measure.lock"))).toBe(false);
  });

  it("goes ahead after the maximum wait on a busy machine and says so", async () => {
    const started = Date.now();
    const gate = await whenQuiet(
      dir,
      "test",
      { maxLoad: -1, maxWaitMs: 120, pollMs: 10 },
      async (g: Gate) => g,
    );
    expect(gate.quiet).toBe(false);
    expect(gate.waitedMs).toBeGreaterThanOrEqual(120);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("never lets two tasks overlap", async () => {
    let active = 0;
    let peak = 0;
    const order: string[] = [];
    const task = (name: string) => async () => {
      active += 1;
      peak = Math.max(peak, active);
      order.push(`start ${name}`);
      await sleep(40);
      order.push(`end ${name}`);
      active -= 1;
    };
    await Promise.all([
      whenQuiet(dir, "a", { maxLoad: 1e9, pollMs: 5 }, task("a")),
      whenQuiet(dir, "b", { maxLoad: 1e9, pollMs: 5 }, task("b")),
    ]);
    expect(peak).toBe(1);
    expect(order).toHaveLength(4);
    expect(order[1]).toBe(order[0]!.replace("start", "end"));
  });

  it("removes a lock whose process is gone", async () => {
    writeFileSync(
      path.join(dir, "measure.lock"),
      JSON.stringify({ pid: 999_999_999, holder: "dead", at: "2026-01-01T00:00:00Z" }),
    );
    const value = await whenQuiet(dir, "test", { maxLoad: 1e9, pollMs: 5 }, async () => "ran");
    expect(value).toBe("ran");
  });

  it("releases the lock when the task throws", async () => {
    await expect(
      whenQuiet(dir, "boom", { maxLoad: 1e9, pollMs: 5 }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(existsSync(path.join(dir, "measure.lock"))).toBe(false);
    await expect(
      whenQuiet(dir, "after", { maxLoad: 1e9, pollMs: 5 }, async () => "next"),
    ).resolves.toBe("next");
  });
});

describe("timedFetch", () => {
  it("says which requests had to open a connection", async () => {
    // Like the Vercel edge: a GET keeps the connection alive, the answer to a HEAD closes it.
    const server = createServer((request, response) => {
      if (request.method === "HEAD") response.setHeader("connection", "close");
      response.end(request.method === "HEAD" ? undefined : "ok");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    try {
      const flags: boolean[] = [];
      for (const method of ["GET", "GET", "HEAD", "HEAD", "HEAD", "GET", "GET"]) {
        const result = await timedFetch(url, { method });
        expect(result.status).toBe(200);
        flags.push(result.newConnection);
        await sleep(30);
      }
      // The first GET opens a connection and the second reuses it. The first HEAD reuses it and
      // gets it closed. Each request after a HEAD then opens a new connection: the second HEAD,
      // the third HEAD and the GET that follows it.
      expect(flags).toEqual([true, false, false, true, true, true, false]);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});
