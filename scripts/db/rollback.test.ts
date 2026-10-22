import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPgSql, type SqlClient } from "./connect.mjs";
import { parseRollbackArgs, rollbackNewest, type MigrationJournal } from "./rollback-core.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const JOURNAL = JSON.parse(
  readFileSync(path.join(ROOT, "drizzle/meta/_journal.json"), "utf8"),
) as MigrationJournal;

function createPgliteSql(client: PGlite, onQuery?: (text: string) => void): SqlClient {
  const runQuery = (text: string, params?: unknown[]) => {
    onQuery?.(text);
    return client.query(text, params);
  };
  return createPgSql({
    query: runQuery,
    connect: async () => ({
      query: runQuery,
      release: () => {},
    }),
  });
}

async function setupMigratedPglite(entriesToApply = JOURNAL.entries) {
  const client = await PGlite.create();
  await client.exec(
    'CREATE SCHEMA IF NOT EXISTS "drizzle"; CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL);',
  );
  for (const entry of entriesToApply) {
    const migrationSql = readFileSync(path.join(ROOT, "drizzle", `${entry.tag}.sql`), "utf8");
    await client.exec(migrationSql);
    await client.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [entry.tag, entry.when],
    );
  }
  return client;
}

describe("scripts/db/rollback", () => {
  it("rolls back 0006 to 0001 printing leaderboard_entries row count 2 each time, refuses 0000 without dropData, and drops leaderboard_entries only with dropData: true (catches unguarded 0000 table drop or missing row-count log)", async () => {
    const client = await setupMigratedPglite();
    try {
      await client.exec(
        `INSERT INTO leaderboard_entries
           (nickname, mode, variant, seed, token, team_score, wins, draws, losses, engine_version, coached, run_fingerprint, ip_hash)
         VALUES
           ('Misty', 'cup8', 'v', 's1', 'pd7.a', 610, 5, 0, 1, 'pokedraft-engine-7', false, 'fp-1', 'h1'),
           ('Brock', 'kanto151', 'v', 's2', 'pd7.b', 590, 4, 1, 1, 'pokedraft-engine-7', true, 'fp-2', 'h2')`,
      );

      const events: string[] = [];
      const sql = createPgliteSql(client, (text) => {
        if (text.startsWith("DROP TABLE")) events.push(`sql:${text}`);
      });

      const expectedTags = [
        "0006_drop_gate_scope",
        "0005_leaderboard_integrity",
        "0004_run_fingerprint_coached",
        "0003_serialized_rate_limit",
        "0002_alltime_board_idx",
        "0001_rate_limit_events",
      ];

      for (const tag of expectedTags) {
        const logs: string[] = [];
        const rolledBack = await rollbackNewest(sql, JOURNAL, {
          log: (msg) => logs.push(msg),
          rollbackDir: path.join(ROOT, "drizzle/rollback"),
        });
        expect(rolledBack).toBe(tag);
        expect(logs).toEqual([
          "[db:rollback] leaderboard_entries rows: 2",
          `[db:rollback] OK, rolled back ${tag}`,
        ]);
      }

      const refusalLogs: string[] = [];
      await expect(
        rollbackNewest(sql, JOURNAL, {
          log: (msg) => refusalLogs.push(msg),
          rollbackDir: path.join(ROOT, "drizzle/rollback"),
        }),
      ).rejects.toThrow(
        "Refusing to roll back 0000_leaderboard_entries without --drop-data because it drops the leaderboard_entries table.",
      );
      expect(refusalLogs).toEqual(["[db:rollback] leaderboard_entries rows: 2"]);
      expect(await sql.query("SELECT nickname FROM leaderboard_entries ORDER BY nickname")).toEqual(
        [{ nickname: "Brock" }, { nickname: "Misty" }],
      );
      expect(
        await sql.query("SELECT created_at::text AS created_at FROM drizzle.__drizzle_migrations"),
      ).toEqual([{ created_at: "1791595926232" }]);

      events.length = 0;
      const dropLogs: string[] = [];
      const dropped = await rollbackNewest(sql, JOURNAL, {
        dropData: true,
        log: (msg) => {
          dropLogs.push(msg);
          events.push(`log:${msg}`);
        },
        rollbackDir: path.join(ROOT, "drizzle/rollback"),
      });
      expect(dropped).toBe("0000_leaderboard_entries");
      expect(dropLogs).toEqual([
        "[db:rollback] leaderboard_entries rows: 2",
        "[db:rollback] OK, rolled back 0000_leaderboard_entries",
      ]);
      expect(events).toEqual([
        "log:[db:rollback] leaderboard_entries rows: 2",
        'sql:DROP TABLE IF EXISTS "leaderboard_entries"',
        "log:[db:rollback] OK, rolled back 0000_leaderboard_entries",
      ]);
      expect(await sql.query("SELECT to_regclass('public.leaderboard_entries') AS rel")).toEqual([
        { rel: null },
      ]);
      expect(await sql.query("SELECT created_at FROM drizzle.__drizzle_migrations")).toEqual([]);
    } finally {
      await client.close();
    }
  });

  it("refuses 0000_leaderboard_entries without --drop-data and preserves the table, player rows, and migration record (catches 0000 rollback dropping leaderboard_entries by default)", async () => {
    const client = await setupMigratedPglite([JOURNAL.entries[0]!]);
    try {
      await client.exec(
        `INSERT INTO leaderboard_entries
           (nickname, mode, variant, seed, token, team_score, wins, draws, losses, engine_version, ip_hash)
         VALUES
           ('Misty', 'cup8', 'v', 's1', 'pd7.a', 610, 5, 0, 1, 'pokedraft-engine-7', 'h1'),
           ('Brock', 'kanto151', 'v', 's2', 'pd7.b', 590, 4, 1, 1, 'pokedraft-engine-7', 'h2')`,
      );
      const sql = createPgliteSql(client);
      const logs: string[] = [];

      await expect(
        rollbackNewest(sql, JOURNAL, {
          dropData: parseRollbackArgs([]).dropData,
          log: (msg) => logs.push(msg),
          rollbackDir: path.join(ROOT, "drizzle/rollback"),
        }),
      ).rejects.toThrow(
        "Refusing to roll back 0000_leaderboard_entries without --drop-data because it drops the leaderboard_entries table.",
      );
      expect(logs).toEqual(["[db:rollback] leaderboard_entries rows: 2"]);
      expect(await sql.query("SELECT nickname FROM leaderboard_entries ORDER BY nickname")).toEqual(
        [{ nickname: "Brock" }, { nickname: "Misty" }],
      );
      expect(
        await sql.query("SELECT created_at::text AS created_at FROM drizzle.__drizzle_migrations"),
      ).toEqual([{ created_at: "1791595926232" }]);
      expect(parseRollbackArgs(["--drop-data"])).toEqual({ dropData: true });
      expect(parseRollbackArgs(["--", "--drop-data"])).toEqual({ dropData: true });
    } finally {
      await client.close();
    }
  });

  it("logs that leaderboard_entries does not exist instead of crashing when already rolled back (catches 42P01 relation missing crash)", async () => {
    const client = await setupMigratedPglite([]);
    try {
      const sql = createPgliteSql(client);
      const logs: string[] = [];
      const result = await rollbackNewest(sql, JOURNAL, {
        log: (msg) => logs.push(msg),
        rollbackDir: path.join(ROOT, "drizzle/rollback"),
      });
      expect(result).toBeNull();
      expect(logs).toEqual([
        "[db:rollback] leaderboard_entries table does not exist",
        "[db:rollback] nothing applied",
      ]);
    } finally {
      await client.close();
    }
  });
});
