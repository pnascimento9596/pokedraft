import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "../client";

const RESULT = { fields: [], rows: [], command: "SELECT", rowCount: 0, rowAsArray: false };

beforeAll(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@ep-test-123456.us-east-2.aws.neon.tech/db");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function answering() {
  const inits: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      inits.push(init);
      return Response.json(RESULT);
    }),
  );
  return inits;
}

describe("Neon request timeout (catches SE-18, a hung Neon fetch running to the function's max duration)", () => {
  it("gives every query its own live 4000 ms abort signal, not one shared signal made at startup", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const inits = answering();
    await getDb().execute(sql`select 1`);
    await getDb().execute(sql`select 2`);
    expect(inits).toHaveLength(2);
    expect(inits.map((i) => i.signal instanceof AbortSignal)).toEqual([true, true]);
    expect(inits.map((i) => i.signal?.aborted)).toEqual([false, false]);
    expect(inits[0]!.signal).not.toBe(inits[1]!.signal);
    expect(timeout.mock.calls).toEqual([[4000], [4000]]);
  });

  it("rejects a query whose fetch never answers once its signal fires", async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => realTimeout(20));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal!.reason));
          }),
      ),
    );
    const failure = await getDb()
      .execute(sql`select 1`)
      .then(
        () => null,
        (e: unknown) => e,
      );
    const names: string[] = [];
    // Drizzle wraps the driver error in `cause`; the Neon driver keeps the fetch error in `sourceError`.
    for (let cur = failure; cur instanceof Error;) {
      names.push(cur.name);
      cur = cur.cause ?? (cur as { sourceError?: unknown }).sourceError;
    }
    expect(names).toEqual(["Error", "NeonDbError", "TimeoutError"]);
  });
});
