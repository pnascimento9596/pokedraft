# Rollback drop-data guard (row 7rb, Red)

Branch `fix/rollback-drop-data-guard` off `origin/main` at `040781bb`. Wave 7 row 7rb (Red).

## Scope

- `scripts/db/rollback-core.mts`: extracts `rollbackNewest(sql, journal, options)` and `parseRollbackArgs(args)` so the rollback decision and SQL execution run against any `SqlClient` from `scripts/db/connect.mts`. Logs `[db:rollback] leaderboard_entries rows: N` (or `[db:rollback] leaderboard_entries table does not exist` when SQLSTATE `42P01` reports the relation absent) before any destructive step on every rollback, and refuses `0000_leaderboard_entries` unless `dropData` is `true`.
- `scripts/db/rollback.mts`: thin CLI wrapper that parses `--drop-data` via `parseRollbackArgs(process.argv.slice(2))`, logs `[db:rollback] target endpoint ${host}`, and calls `rollbackNewest(sql, journal, { dropData })`.
- `scripts/db/rollback.test.ts`: PGlite unit tests covering the full six-migration rollback sequence (`0005_leaderboard_integrity` down to `0000_leaderboard_entries`), refusal without `dropData`, table drop ordering with `dropData: true`, and missing-table handling after `0000_leaderboard_entries` is rolled back.
- `.github/workflows/ci.yml`: untouched. Lines 88 to 101 of `.github/workflows/ci.yml` run `pnpm db:rollback` four times after applying all six migrations (`0005` down to `0002`) and assert `Number(row.count) !== 2`, so the CI `db` job stops at `0001_rate_limit_events` and never reaches `0000_leaderboard_entries`.

## RED output (`fe654504`)

Copied verbatim from `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7rb/vitest-red.log`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7rb

 ❯ scripts/db/rollback.test.ts (3 tests | 3 failed) 1452ms
   ❯ scripts/db/rollback (3)
     × rolls back 0005 to 0001 printing leaderboard_entries row count 2 each time, refuses 0000 without dropData, and drops leaderboard_entries only with dropData: true (catches unguarded 0000 table drop or missing row-count log) 605ms
     × refuses 0000_leaderboard_entries without --drop-data and preserves the table, player rows, and migration record (catches 0000 rollback dropping leaderboard_entries by default) 430ms
     × logs that leaderboard_entries does not exist instead of crashing when already rolled back (catches 42P01 relation missing crash) 417ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  scripts/db/rollback.test.ts > scripts/db/rollback > rolls back 0005 to 0001 printing leaderboard_entries row count 2 each time, refuses 0000 without dropData, and drops leaderboard_entries only with dropData: true (catches unguarded 0000 table drop or missing row-count log)
AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]

- Expected
+ Received

  [
-   "[db:rollback] leaderboard_entries rows: 2",
    "[db:rollback] OK, rolled back 0005_leaderboard_integrity",
  ]

 ❯ scripts/db/rollback.test.ts:75:22
     73|         });
     74|         expect(rolledBack).toBe(tag);
     75|         expect(logs).toEqual([
       |                      ^
     76|           "[db:rollback] leaderboard_entries rows: 2",
     77|           `[db:rollback] OK, rolled back ${tag}`,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  scripts/db/rollback.test.ts > scripts/db/rollback > refuses 0000_leaderboard_entries without --drop-data and preserves the table, player rows, and migration record (catches 0000 rollback dropping leaderboard_entries by default)
AssertionError: promise resolved "'0000_leaderboard_entries'" instead of rejecting

- Expected:
Error {
  "message": "rejected promise",
}

+ Received:
"0000_leaderboard_entries"

 ❯ scripts/db/rollback.test.ts:146:8
    144|           rollbackDir: path.join(ROOT, "drizzle/rollback"),
    145|         }),
    146|       ).rejects.toThrow(
       |        ^
    147|         "Refusing to roll back 0000_leaderboard_entries without --drop…
    148|       );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  scripts/db/rollback.test.ts > scripts/db/rollback > logs that leaderboard_entries does not exist instead of crashing when already rolled back (catches 42P01 relation missing crash)
