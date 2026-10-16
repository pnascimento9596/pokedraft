# Cleanup and debt

One PR: rate-limit retention, review test follow-ups, Prettier drift, three flaky tests, and the
PR #57 receipt in `STATE.md`. Branch `chore/cleanup-debt` off `6053928`.

## 1. Rate-limit retention

### Decision

The admission statement built by `admissionCtes` (`src/ratelimit/store.ts`) now prunes in the
same single statement, so there is still one round trip per admission. Two data-modifying CTEs
run on every admission, whether it is admitted, refused, a retry or a conflict:

| CTE | Deletes | Cap |
| --- | --- | --- |
| `pruned_events` | `rate_limit_events` rows with `created_at` older than 7 days, oldest first | 50 |
| `pruned_buckets` | `rate_limit_buckets` rows whose newest attempt is older than 1 day, never the `(scope, key_hash)` this statement admits | 50 |

Both prunes select candidates with `FOR UPDATE SKIP LOCKED`. The bucket prune repeats its age
condition in the outer `DELETE`, written only against the row's own columns
(`(SELECT max(attempt) FROM unnest(attempts) AS attempt) < cutoff`), so READ COMMITTED rechecks it
against a bucket another admission refreshed concurrently and skips that row. Excluding the
admitted key keeps two sub-statements of one statement off the same row. The candidate query
also reads `admitted`, so the bucket prune starts only after this statement holds its own key's
row lock.

`admissionCtes` refuses a rule whose window is longer than the 1-day bucket idle cutoff (a
`RangeError` naming both numbers). A pruned bucket would otherwise drop attempts still inside a
long window. The coordinator's security review asked for this guard; it replaced the first
version's weaker check against the 7-day event retention. A pruned bucket is rebuilt from
retained events on that key's next admission, as before. Today's windows are 1 hour (submit) and
15 minutes (gate).

### Why `SKIP LOCKED`, measured

The dispatch's literal shape (`WHERE id IN (SELECT ... ORDER BY ... LIMIT 50)`, no row locking)
deadlocks. Two admissions of different keys whose buckets are both stale each lock their own
key, then each try to delete the other's. A scratch PostgreSQL 16.14 cluster (Homebrew, local,
port 55432, deleted after) ran the compiled statement through 24 concurrent `psql` connections
synchronized with `pg_sleep_until`, 10 rounds each, with 24 stale submit buckets, 40 stale gate
buckets and 200 old events seeded per round:

| Variant | Statements | Deadlock errors | Keys left without a fresh bucket |
| --- | --- | --- | --- |
| Dispatch shape (no `SKIP LOCKED`, no ordering) | 240 | 130 | 130 |
| Ordering on `admitted` only | 240 | 133 | 133 |
| `SKIP LOCKED` only | 240 | 0 | 0 |
| Shipped (`SKIP LOCKED` and ordering) | 240 | 0 | 0 |

`SKIP LOCKED` is what removes the deadlock. The ordering adds nothing measurable here, because
PostgreSQL in practice runs unreferenced data-modifying CTEs after the main query. The documentation
calls that order unpredictable, so the explicit dependency stays: it costs one `InitPlan`. A second
check put 24 concurrent admissions on one key with `max: 10` for 5 rounds: exactly 10 admitted and
10 events each round, 0 errors. The serialized limit is unchanged.

### Guards

`src/ratelimit/__tests__/retention.test.ts` (PGlite) was committed RED at `96b0631`, all 6 cases
failing, and went GREEN at `38e3220`. The window guard went RED at `b1e437c` and GREEN at
`7d113a0`. Literal outcomes:

- Events at 7 days plus 1 ms and 30 days are deleted. The 7-day boundary, a 1-minute-old event
  and the admitted key's new event remain.
- Buckets idle 1 day plus 1 ms (submit and gate) are deleted. The 1-day boundary, a bucket with
  one recent attempt and the admitted key (idle 9 days, now holding exactly `[now]`) remain.
- With 60 old events and 60 stale buckets, one admission leaves 10 of each, and a second leaves
  only the two admitted keys.
- A refused admission still prunes.
- `drizzleStore().admitSubmission` prunes too.
- A 2-day window rejects with `rate-limit window 172800000 ms exceeds bucket idle cutoff
  86400000 ms`, and a 1-day window is admitted.

`hardening.test.ts` still sees exactly 1 `execute` per `consume`. `platform-admission.test.ts`
still sees 3 queries for a fresh submission and 2 for a retry.

### Limits

