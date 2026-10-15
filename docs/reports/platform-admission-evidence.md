# Platform admission and fixture evidence

This dispatch reduces a fresh leaderboard submission to three database queries and serializes admission for each hashed IP and scope. The insert and rank lookup stay separate. A saved submission still returns 201 with a null rank if the rank lookup fails.

## Data and boundaries

`rate_limit_buckets` stores one timestamp array per `(scope, key_hash)`. The upsert prunes expired timestamps and admits an attempt only when the active array contains fewer than the configured maximum. `ON CONFLICT DO UPDATE` serializes contenders on the shared row. The cutoff stays inclusive. An attempt at exactly the cutoff still counts.

The migration backfills buckets from existing events. `rate_limit_events` remains the admission evidence table. Successful admission appends one event in the same statement. Refusals and accepted-run retries append none. This dispatch retains events when their window expires. Event retention therefore needs a future operational policy if storage growth becomes material.

`admitSubmission` combines the saved-token probe, daily nickname precheck, and admission in one query. Its result is a discriminated union. A retry returns the saved row. A fresh admission proceeds to replay, insert, and rank. The unique indexes remain authoritative when simultaneous submissions pass the precheck.

## RED and GREEN

Commit `17a30ae` contains the failing guards before production changes. The tests measured four actual PGlite client queries for an all-time submission and five for a daily submission, against the literal target of three. The history guard expected three admitted events after expiry and found one.

After implementation, `platform-admission.test.ts` measures three actual queries for fresh submissions on both board paths and two for retries. The history and exact window boundary guards pass.

The focused command passed 63 tests in seven files in 5.03 seconds:

```sh
pnpm vitest run src/leaderboard/server/__tests__ src/gate/__tests__/unlock.test.ts src/db/__tests__/migrations.test.ts
```

The tests cover invalid attempts, token and daily conflicts, retry behavior, insert races, saved responses when rank fails, hashed IP isolation, gate behavior, migration metadata, history backfill, and fixture isolation. Focused ESLint and `pnpm exec tsc --noEmit` pass. A second `pnpm db:generate` reports no schema changes.

## Independent PostgreSQL concurrency

`scripts/audit/prove-rate-limit.mts` runs the production admission SQL through independent `psql` processes against a local, task-owned PostgreSQL 16.14 cluster. Each round verifies 24 distinct PostgreSQL backend PIDs.

| Round | Existing active attempts | Allowed | Refused |
| --- | ---: | ---: | ---: |
| Empty bucket | 0 | 10 | 14 |
| Exact inclusive cutoff at +1000 ms | 10 | 0 | 24 |
| Expired cutoff at +1001 ms | 0 | 10 | 14 |
| Last available slot | 9 | 1 | 23 |

The proof checks ten active submit timestamps, twenty retained submit events after the first three rounds, and a separate admitted gate event for the same key. The last-slot round retains exactly ten events for its separate key. No production connection, data, or migration was used. The temporary PostgreSQL process was stopped after the proof.

To rerun against an already migrated isolated local cluster:

```sh
PLATFORM_TEST_DATABASE_URL=postgresql://127.0.0.1:55483/postgres pnpm exec tsx scripts/audit/prove-rate-limit.mts
```

The script requires a loopback URL. `PSQL_PATH` overrides the local executable path.

## Fixture benchmark

The fixture caches one immutable, migrated, empty 40,606,208 byte database dump. Every test loads that dump into a fresh PGlite client. Each client closes normally. A separate test still executes all migrations against a genuinely empty database, and the backfill test applies the new migration over historical events.

The claim measured here is local fixture setup and teardown cost. This is not a production request latency benchmark. `scripts/audit/benchmark-platform-fixtures.mts` alternates fresh initialization plus migration and snapshot loading six times each. Each timed run checks an empty leaderboard, empty buckets, four applied migrations, and real client closure.

The final unprofiled run produced these milliseconds:

| Iteration | Fresh initialization and migrations | Snapshot |
| --- | ---: | ---: |
| 1 | 435 | 84 |
| 2 | 416 | 79 |
| 3 | 410 | 80 |
| 4 | 404 | 82 |
| 5 | 421 | 93 |
| 6 | 412 | 93 |

The medians are 414 ms and 83 ms. The ranges are 404 to 435 ms and 79 to 93 ms. An earlier independent alternating run measured medians of 414 ms and 87 ms. Both sides completed every correctness and closure check. The snapshot moves initialization and migration work to one setup per test module. The first snapshot setup still pays that cost.

The machine had twelve logical CPUs and a load average of 4.51 at the initial check. Alternating runs limit drift from other workspace activity. A separate CPU profile, excluded from reported timing, assigned 40.6 percent of sampled time to PGlite JavaScript and 41.6 percent to PostgreSQL WASM. Filesystem path normalization, lookup, and writes were the largest named JavaScript samples. The result reflects repeated database initialization costs.

```sh
pnpm exec tsx scripts/audit/benchmark-platform-fixtures.mts
```

## Deployment and rollback

Apply migration 0003 before the application uses the new buckets. Roll back the application before applying `drizzle/rollback/0003_serialized_rate_limit.down.sql`. The down migration drops the derived buckets and preserves event history. Schema creation and metadata generation were local. Production migration, preview verification, production verification, full build, and independent dispatch review were NOT RUN by this implementation lane.

## Decisions

Model the Domain shaped the admission result as a discriminated union and the shared limiter state as one row per key and scope. Explain the Number and the benchmark checklist required alternating runs, correctness assertions, real teardown, and a separate CPU profile before adopting the fixture snapshot. Architect was skipped because the parent dispatch fixed the design. The coordinator owns the independent review and shipping gates.