AssertionError: expected [ '[db:rollback] nothing applied' ] to deeply equal [ …(2) ]

- Expected
+ Received

  [
-   "[db:rollback] leaderboard_entries table does not exist",
    "[db:rollback] nothing applied",
  ]

 ❯ scripts/db/rollback.test.ts:173:20
    171|       });
    172|       expect(result).toBeNull();
    173|       expect(logs).toEqual([
       |                    ^
    174|         "[db:rollback] leaderboard_entries table does not exist",
    175|         "[db:rollback] nothing applied",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


 Test Files  1 failed (1)
      Tests  3 failed (3)
   Start at  13:46:42
   Duration  1.69s (tests 89%, import 10%, transform 1%)
```

## Decisions and evidence

- **Boundary split between `scripts/db/rollback.mts` and `scripts/db/rollback-core.mts` (`principle-boundary-discipline`, `principle-laziness-protocol`).** `scripts/db/rollback.mts` stays a 13-line CLI entry point that parses `process.argv.slice(2)` with `parseRollbackArgs`, reads `drizzle/meta/_journal.json`, connects via `connect()`, prints `[db:rollback] target endpoint ${host}`, and calls `rollbackNewest(sql, journal, { dropData })`. `parseRollbackArgs` strips a leading `"--"` separator before calling `node:util` `parseArgs` with `strict: true` so both `pnpm db:rollback --drop-data` and `pnpm db:rollback -- --drop-data` set `dropData: true` while unknown flags still throw.
- **Adapting `PGlite` to `SqlClient` via `createPgSql` (`principle-test-behavior-not-implementation`, `principle-prove-it-works`).** `PGlite.prototype.query(text, params)` returns `Promise<{ rows: unknown[] }>`, matching the query signature of `PgPoolLike` in `scripts/db/connect.mts`, while `PGlite` is a single in-process connection without `.connect()`. `createPgliteSql` in `scripts/db/rollback.test.ts` wraps `client.query` in a 12-line `PgPoolLike` adapter (`connect: async () => ({ query: runQuery, release: () => {} })`) and passes it to `createPgSql`. That reuses `createPgSql`'s lazy `SqlQuery` and `BEGIN` / `COMMIT` / `ROLLBACK` transaction path against real PGlite SQL execution instead of mocking `SqlClient`.
- **Row-count query before every rollback and missing-table handling (`principle-model-the-domain`).** `logLeaderboardRowCount` runs `SELECT count(*)::int AS count FROM leaderboard_entries` at the start of `rollbackNewest`, before checking `drizzle.__drizzle_migrations` or running the rollback transaction. When `0000_leaderboard_entries` is rolled back with `dropData: true`, the event trace in `scripts/db/rollback.test.ts` records `log:[db:rollback] leaderboard_entries rows: 2` before `sql:DROP TABLE IF EXISTS "leaderboard_entries"`. When `leaderboard_entries` has already been dropped, catching SQLSTATE `42P01` (`relation "leaderboard_entries" does not exist`) logs `[db:rollback] leaderboard_entries table does not exist` and rethrows any other error.

## Evidence and proofs

- **Neon preview proof (`br-rough-bird-b79ahwsx`).** The coordinator ran the four-step sequence against the Neon preview database: `pnpm db:migrate` (6 migrations recorded), `pnpm db:smoke` (OK), `pnpm db:rollback` (logged `[db:rollback] leaderboard_entries rows: 2` before `[db:rollback] OK, rolled back 0005_leaderboard_integrity`), and `pnpm db:migrate` (restored 6 migrations recorded).
- **RED commit re-verification (`fe654504`).** The coordinator re-ran `pnpm vitest run scripts/db/rollback.test.ts` in a detached worktree at `fe654504`: 3 of 3 failed with the exact expected assertion failures.

## NOT RUN

- Playwright e2e suite locally (nothing under `src/` or `e2e/` changed; CI runs the 8-shard matrix).
- Reviewer receipts, PR creation, hosted CI verification, and squash merge.
