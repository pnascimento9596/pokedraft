import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ connection: vi.fn(), execute: vi.fn(), getDb: vi.fn() }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/db/client", () => ({ getDb: mocks.getDb }));

beforeEach(() => {
  mocks.connection.mockResolvedValue(undefined);
  mocks.execute.mockResolvedValue([{ healthy: 1 }]);
  mocks.getDb.mockReturnValue({ execute: mocks.execute });
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("VERCEL_REGION", "iad1");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

async function health(query = "") {
  const { GET } = await import("../route");
  return GET(new Request(`https://pokedraft.test/api/health${query}`));
}

describe("health endpoint deployment proof", () => {
  it("reports literal deployment and version metadata without a database read", async () => {
    const response = await health("?cache-bust=probe");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      sha: "0123456789abcdef0123456789abcdef01234567",
      env: "production",
      region: "iad1",
      engine: "pokedraft-engine-4",
      tokenVersions: [1, 2, 3, 4],
    });
    expect(mocks.connection).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it.each(["?db=0", "?db=true", "?db=01"])("never reads the database for %s", async (query) => {
    expect((await health(query)).status).toBe(200);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("reports missing deployment metadata as null without inventing a SHA or region", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("VERCEL_REGION", undefined);
    expect(await (await health()).json()).toEqual({
      sha: null,
      env: null,
      region: null,
      engine: "pokedraft-engine-4",
      tokenVersions: [1, 2, 3, 4],
    });
  });

  it("performs exactly one read-only connectivity query only when db=1", async () => {
    const response = await health("?db=1");
    expect(response.status).toBe(200);
    expect((await response.json()).db).toEqual({ status: "ok" });
    expect(mocks.getDb).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledOnce();
    const { PgDialect } = await import("drizzle-orm/pg-core");
    expect(new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0])).toMatchObject({
      sql: "select 1",
      params: [],
    });
  });

  it("returns 503 and a neutral unavailable status without exposing a database failure", async () => {
    mocks.execute.mockRejectedValue(new Error("private-database-detail"));
    const response = await health("?db=1");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).db).toEqual({ status: "unavailable" });
  });

  it("reports an unconfigured database as unavailable only for the requested probe", async () => {
    mocks.getDb.mockImplementation(() => {
      throw new Error("DATABASE_URL is not set");
    });
    expect((await health()).status).toBe(200);
    const response = await health("?db=1");
    expect(response.status).toBe(503);
    expect((await response.json()).db).toEqual({ status: "unavailable" });
  });
});