- `rate_limit_events` has no index that leads with `created_at`
  (`rate_limit_events_lookup_idx` is `(scope, key_hash, created_at)`), so each admission scans
  the events table to find prune candidates. At this game's volume that is small. If the table
  ever grows large, add a `created_at` index in its own migration. Not done here, since the
  dispatch named no migration.
- The 50-row caps bound each statement's extra work. A backlog drains at up to 50 rows per table
  per admission.
- Production has not run this statement. Merge and deploy are outside this dispatch.

## 2. Test follow-ups from reviews

All four pin behavior that already holds, so they passed on first run (`8a05e9c`).

- `token.test.ts`: a live decode of `pd4.W10` throws `RunTokenError` code `unknownVersion`.
- `handlers.test.ts`, "spends no attempt on a resubmitted token or a taken daily nickname": also
  asserts `rate_limit_buckets` is exactly `[["submit", hashIp(ip), 2]]`.
- "answers a conflict with its own code even when the hour's attempts are used up" now names
  what it catches: a 429 hiding that the run is already listed.
- New: when two IPs send one daily token concurrently under different nicknames, the race store
  holds both inserts. One gets 201, the other 409 `DUPLICATE_TOKEN`, the inserts end
  `conflict:token` and `saved`, the losing IP has exactly 1 `rate_limit_events` row, and the
  table holds 2.

## 3. Prettier drift

`pnpm format:check` flagged 24 files on `6053928`. `style: apply prettier to files that drifted`
(`92bfcbc`) reformats 19 of them and ignores the other 5:

- `drizzle/meta/*.json` (4 files) are drizzle-kit output, and `pnpm db:generate` would rewrite any
  reformat. They join `.prettierignore` as `drizzle/meta`.
- `src/design/tokens.css` is not formatting-only under Prettier. Prettier lowercases hex colors,
  and `theme-color.test.ts` and `theme-contrast.test.ts` read those values literally (6 failures
  when it was reformatted). It joins `.prettierignore`, and the file is unchanged.

No frozen engine bundle under `src/engine/versions/v*` was flagged. They were already ignored. A
check script compared each reformatted file with `HEAD` after removing whitespace, trailing
commas, markdown table separator dashes, and CSS case. All 19 were identical, apart from redundant
JSX parentheses in `TypeIcon.tsx` and `.30` becoming `0.3` in the reverted `tokens.css`.
`scripts/data/move-traits.json` parses to an identical object. Its v4 manifest digest pins the
bytes at that bundle's source commit, which `check-bundle-provenance.sh` reads from git, not the
working tree. `CLAUDE.md` and `AGENTS.md` changed identically and `pnpm check:mirrors` passes.

## 4. Flaky tests

### 4a. `announce-board` "Try again moves focus to the board once it loads"

Evidence: hosted runs 38322778245 and 38841517775 failed on first attempt with `expected <body>
to be <ol class="list">`.

Root cause, proven: `Board` set a boolean `retried` ref on click, and the focus effect consumed
it on whatever non-null result it saw next. `findByTestId("board-error")` resolves once the error
commits, but the error's passive effect can still be pending. If the click lands in that gap,
React flushes the pending error effect first. That effect sees `retried === true`, clears it, and
focuses the Try again button, which unmounts. The board result then arrives with the flag gone,
and focus stays on `body`.

Reproduction: a temporary 150-iteration copy of the test inside a full `vitest
--maxWorkers=12` run failed 1 of 150 in 1 of 3 runs, at the 1,000 ms `waitFor` limit. With a
20 s wait it hit the 15 s test timeout in 3 of 4 runs, 5 iterations in all. So focus never
arrived. This was not slow scheduling. The guard (`1abce65`, RED 3 of 3 with the CI message)
turns off act, then clicks from a `MutationObserver` callback in the gap between the error commit
and its effect.

Fix (`1a3e463`): the click records the attempt number it starts, and only that attempt's result
takes focus. After the fix the guard passes. In 6 loaded full runs, 900 iterations of the
original pattern passed. The temporary harness was deleted.

### 4b. Hosted build `next/font/google queries have exactly one entry`

Evidence: run 38854566812, attempt 1, `pnpm build`. Turbopack's
`NextFontGoogleFontFileReplacer` failed 21 module resolutions of the Inter CSS that it fetched
from Google. The rerun passed. The fetch is the flaky input. The root cause sits in Next's Google
font fetch and was not traced further. Self-hosting removes the network from the build.

Fix (`37f3845` RED, `7c41254` GREEN): `src/design/fonts/inter.ts` calls `next/font/local` once
per Google subset (cyrillic-ext, cyrillic, greek-ext, greek, vietnamese, latin-ext, latin), in
Google's order. Each call uses family `Inter`, weights 400/600/700, `display: swap`, and its
unicode-range. Only latin preloads and carries `--font-inter`. `next/font/local` has no per-file
unicode-range, so one call per subset is the only way to keep the subsets. The layout imports
`Inter` and applies `Inter.variable` as before.

