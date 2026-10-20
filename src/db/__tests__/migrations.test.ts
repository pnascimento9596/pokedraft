import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("keeps the all-time index in migration metadata so the next generate cannot create it again", () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const previous = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0001_snapshot.json"), "utf8"),
  );
  const current = JSON.parse(
    readFileSync(path.join(root, "drizzle/meta/0002_snapshot.json"), "utf8"),
  );
  expect(current.prevId).toBe(previous.id);
  expect(
    current.tables["public.leaderboard_entries"].indexes.leaderboard_entries_alltime_idx,
  ).toMatchObject({
    name: "leaderboard_entries_alltime_idx",
    isUnique: false,
    method: "btree",
  });
});

it("backfills serialized buckets from event history without deleting admission evidence", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const root = path.resolve(import.meta.dirname, "../../..");
  try {
    for (const name of [
      "0000_leaderboard_entries.sql",
      "0001_rate_limit_events.sql",
      "0002_alltime_board_idx.sql",
    ]) {
      await client.exec(readFileSync(path.join(root, "drizzle", name), "utf8"));
    }
    await client.exec(
      "INSERT INTO rate_limit_events (scope, key_hash, created_at) VALUES ('submit', 'retained', '2026-10-09T15:00:00Z'), ('submit', 'retained', '2026-10-09T16:00:00Z'), ('gate', 'retained', '2026-10-09T16:00:00Z')",
    );
    await client.exec(
      readFileSync(path.join(root, "drizzle/0003_serialized_rate_limit.sql"), "utf8"),
    );
    expect(
      (
        await client.query(
          "SELECT scope, cardinality(attempts) AS attempts FROM rate_limit_buckets ORDER BY scope",
        )
      ).rows,
    ).toEqual([
      { scope: "gate", attempts: 1 },
      { scope: "submit", attempts: 2 },
    ]);
    expect(
      (await client.query("SELECT count(*)::int AS events FROM rate_limit_events")).rows,
    ).toEqual([{ events: 3 }]);
    const metadata = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0003_snapshot.json"), "utf8"),
    );
    expect(
      metadata.tables["public.rate_limit_buckets"].compositePrimaryKeys
        .rate_limit_buckets_scope_key_hash_pk.columns,
    ).toEqual(["scope", "key_hash"]);
  } finally {
    await client.close();
  }
});

it("adds nullable coached and run_fingerprint columns, drops the unused IP index, and rolls back with the paired down file (catches 0004 failing on retained rows or an unrestorable rollback)", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const root = path.resolve(import.meta.dirname, "../../..");
  const columns = async () =>
    (
      await client.query<{ column_name: string; is_nullable: string }>(
        "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'leaderboard_entries' AND column_name IN ('coached', 'run_fingerprint') ORDER BY column_name",
      )
    ).rows;
  const ipIndex = async () =>
    (
      await client.query<{ indexdef: string }>(
        "SELECT indexdef FROM pg_indexes WHERE indexname = 'leaderboard_entries_ip_recent_idx'",
      )
    ).rows.map((r) => r.indexdef);
  try {
    for (const name of [
      "0000_leaderboard_entries.sql",
      "0001_rate_limit_events.sql",
      "0002_alltime_board_idx.sql",
      "0003_serialized_rate_limit.sql",
    ]) {
      await client.exec(readFileSync(path.join(root, "drizzle", name), "utf8"));
    }
    await client.exec(
      "INSERT INTO leaderboard_entries (nickname, mode, variant, seed, token, team_score, wins, draws, losses, engine_version, ip_hash) VALUES ('Retained', 'cup8', 'classic3.squadFirst.g123456789', 'golden-cup8', 'pd3.retained', 593, 5, 0, 1, 'pokedraft-engine-3', 'h')",
    );
    await client.exec(
      readFileSync(path.join(root, "drizzle/0004_run_fingerprint_coached.sql"), "utf8"),
    );
    expect(await columns()).toEqual([
      { column_name: "coached", is_nullable: "YES" },
      { column_name: "run_fingerprint", is_nullable: "YES" },
    ]);
    expect(await ipIndex()).toEqual([]);
    expect(
      (await client.query("SELECT nickname, coached, run_fingerprint FROM leaderboard_entries"))
        .rows,
    ).toEqual([{ nickname: "Retained", coached: null, run_fingerprint: null }]);

    const down = readFileSync(
      path.join(root, "drizzle/rollback/0004_run_fingerprint_coached.down.sql"),
      "utf8",
    )
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of down) await client.exec(statement);
    expect(await columns()).toEqual([]);
    expect(await ipIndex()).toEqual([
      "CREATE INDEX leaderboard_entries_ip_recent_idx ON public.leaderboard_entries USING btree (ip_hash, created_at)",
    ]);
    expect((await client.query("SELECT nickname FROM leaderboard_entries")).rows).toEqual([
      { nickname: "Retained" },
    ]);

    const previous = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0003_snapshot.json"), "utf8"),
    );
    const current = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0004_snapshot.json"), "utf8"),
    );
    const table = current.tables["public.leaderboard_entries"];
    expect(current.prevId).toBe(previous.id);
    expect([table.columns.coached, table.columns.run_fingerprint]).toEqual([
      { name: "coached", type: "boolean", primaryKey: false, notNull: false },
      { name: "run_fingerprint", type: "text", primaryKey: false, notNull: false },
    ]);
    expect(table.indexes.leaderboard_entries_ip_recent_idx).toBeUndefined();
  } finally {
    await client.close();
  }
});

