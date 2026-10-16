# Coached SQL hardening

Dispatch C of the hand-off written 2026-10-16 after PRs #61, #62 and #63. Section C follows
verbatim. This PR does items 11 and 12. Item 13 is deferred by the coordinator.

## C. Board and token hardening (GLM notes on #62 plus my own)

11. **`sql.raw` in `coachedSql`.** `src/leaderboard/server/store.ts:51` interpolates version prefixes
    with `sql.raw`. It is safe today because `MANAGER_TOKEN_VERSIONS` (`src/ui/manager/coached.ts:7`)
    is the constant `[6]`. Add a compile-time or startup guard that every entry is a positive integer,
    so a future edit cannot turn it into an injection surface.
12. **Malformed-row asymmetry.** If a malformed `pd6.`-prefixed token were ever hand-inserted, the
    SQL `decode` / `::jsonb` cast throws and the filtered board views return 503. `isCoached` in
    TypeScript returns false for the same token. Stored tokens are canonical re-encodes, so this needs
    manual DB tampering, but you can make the SQL total: guard the arm with a
    `token ~ '^pd6\.[A-Za-z0-9_-]+$'` check, and extend the PGlite equivalence test in
    `src/leaderboard/server/__tests__/coach-board.test.ts` with a malformed row that both rules call
    uncoached.
13. **Scale path for the coached filter.** Each filtered view decodes every row it scans, and a rare
    view may read the whole board. Boards are tiny today. If they grow, add a `coached boolean NOT NULL
    DEFAULT false` column set at insert by the server. It is backward compatible: old writers only
    insert uncoached rows, and no coached row existed before #62. Backfill by recomputing with
    `isCoached`. Migration plus rollback file, and follow the production migration protocol recorded
    in `STATE.md` (Neon preview first, then production).

## Who notices

Players notice nothing on a healthy board. Every stored token is a canonical re-encode, and every
canonical token gets the same Coached verdict as before. What changes is the failure mode. Before
this PR, one hand-edited `pd6.` row turned the Uncoached and Coached views into 503
`DB_UNAVAILABLE` for everyone. Now that row reads uncoached and the views stay up. The next
engineer who appends a token version gets a compile error and a module-load throw if the value is
not a positive integer, instead of SQL text built from it.

## Decisions

**Item 11. Guard at both layers.** `MANAGER_TOKEN_VERSIONS` is typed through
`PositiveIntegers<typeof VERSIONS>` in `src/ui/manager/coached.ts`. The type is `never` unless
every element's string form matches `${bigint}` and is neither negative nor `"0"`. A fraction
(`"1.5"`), an exponent (`"1e+21"`), `NaN`, `Infinity` and a widened `number` all fail. The store's
builder is now `coachedSqlFor(versions)`, and `coachedSql = coachedSqlFor(MANAGER_TOKEN_VERSIONS)`
runs it at module load. `coachedSqlFor` throws `coachedSql token versions must be positive integers,
got <v>` before any `sql.raw` call. The runtime check sits where the splicing happens, which is the
boundary that matters (Boundary Discipline). The type moves the same rule to compile time
(Type System Discipline). A literal union of known versions was rejected: it would need a manual
edit on every engine bump and adds nothing the positive-integer rule does not already give.

**Item 12. A total expression, no migration.** The arm per version is now:

1. `token ~ '^pd<v>\.[A-Za-z0-9_-]+$'` and body length not 1 mod 4. Those are exactly the inputs
   `decode(..., 'base64')` accepts after the `rpad`. A body of length 1 mod 4 (`AAAAA`) fails
   `decode` with `unexpected "="`, and `atob` rejects it too.
2. `convert_from(bytes, 'LATIN1')` instead of `'UTF8'`. LATIN1 maps every byte except NUL, so it
   cannot fail once NUL is screened by `position('\x00'::bytea IN bytes)`. It also matches
   `isCoached`, whose `TextDecoder` replaces invalid UTF-8 rather than failing: a payload with a
   bad byte inside a JSON string is a valid array to both, and a bad byte outside a string is
   invalid JSON to both. Every UTF-8 multibyte sequence is bytes of 0x80 and up, which can only sit
   inside JSON strings, so the array length of a valid token is unchanged.