Identical by construction and measured:

- `scripts/fonts/fetch-inter-woff2.mjs` downloads the woff2 files from the Google CSS API and
  writes `src/design/fonts/web-provenance.json` (URL, unicode-range, SHA-256, bytes). The 7
  SHA-256 hashes equal the 7 files that `next/font/google` bundled into a local build on main.
- The local build emits 21 `@font-face{font-family:Inter;…}` rules with the same ranges, and
  preloads only the latin file, as before.
- `next/font/local` computes its own Arial metrics from the file (89.79/22.36/0/107.89%). Those
  differ from the ones `next/font/google` shipped (90.44/22.52/0/107.12%). So the latin call sets
  `adjustFontFallback: false` and `fallback: ["Inter Fallback"]`, and `src/app/globals.css`
  declares the original fallback face byte for byte. The emitted variable is
  `--font-inter:"Inter", Inter Fallback`. CSS treats the unquoted family identically to the quoted
  one.
- License: Inter is OFL-1.1. `src/design/fonts/OFL.txt` was already committed beside the share
  renderer's TTFs, and the README now covers both.

Real browsers (Playwright Chromium and WebKit, local `next start` of `8ad5b24` on
`/leaderboard`) each list 21 Inter faces. Both resolve `--font-inter` to `"Inter", Inter Fallback`
and report `document.fonts.check` true for 400 and 700. Both requested exactly one font file, the
self-hosted latin woff2, and made no request to `fonts.googleapis.com` or `fonts.gstatic.com`. The
full Chromium e2e project passed (333 passed, 1 skipped), including `leaderboard-font-cls.spec.ts`,
which delays `**/*.woff2` and asserts zero layout shift.

`src/app/__tests__/fonts.test.ts` asserts no `next/font/google` import, each subset's files,
weights, unicode-range and preload against the provenance, the committed bytes' hashes, and the
literal fallback face.

### 4c. WebKit cold-start flakes

Evidence: green hosted runs 38783031946 (4 flaky), 38825262768 (4), 38841517775 (2) and
38918007179 (2), out of the 14 most recent green `ci` runs. All 12 first-attempt failures are the
`draft-flow.spec.ts` webkit cases (375 px roll into view, 375 px art picker, 375 px compact
targets, 390 px roll into view). They run in the chromium project and each launches its own
WebKit. Every one failed at the same place: `waitForHydration` (`e2e/mobile/helpers.ts:123`),
from `ready`, after `expect.poll`'s default 5 s. The retries passed.

Mechanism, proven from the logs: the hydration poll expires. Cause, inferred and not proven: a
cold WebKit launch inside the test plus 4 CPU-bound workers makes first hydration take longer
than 5 s. No failing trace was retained, because the runs passed on retry.

Fix (`8ad5b24`): `waitForHydration` waits for React's props on the element with a labelled 30 s
deadline instead of the generic 5 s. Hydration is a precondition, so no assertion after it
changed. Locally the original failed 1 of 144 cases over 3 runs of 48 (24 workers, 8 repeats).
That one failure was a different 5 s poll after Start, with cause unknown. The fixed helper passed
48 of 48. That local sample is too small to show a rate change. The hosted runs on this PR are the
real check.

### Seen locally, not fixed

Under `vitest --maxWorkers=12` on the shared Mac, one run failed "Randomize says the Team Score
the screen shows" (1,634 ms) and the first retention case (10,441 ms). The second is likely the
10 s default hook timeout on PGlite's first migration snapshot, but that is inferred. Neither
failed in the 3 loaded runs that followed, or in any `--maxWorkers=4` run. Neither has a hosted
failure in the logs examined.

## 5. STATE.md

Adds the PR #57 receipt under "Submission attempts correction" and a section for this dispatch.

## Principles

- Fix Root Causes: the focus flake was reproduced and traced to the stale effect before any
  change. The font fix removes the flaky network input instead of retrying it.
- Prove It Works: the deadlock claim and the `SKIP LOCKED` choice come from 240-statement
  concurrency runs on real PostgreSQL, not from reasoning alone.
- Test Behavior, Not Implementation: retention tests assert literal surviving keys and counts
  after a real admission.
- Sequence Work into Verifiable Units: each guard is committed RED before its fix, and formatting
  is its own commit.
- Build the Lever: `fetch-inter-woff2.mjs` regenerates the fonts and their provenance.