it("makes coached and run_fingerprint NOT NULL, adds the fingerprint unique index and the coached board index, and rolls back with the paired down file (catches a copied run listed twice or a row with no identity)", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const root = path.resolve(import.meta.dirname, "../../..");
  const columns = async () =>
    (
      await client.query<{ column_name: string; is_nullable: string }>(
        "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'leaderboard_entries' AND column_name IN ('coached', 'run_fingerprint') ORDER BY column_name",
      )
    ).rows;
  const indexes = async () =>
    (
      await client.query<{ indexdef: string }>(
        "SELECT indexdef FROM pg_indexes WHERE indexname IN ('leaderboard_entries_fingerprint_uq', 'leaderboard_entries_coached_board_idx') ORDER BY indexname",
      )
    ).rows.map((r) => r.indexdef);
  const insert = (nickname: string, mode: string, token: string, coached: string, fp: string) =>
    client
      .exec(
        `INSERT INTO leaderboard_entries (nickname, mode, variant, seed, token, team_score, wins, draws, losses, engine_version, coached, run_fingerprint, ip_hash) VALUES ('${nickname}', '${mode}', 'v', 's', '${token}', 593, 5, 0, 1, 'pokedraft-engine-6', ${coached}, ${fp}, 'h')`,
      )
      .then(
        () => "inserted",
        (e: { code?: string; constraint?: string }) => `${e.code} ${e.constraint ?? ""}`.trim(),
      );
  try {
    for (const name of [
      "0000_leaderboard_entries.sql",
      "0001_rate_limit_events.sql",
      "0002_alltime_board_idx.sql",
      "0003_serialized_rate_limit.sql",
      "0004_run_fingerprint_coached.sql",
    ]) {
      await client.exec(readFileSync(path.join(root, "drizzle", name), "utf8"));
    }
    expect(await insert("Misty", "cup8", "pd6.a", "false", "'fp-1'")).toBe("inserted");
    await client.exec(
      readFileSync(path.join(root, "drizzle/0005_leaderboard_integrity.sql"), "utf8"),
    );
    expect(await columns()).toEqual([
      { column_name: "coached", is_nullable: "NO" },
      { column_name: "run_fingerprint", is_nullable: "NO" },
    ]);
    expect(await indexes()).toEqual([
      "CREATE INDEX leaderboard_entries_coached_board_idx ON public.leaderboard_entries USING btree (mode, coached, wins DESC, draws DESC, team_score DESC, created_at)",
      "CREATE UNIQUE INDEX leaderboard_entries_fingerprint_uq ON public.leaderboard_entries USING btree (mode, run_fingerprint)",
    ]);
    expect([
      await insert("Brock", "cup8", "pd6.b", "false", "'fp-1'"),
      await insert("Brock", "kanto151", "pd6.c", "false", "'fp-1'"),
      await insert("Gary", "cup8", "pd6.d", "NULL", "'fp-2'"),
      await insert("Gary", "cup8", "pd6.e", "true", "NULL"),
    ]).toEqual(["23505 leaderboard_entries_fingerprint_uq", "inserted", "23502", "23502"]);

    const down = readFileSync(
      path.join(root, "drizzle/rollback/0005_leaderboard_integrity.down.sql"),
      "utf8",
    )
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of down) await client.exec(statement);
    expect(await columns()).toEqual([
      { column_name: "coached", is_nullable: "YES" },
      { column_name: "run_fingerprint", is_nullable: "YES" },
    ]);
    expect(await indexes()).toEqual([]);
    expect(
      (await client.query("SELECT nickname, mode FROM leaderboard_entries ORDER BY mode")).rows,
    ).toEqual([
      { nickname: "Misty", mode: "cup8" },
      { nickname: "Brock", mode: "kanto151" },
    ]);

    const previous = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0004_snapshot.json"), "utf8"),
    );
    const current = JSON.parse(
      readFileSync(path.join(root, "drizzle/meta/0005_snapshot.json"), "utf8"),
    );
    const table = current.tables["public.leaderboard_entries"];
    expect(current.prevId).toBe(previous.id);
    expect([table.columns.coached.notNull, table.columns.run_fingerprint.notNull]).toEqual([
      true,
      true,
    ]);
    expect([
      table.indexes.leaderboard_entries_fingerprint_uq.isUnique,
      table.indexes.leaderboard_entries_coached_board_idx.isUnique,
    ]).toEqual([true, false]);
  } finally {
    await client.close();
  }
});
