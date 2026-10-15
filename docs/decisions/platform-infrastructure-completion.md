# Platform infrastructure completion

## Outcome and scope

Fresh ranked submissions use three database queries for admission, insertion, and rank. Accepted retries use two queries and consume no admission slot. Invalid attempts, token conflicts, and daily nickname conflicts consume an admitted slot before rejection. Rank failure returns the saved entry with a null rank. Concurrent insert conflicts still resolve through the authoritative unique indexes.

The shared limiter stores active timestamps in one row per scope and hashed IP. An upsert locks that row and rechecks its current timestamp array. Successful admission appends an event in the same statement. The exact sliding-window cutoff remains inclusive. Refused attempts do not extend lockout. Gate and submit scopes remain separate.

The build loader re-exports only byte-identical retained JSON through the current data module. Distinct historical JSON remains embedded with its original bytes. The loader declares the current artifact as a dependency so a future artifact change invalidates the alias. This reduces repeated server payloads while retaining real historical replay results.

## Recon and decisions

`src/ratelimit/store.ts` previously counted events and then inserted under a statement snapshot. Independent concurrent connections could each see an available slot. The shared bucket upsert makes admission serialize on the actual database row.

`src/leaderboard/server/handlers.ts` previously performed separate retry and daily probes before rate limiting. `LeaderboardStore.admitSubmission` now returns a discriminated admission result from one query. A same-token and same-nickname retry returns its saved row before admission. Other token and daily conflicts follow admission. The production route wires the store and parse-rejection limiter to the same database. A custom store owns valid-submission admission; a custom `deps.limiter` alone only changes parse-rejection admission.

`src/db/schema.ts` and migration 0003 add derived bucket state. Existing event evidence remains available. All event history is retained, so storage grows with admitted requests. Old inactive bucket keys also remain until a future maintenance policy removes them. This dispatch adds no scheduled cleanup or retention deadline.

Architect skipped because the dispatch fixed the design. Prove It Works required execution of the emitted server modules and independent PostgreSQL connections. Technical Writing and Unslop shaped this decision record and the cutover instructions.

## Local acceptance

The combined checkout passed the following checks before final rebase and independent review.

- Focused backend and loader tests passed 67 tests in eight files.
- Full units passed 1,044 tests in 119 files.
- Lint, typecheck, production build, mirror, image seam, image packs, theme contrast, theme colors, and theme CVD checks passed.
- Migration generation reported no schema changes.
- A fresh task-owned PostgreSQL 16 cluster passed four rounds of 24 independent connections. Admitted counts were 10 for an empty bucket, zero at the inclusive cutoff, 10 after expiry, and one for the last slot. It retained event history and separated gate from submit. The cluster stopped cleanly.
- The emitted server build contains three actual data payloads totaling 2,088,694 JSON payload bytes. This measures JSON payload bytes, not total JavaScript size or request latency. The earlier baseline report measured eight copies totaling 5,144,396 bytes.
- All five actual emitted retained replay hashes match the literal v1, v2, and v3 goldens. No retained engine marker appears in client chunks.

The combined Share, engine-v4, and data-split browser selection passed 23 cases and failed three data-split guards. Inspection found the UI chemistry label import eagerly loading species data. A later six-case data-split rerun passed two and failed four, including the slow-picker guard. The preceding UI dispatch owns that import correction. No passing data-split claim applies to this checkout.

The final review packet must replace or supplement these results after rebasing onto the shipped UI dispatch. [The platform evidence report](../reports/platform-admission-evidence.md) preserves fixture timing, query counts, migration checks, and concurrency details.

## Deployment and rollback

Migration 0003 creates and backfills `rate_limit_buckets`. The old application writes only event history. The new application writes buckets and events. Prevent old and new writers from serving requests concurrently during cutover.

1. Record the exact current production deployment and the reviewed candidate SHA. Confirm the selected connection host and database branch without printing credentials.
2. Pause external POST admission to both `/api/leaderboard` and the gate unlock endpoint `/gate/unlock`. Wait for in-flight requests to finish. Keep reads available if the hosting control supports it.
3. Apply `pnpm db:migrate` against the intended production branch through the approved environment. Verify migration 0003 appears in `drizzle.__drizzle_migrations` and that the derived table exists.
4. Promote the exact reviewed application deployment while POST admission remains paused. Confirm cache-busted `/api/health` returns that deployment SHA. Confirm every application instance serving admission uses the new code.
5. Run a controlled smoke request and confirm valid admission, duplicate retry behavior, and preserved event history. Record and remove any test leaderboard rows through the existing deletion command with exact identifiers. Do not delete rate-limit evidence.
6. Restore POST admission and record the health SHA, migration receipt, and smoke result.

If the deployment fails, keep POST admission paused. Restore the recorded previous application deployment. Confirm its exact health SHA before `pnpm db:rollback` removes migration 0003. The rollback script applies `drizzle/rollback/0003_serialized_rate_limit.down.sql` and removes only its migration journal row. It preserves `rate_limit_events` and leaderboard rows. Resume admission only after the previous application is confirmed. A later retry must backfill fresh buckets from retained events.

If the platform cannot pause admissions or exclude old instances, hold production promotion until that cutover control exists. A schema migration followed by a rolling application replacement alone does not prove correct concurrent admission.

Production migration, preview database verification, production smoke, independent review, CI, merge, and production health verification are NOT RUN by this acceptance lane. The coordinator owns those steps and their receipts.