3. `pg_input_is_valid(text, 'jsonb')` screens the JSON with a soft error, then `jsonb_typeof = 'array'`
   screens objects and scalars before `jsonb_array_length`, which throws on a non-array.

CASE orders the steps. AND does not guarantee evaluation order in PostgreSQL, so the screens are
nested `CASE WHEN` branches. `pg_input_is_valid` needs PostgreSQL 16 or later. The Neon project
`pokedraft` reports `pg_version` 17 (read through the Neon MCP `list_projects`), PGlite is 18.3, and
the local proof below ran on 16.14.

The regex pass alone was not enough. The coordinator flagged that a well-formed charset can still
carry a non-JSON payload, and the RED test shows more: an object payload (`pd6.e30`, `{}`) passes
the cast and then throws in `jsonb_array_length`. Both are handled and tested.

A safe-cast PL/pgSQL function with an `EXCEPTION` block would also be total, but it needs a
migration and the Neon preview then production protocol for a tamper-only path. The pure
expression needs neither.

**The BOM gap, found while fixing.** `isCoached` used `new TextDecoder()`, which drops a leading
byte order mark. A BOM-prefixed payload was a coached array to TypeScript and invalid JSON to
PostgreSQL. The decoder now passes `ignoreBOM: true`, so `JSON.parse` rejects it as PostgreSQL
does. RED commit `ce96eef` shows the mismatch before the change. Canonical tokens never start with
a BOM, so no real row moves.

**Residual differences, pinned and not fixed.** Three tamper-only payload classes are valid to
`JSON.parse` and invalid to `jsonb`: a `\u0000` escape, a lone surrogate escape such as `\ud800`,
and a number that overflows PostgreSQL `numeric` (`1e1000000`, which JavaScript reads as
`Infinity`). With four elements, SQL says uncoached and `isCoached` says coached, and neither
throws. The test "pins the tampered-only payloads PostgreSQL jsonb rejects and JSON.parse accepts"
asserts exactly that, so a future change in either rule shows up. Matching them would mean
reimplementing PostgreSQL's numeric limits in TypeScript for rows that only a database edit can
create. That does not earn its place (Laziness Protocol).

**Nesting depth.** PostgreSQL's JSON parser checks stack depth with a hard error that
`pg_input_is_valid` does not soften. The API caps tokens at `TOKEN_MAX` = 4096 characters, which is
at most 3069 payload bytes. On PostgreSQL 16.14 the compiled `coachedSql` evaluated a 4095-character
token of 1534 balanced brackets and a 4096-character token of 3069 open brackets without error,
both uncoached. There is no database `CHECK` on token length, so a hand-inserted token far beyond
`TOKEN_MAX` could still reach the stack limit. That residual is accepted. Item 13's column removes
read-time decoding entirely if it ever matters.

**Item 13. Deferred.** Recorded, not implemented, per the coordinator. Trigger: implement the
`coached boolean NOT NULL DEFAULT false` column (migration, rollback file, backfill through
`isCoached`, Neon preview then production) when a filtered board view becomes measurably slow,
for example a coach view whose query plan scans the whole board and that board holds thousands of
rows, or when a third view or a second consumer of the coached rule appears and a stored flag
becomes simpler than two equal rules. Today the boards are tiny.

**Shape of the change.** The first commit only extracts `coachedSqlFor` with the SQL unchanged,
so the RED test has a seam to call (Sequence Work into Verifiable Units). Each guard then lands as a
failing test commit followed by its fix.

## Evidence

### RED: item 11, commit `04b6312`

`pnpm vitest run src/leaderboard/server/__tests__/coached-sql.test.ts` before the guard:

