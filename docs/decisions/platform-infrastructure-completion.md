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

Coordinator recon found Fluid compute enabled, `skewProtectionMaxAge` set to 43,200 seconds, `skewProtectionBoundaryAt` null, and no rolling release configured. An old deployment pin can therefore outlive a canonical-domain promotion. The coordinator also observed that the previous immutable deployment URL for `dpl_EgGSj17uzv4HXuFNdgx4cY96BJ42` redirects unauthenticated requests to Vercel login. That protects public direct access, while authenticated project members can still reach protected deployments.

The cutover uses two firewall rules. A temporary rule denies production POST requests to `/api/leaderboard` and `/gate/unlock` during the drain and migration. A retained rule denies those production POST requests when the request host is outside the current stable production aliases. Derive the permitted host set from live deployment aliases and exclude generated immutable deployment URLs. Preview environments retain their own database and do not match these production rules. Record exact predicates, rule identifiers, previous configuration, and readback in the release receipt. Keep the host rule until old writers have been retired and their routes are verified unreachable. Reads remain available.

1. Record the exact current production deployment, its creation timestamp, stable aliases, reviewed candidate SHA, effective function duration limits, and prior skew threshold. Confirm the production connection host and branch without printing credentials. Preserve the prior firewall configuration. Recheck the previous immutable URL's authentication protection.
2. Install and verify the retained production host rule. Install the temporary production POST pause. Probe both admission paths on every stable alias and an old immutable deployment host. Require an edge denial before any database migration. Use an authenticated check where needed to prove that the host rule also blocks protected old deployment writers. Record when the last required denial is confirmed.
3. Drain for at least 300 seconds after verified pause propagation, and at least the longest effective duration of either old admission function. [Vercel documents a 300-second default with Fluid compute](https://vercel.com/docs/functions/configuring-functions/duration#duration-limits). Confirm no project or function override permits longer execution. If it does, use that greater duration and record it. Keep the pause active throughout the drain.
4. Before migration, use `pg_stat_activity` to verify zero active queries referring to `rate_limit_events`, `rate_limit_buckets`, or `leaderboard_entries`. Exclude the inspecting backend and output only the aggregate count. Confirm the inspecting role can see the application role's activity. This check covers database work that outlives a terminated function. Keep admission paused and wait if any matching query remains active. Then apply `pnpm db:migrate` against the intended production branch through the approved environment. Verify migration 0003 appears in `drizzle.__drizzle_migrations` and that the derived table exists.
5. Promote the exact reviewed production application while POST admission remains paused. Confirm cache-busted `/api/health` returns that deployment SHA. Record the replacement deployment's `createdAt` timestamp and effective function duration limits.
6. Set the project's fixed Skew Protection threshold to the replacement deployment's `createdAt` value before restoring writes. [Vercel's custom threshold](https://vercel.com/docs/skew-protection#custom-skew-protection-threshold) retires earlier deployment pins. The [official OpenAPI schema](https://openapi.vercel.sh) exposes `skewProtectionBoundaryAt` through `PATCH /v9/projects/{idOrName}` with operation `updateProject`. It accepts a nonnegative integer in epoch milliseconds. Record the exact previous value and verify the new value through project readback.
7. Probe cache-busted canonical health with each old deployment ID through `?dpl=`, `x-deployment-id`, and the `__vdpl` cookie. Each probe must return the new SHA or reject the stale request. Returning an old SHA fails the cutover. Check the new deployment without a pin and with its valid pin. Recheck the old immutable host's authentication protection and the retained host rule on both POST paths.
8. Run controlled admission smoke through a narrowly authorized coordinator exception while the global pause remains active. Confirm a fresh submission, an idempotent retry, and preserved event history. Record and remove only the smoke leaderboard row through the existing deletion command with its exact identifier. Do not delete rate-limit evidence. Close the exception and verify the pause again.
9. Remove only the temporary pause after all checks pass. Retain the production host rule and new fixed threshold. Verify both canonical admission paths and repeat stale-pin and old-host probes after unpausing. Record the live SHA, migration receipt, firewall rules, threshold, effective duration, and smoke result.

If the deployment fails, keep or restore the temporary POST pause and confirm edge denial. Drain active requests using the applicable effective duration. Restore the recorded previous application and confirm its exact health SHA before `pnpm db:rollback` removes migration 0003. The rollback script applies `drizzle/rollback/0003_serialized_rate_limit.down.sql` and removes only its migration journal row. It preserves `rate_limit_events` and leaderboard rows. Restore the previous skew threshold while writes remain paused, using a supported operation and readback. The observed prior value is null, while the documented patch field accepts an integer, so verify the actual clear operation before relying on a null patch. Keep the host rule unless an explicit rollback adjustment is necessary, and disable it only after the intended old canonical deployment is verified. Re-run canonical and stale-pin probes before resuming admission. A later retry must backfill fresh buckets from retained events.

If edge admission pause, effective drain duration, host isolation, or pin retirement cannot be verified, hold production promotion. Authentication protection alone proves only unauthenticated old-URL isolation. The retained host rule covers authenticated project members reaching old production hosts as well. Project members who can edit firewall rules or database credentials remain trusted operators.

Production migration, firewall changes, threshold changes, pause and drain, preview application HTTP verification, production smoke, independent review, CI, merge, and production health verification are NOT RUN by this acceptance lane. The coordinator owns those actions and their receipts.

## Preview database receipt

Source head `aa6715b` was verified on the existing Neon preview branch on October 15. The project is `summer-lab-87419384`, branch `br-rough-bird-b79ahwsx`, branch name `preview`, database `neondb`. Live metadata confirmed that the branch is neither primary nor default. The direct endpoint is `ep-small-breeze-b7nhwrer.c-13.us-east-1.aws.neon.tech`. Credentials were captured inside a subprocess and were never printed or written into the repository.

The existing `pnpm db:migrate` runner completed twice against that endpoint. The second run succeeded without adding another migration row. Readback found four migration rows, latest `created_at` value `1792066817368`, and `public.rate_limit_buckets`. Leaderboard entries, events, and buckets each contained zero rows before the admission proof.

The preview proof compiled the current `admissionCtes` through Drizzle's `PgDialect` and executed six admissions inside one PostgreSQL transaction. The rule allowed two attempts per 1,000 milliseconds for one task-specific key. Its literal outcomes were first `true`, second `true`, immediate third `false`, inclusive cutoff at +1,000 ms `false`, expiry at +1,001 ms `true`, and separate gate scope `true`. SQL assertions confirmed four retained admission events and one active timestamp in the expired submit bucket. Two task buckets existed before rollback.

The transaction ended with `ROLLBACK`. A separate connection then confirmed zero leaderboard entries, zero event rows, zero buckets, and the same four migration rows. The task-specific fixture therefore persisted no rows. No broad nickname deletion, production connection, production migration, or firewall change occurred. The temporary proof generator was removed. This proves the migrated preview database and production admission SQL. It does not replace an exact deployment's HTTP acceptance or the earlier independent concurrency proof.

Commands used `neonctl branches get` and `neonctl connection-string` with explicit project and preview branch identifiers, the unchanged `pnpm db:migrate` runner twice, and PostgreSQL 16 `psql -X -A -t -v ON_ERROR_STOP=1` with the compiled statements supplied through stdin. Connection values remained in child-process environment fields. An initial readback attempt used a connection URL as `PGDATABASE`, which libpq treated as a literal database name and rejected. The verification used parsed connection fields afterward and all database assertions passed.

## Integrated UI and infrastructure checkpoint

The third dispatch was locally rebased onto UI candidate `0c7ff856dc6dcb8fa3988cacb5009de363b2c981`. The measured integration head is `190f690eb864f0a0a56d4bbf53a7ccefe1185fa9`. The decision-log append conflict preserved both dispatches. The unused import removal was already present in the UI base. No UI source change was duplicated into this dispatch.

At that head, focused backend and loader tests passed 67 tests in eight files. Full units passed 1,046 tests in 119 files. Lint, typecheck, production build, image seam and packs, mirror, theme contrast, theme colors, theme CVD, and client bundle checks passed. `pnpm db:generate` reported no schema changes. Frozen version directories and current data had no diff against the UI candidate.

Fresh emitted-server verification again found three JSON payloads totaling 2,088,694 bytes and all five literal retained replay hashes passed. Chromium browser verification against the fresh production server on port 3416 passed all 26 cases in `data-split.spec.ts`, `engine-v4.spec.ts`, and `share.spec.ts`. The earlier data-split failures are superseded by this integration result. The UI label extraction now preserves lazy data loading; both genuine artifacts load after the user action. This checkpoint is local preintegration. The eventual rebase onto shipped UI main and independent review remain pending.

The port 3416 server remains available for the coordinator. Its local health metadata was configured with abbreviated source SHA `190f690`, reports engine 4 and token versions 1 through 4, and does not claim production deployment identity. Logs are under `/tmp/pokedraft-platform-integrated-*.log`. The preview receipt above remains tied to its earlier exact source; no additional database write or production action occurred during this integration run.
