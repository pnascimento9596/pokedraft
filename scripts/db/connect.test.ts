import { afterEach, describe, expect, it, vi } from "vitest";
import { connect, createPgSql } from "./connect.mjs";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const ORIGINAL_DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED;
const ORIGINAL_DB_DRIVER = process.env.DB_DRIVER;

afterEach(() => {
  if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;

  if (ORIGINAL_DATABASE_URL_UNPOOLED === undefined) delete process.env.DATABASE_URL_UNPOOLED;
  else process.env.DATABASE_URL_UNPOOLED = ORIGINAL_DATABASE_URL_UNPOOLED;

  if (ORIGINAL_DB_DRIVER === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = ORIGINAL_DB_DRIVER;
});

describe("scripts/db/connect", () => {
  it("keeps the Neon HTTP driver when DB_DRIVER is unset and selects pg when DB_DRIVER=pg", () => {
    delete process.env.DATABASE_URL_UNPOOLED;
    process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/postgres";

    delete process.env.DB_DRIVER;
    const neonConn = connect();
    expect(neonConn.host).toBe("localhost");
    expect(typeof neonConn.sql).toBe("function");
    expect(typeof neonConn.migrate).toBe("function");

    process.env.DB_DRIVER = "pg";
    const pgConn = connect();
    expect(pgConn.host).toBe("localhost");
    expect(typeof pgConn.sql).toBe("object");
    expect(typeof pgConn.sql.query).toBe("function");
    expect(typeof pgConn.sql.transaction).toBe("function");
    expect(typeof pgConn.migrate).toBe("function");
  });

  it("defers sql.query execution until awaited so sql.transaction runs all statements inside BEGIN/COMMIT on one client", async () => {
    const poolQuery = vi.fn(async (text: string, params?: unknown[]) => ({
      rows: [{ text, params }],
    }));
    const clientCalls: { text: string; params?: unknown[] }[] = [];
    const release = vi.fn();
    const sql = createPgSql({
      query: poolQuery,
      connect: async () => ({
        query: async (text: string, params?: unknown[]) => {
          clientCalls.push({ text, params });
          return { rows: [{ ok: text }] };
        },
        release,
      }),
    });

    const first = sql.query("DROP INDEX idx_a");
    const second = sql.query(
      "DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1",
      [123],
    );
    expect(poolQuery).not.toHaveBeenCalled();
    expect(clientCalls).toEqual([]);

    const txRows = await sql.transaction([first, second]);
    expect(poolQuery).not.toHaveBeenCalled();
    expect(clientCalls).toEqual([
      { text: "BEGIN", params: undefined },
      { text: "DROP INDEX idx_a", params: [] },
      {
        text: "DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1",
        params: [123],
      },
      { text: "COMMIT", params: undefined },
    ]);
    expect(txRows).toEqual([
      [{ ok: "DROP INDEX idx_a" }],
      [{ ok: "DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1" }],
    ]);
    expect(release).toHaveBeenCalledTimes(1);

    const directRows = await sql.query("SELECT $1::int AS n", [7]);
    expect(poolQuery).toHaveBeenCalledExactlyOnceWith("SELECT $1::int AS n", [7]);
    expect(directRows).toEqual([{ text: "SELECT $1::int AS n", params: [7] }]);
  });

  it("rolls back and releases the client when a statement inside sql.transaction fails", async () => {
    const clientCalls: string[] = [];
    const release = vi.fn();
    const sql = createPgSql({
      query: async () => ({ rows: [] }),
      connect: async () => ({
        query: async (text: string) => {
          clientCalls.push(text);
          if (text === "FAIL_STEP") throw new Error("boom");
          return { rows: [] };
        },
        release,
      }),
    });

    await expect(
      sql.transaction([sql.query("STEP_1"), sql.query("FAIL_STEP"), sql.query("STEP_3")]),
    ).rejects.toThrow("boom");

    expect(clientCalls).toEqual(["BEGIN", "STEP_1", "FAIL_STEP", "ROLLBACK"]);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