```
     × throws on a fraction 5ms
     × throws on zero 1ms
     × throws on a negative 1ms
     × throws on NaN 0ms
     × throws on Infinity 0ms
     × throws on an injection-shaped string 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [Function] to throw an error
 Test Files  1 failed (1)
      Tests  6 failed | 1 passed (7)
```

Each of the 6 cases failed with `AssertionError: expected [Function] to throw an error`. The
passing case is "builds for positive integer versions". GREEN at `edf7305`.

Compile-time guard. With the four `@ts-expect-error` directives in
`src/ui/manager/__tests__/coached.test.ts` temporarily turned into plain comments,
`pnpm exec tsc --noEmit` reported:

```
src/ui/manager/__tests__/coached.test.ts(64,11): error TS2322: Type 'number[]' is not assignable to type 'never'.
src/ui/manager/__tests__/coached.test.ts(66,11): error TS2322: Type 'number[]' is not assignable to type 'never'.
src/ui/manager/__tests__/coached.test.ts(68,11): error TS2322: Type 'number[]' is not assignable to type 'never'.
src/ui/manager/__tests__/coached.test.ts(70,11): error TS2322: Type 'number[]' is not assignable to type 'never'.
```

Those are the fraction, zero, negative and widened `number` lines. With the directives restored,
`pnpm typecheck` exits 0, so a weakened type would fail as an unused directive.

### RED: item 12, commit `d51dab7`

`pnpm vitest run src/leaderboard/server/__tests__/coach-board.test.ts` before the SQL fix:

```
{"level":"error","where":"board.read","requestId":"local-996cdcf7-79c3-4423-a09c-0fe93fc8756d","name":"Error","sqlstate":"22023"}
{"level":"error","where":"board.read","requestId":"local-bc43e571-8e71-4ff6-92ba-a7d46fd49378","name":"Error","sqlstate":"22023"}
     × agrees with isCoached on every malformed token instead of throwing 97ms
     × keeps every coach view at 200 with a malformed row on the board 104ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  2 failed | 5 passed (7)
```

- "agrees with isCoached on every malformed token instead of throwing" failed with
  `Error: Failed query: SELECT nickname, (CASE WHEN "leaderboard_entries"."token" LIKE 'pd6.%' THEN jsonb_array_length(...`
  and `Caused by: error: invalid symbol "!" found while decoding base64 sequence`.
- "keeps every coach view at 200 with a malformed row on the board" failed on the assertion. The
  All view returned 200, and the Uncoached and Coached views each returned
  `[503, "DB_UNAVAILABLE"]` where `[200, [...]]` was expected. The two `board.read` log lines above
  are those 503s (`sqlstate` 22023, from `jsonb_array_length` on the `{}` row).

GREEN at `91d7ff5`.

### RED: BOM gap, commit `ce96eef`

Same file, after the SQL fix and with the BOM row added:

```
     × agrees with isCoached on every malformed token instead of throwing 97ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

The failing assertion was the `isCoached` half (`coach-board.test.ts:194`), with the diff
`"pd6 leading byte order mark"`, `- false`, `+ true`. The SQL half already passed. GREEN at
`ef6436d`.

### PostgreSQL 16 proof of the compiled expression

A throwaway script compiled `coachedSql` with drizzle's `PgDialect` and ran it on a scratch
PostgreSQL 16.14 cluster (loopback only, deleted afterwards). The `isCoached` column is the
TypeScript verdict for the same tokens.

| Token | Length | SQL | `isCoached` |
| --- | --- | --- | --- |
| canonical coached | 71 | t | true |
| canonical plain | 50 | f | false |
| bad charset | 15 | f | false |
| len 1 mod 4 | 9 | f | false |
| not json | 24 | f | false |
| object | 7 | f | false |
| nul byte | 18 | f | false |
| invalid UTF-8 inside a string | 19 | t | true |
| overflow, 4 elements | 27 | f | true |
| 1534 balanced brackets | 4095 | f | false |
| 3069 open brackets | 4096 | f | false |

The overflow row is one of the three pinned residual differences.
