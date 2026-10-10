# Dispatch 4 decision log

Lane owner: Claude Code, Opus 5.5. Branch `feat/live`. Mode `pokedraft-mode`. Red tier (schema, leaderboard, deploy).

## State anchor

On 2026-10-09 fetched `origin/main` was `a6d3c84cb37c0a75e055c6fb02e7379964c23387` (PR #3), with no newer commits. `shasum -a 256 src/data/scouting.json` gave `5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775`. `git diff --stat d978328 origin/main -- src/engine src/scouting src/data` is empty. All three match the anchor.

## GATE 0 recon

### Engine contract

| Fact | Cite | Consequence |
|---|---|---|
| `decodeToken` parses `pd<version>.` + base64url JSON and throws `RunTokenError` with `malformed`, `unknownVersion`, `invalidSettings` or `invalidAction` | `src/engine/token.ts:232-247`, `src/engine/types.ts` `RunTokenErrorCode` | The API maps each code to a typed 422, and `unknownVersion` to 409 `ENGINE_VERSION_MISMATCH`. |
| `replay(token)` takes a string or a decoded `RunToken`, runs `runDraft`, requires completion, then `runCup` | `src/engine/replay.ts:6-20` | The API decodes once (cheap checks first), then hands the decoded object to `replay`, so the draft and cup run exactly once. |
| `runDraft` throws `DraftError` for every illegal step: `notOffered` (illegal roll pick), `noRerolls` (reroll cap), `ineligible` (legendary cap and pool), `slotOccupied` / `slotMismatch` / `slotRequired` (slot legality), `wrongPhase` / `wrongMode` | `src/engine/draft.ts:270-411` | The engine already re-validates every action against the seed. `replay` folds these into `RunTokenError("invalidAction")` with the message, so the API returns `ILLEGAL_ACTION` and passes the engine's message through. The finer `DraftError` code is not reachable without an engine change, and the engine is frozen. |
| `CupResult.engine` is `ENGINE_VERSION` (`pokedraft-engine-1`); tokens carry `RUN_TOKEN_VERSION` 1, not the engine version | `src/engine/types.ts:16`, `:332-347` | The 409 fires on an unknown token version, or when the client sends an `engineVersion` that differs from the server's. |
| `dailySeed(date)` derives the seed from an `IsoDate` | `src/engine/rng.ts:138-140` | The server recognises a daily run by matching the token seed against today's and yesterday's daily seeds. |
| `rateTeam` rounds the score | `src/engine/team.ts:98` | `team_score` fits an `int` column. |

### wcdraft reference (`b4530162c11a1057726eb15360eb75a6e8b211e1`, shallow clone outside this repo)

| File | Cite | Decision |
|---|---|---|
| `packages/db/src/schema/leaderboard-entries.ts` | `:71-100` one row is one verified submission; the server re-sims to get `verified_score` | Adopt. The row stores only server-computed numbers. |
| same | `:177-248` DB-level `CHECK` constraints for mode, dates and identity rules | Adopt in miniature: checks on mode, nickname length and trim, daily rows only for cup8, non-negative record. |
| same | `:20-26` partial unique index for daily dedupe; `:106-133` board index ordered by score then `created_at` | Adopt the partial unique index on `(nickname, mode, daily_date)` the dispatch names, and a board index in board order. |
| `apps/web/app/api/leaderboard/submit/route.ts` | `:21-35` route file only builds deps and delegates to a handler | Adopt. `src/app/api/leaderboard/route.ts` builds the store; `src/leaderboard/server/handlers.ts` holds the logic and is tested with PGlite. |
| `apps/web/lib/leaderboard/submit-route.ts` | `:3-20` locked gate order: body, cheap preflight, rate limit, replay, insert; every error a typed code | Adopt the order. Malformed requests never reach the rate limit query or the replay. |
| `packages/db/src/client.ts` | `:56-96` lazy client, pooled URL for runtime, direct URL for migrations | Adopt. `getDb()` is lazy and reads `DATABASE_URL`; scripts prefer `DATABASE_URL_UNPOOLED`. |
| `packages/db/scripts/rollback-check.ts` | `:1-37` paired down-migration files, run on a disposable branch | Adopt as `drizzle/rollback/<tag>.down.sql` plus `pnpm db:rollback`. |
| `apps/web/lib/http/client-ip.ts` | `:4-11` first hop of `x-forwarded-for`, then `x-real-ip` | Adopt. |

### Infrastructure (read-only calls, 2026-10-09)

- Vercel: one team, `pnascimento9596's projects` (`team_UcazzacLGnW6w4OjIU2njYFM`), with projects `biotraxiq`, `ap-audit-portal`, `wcdraft-web` and `qfs-facilities-portal`. No `pokedraft` project. The API did not return the plan name.
- Neon: one org, `Paulo` (`org-spring-wildflower-27811410`), plan **launch**, with projects `qfs-facilities-portal`, `BiotraxIQ` and `ap-audit-portal`. No free-plan org exists.

## Feature playbook checklist (verbatim steps)

1. `how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode.
2. `architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design.
3. Write the throughput checkpoint as four todo items.
   - Blocking first steps. The API contract (`src/leaderboard/contract.ts`) and daily helpers (`src/leaderboard/daily.ts`) land first, because both lanes build against them.
   - Independent workstreams. UI lane: `/daily`, `/leaderboard`, the submit panel and their tests. Lane-owner lane: schema, migrations, store, handlers, API route, proxy gate, robots, the share-route memo and the DB scripts.
   - Shared mutable state. `src/app/layout.tsx` is shared: the UI lane edits only the nav, the lane owner edits only the metadata export.
   - Smallest safe decomposition. Two workers over disjoint directories.
4. Delegate code-writing to a subagent. The UI lane went to a `pokedraft-mode` subagent; the lane owner wrote the server lane and owns the review of both.
5. Verify on the matching surface. API against PGlite and against a Neon branch; UI in Chromium via Playwright; production live-verify.
6. Rebase into small, ordered commits.
7. If the design is contested, `interrogate` before shipping. The independent reviewer applies the rubric.
8. Run Opening a PR.

## Decisions

| ts | phase | decision | why | evidence | result |
|---|---|---|---|---|---|
| 2026-10-09T21:10 | gate0 | Stop-list hit: the only Neon org is on the Launch plan, so a project there is usage-billed. Asked the owner. | the dispatch says free plan; paid plans count as new spend | `list_organizations` shows `plan: launch` | owner chose the Launch org; project capped at 0.25 CU min and max with 300 s autosuspend |
| 2026-10-09T21:20 | gate1 | Added an `ip_hash` column (sha256 of a fixed prefix plus the first `x-forwarded-for` hop) and an index on `(ip_hash, created_at)` | the dispatch counts the rate limit in the table, which needs the submitter's IP on the row; a hash avoids storing raw IPs | `src/db/schema.ts` | |
| 2026-10-09T21:20 | gate1 | Unique index on `md5(token)`, so the same run cannot be listed twice under two names | without it one run could fill the all-time board; `md5` keeps the btree key small whatever the token length | `DUPLICATE_TOKEN` test | |
| 2026-10-09T21:20 | gate1 | Drizzle has no down migrations. Each migration gets a paired `drizzle/rollback/<tag>.down.sql`; `pnpm db:rollback` runs the newest one and removes its `drizzle.__drizzle_migrations` row in one transaction | the dispatch requires a proven rollback | Neon branch run below | |
| 2026-10-09T21:25 | gate2 | Board order is wins, then draws, then Team Score, then first to submit, then id | the cup record is the outcome; Team Score breaks ties between equal records; earliest submission wins full ties | `GET` ordering test | |
| 2026-10-09T21:25 | gate2 | A token counts as daily when its seed equals `dailySeed` of today or yesterday in New York; a daily seed with non-daily settings is 422 `DAILY_SETTINGS_MISMATCH`. Older daily seeds rank on the all-time board only | yesterday stays open for runs started just before midnight; the daily config is cup8, all gens, Open, squad first | handler tests | formation is the player's choice on the daily |
| 2026-10-09T21:25 | gate2 | The rate limit counts accepted rows only, and is checked before the replay | the dispatch counts in the table; checking first means a throttled caller cannot make the server replay | 429 test asserts zero replays | rejected submissions do not count toward the limit |
| 2026-10-09T21:25 | gate2 | Extra error codes beyond the dispatch's: `DAILY_ALREADY_SUBMITTED` (409), `DUPLICATE_TOKEN` (409), `DAILY_SETTINGS_MISMATCH` (422), `NICKNAME_INVALID` (422), `RATE_LIMITED` (429), `DB_UNAVAILABLE` (503), `INVALID_BODY` (400) | every failure is a typed code, never a silent default | `src/leaderboard/contract.ts` | |
| 2026-10-09T21:40 | ruling | One replay per request on `/r/[token]`: the page and `generateMetadata` read through `loadRun`, a React `cache()` wrapper. `SharedRun` now takes the replayed run as a prop, so the browser no longer replays during hydration | dispatch 3 replayed three times per view (metadata, server render, client hydration) | `src/app/r/[token]/run.ts` | |
| 2026-10-09T21:40 | ruling | **Limit 1.** The OG image route uses the same loader, but it is a separate HTTP request, and `cache()` never spans requests. A view of the page replays once. A link preview (iMessage, Discord, WhatsApp) fetches the image on its own and replays once more. Browsers never fetch `og:image`, so a person viewing the page costs one replay | React `cache()` scope is one server request | `replay-count.test.ts` has a separate case for the image route | "one replay" means one per request, not one per share |
| 2026-10-09T21:40 | ruling | **Limit 2.** React `cache()` memoizes only inside a real server request; in Vitest it is a passthrough. The replay-count test swaps in a per-request memo for `cache` and resets modules between "requests". It proves every reader goes through `loadRun` and that `loadRun` is the only replay; it does not prove React's own memoization | owner heads-up during the lane | `src/app/r/[token]/__tests__/replay-count.test.ts` | React's per-request behaviour is documented framework behaviour, not measured here |
| 2026-10-09T21:40 | ruling | The replay-count guard test landed with the fix, not before it | the old page had no loader seam for a test to import; a RED run against it would have failed on the missing module, not on the replay count | | deviation from the guard-test sequencing rule, recorded |
| 2026-10-09T21:45 | gate4 | Next 16 renamed middleware to `proxy.ts`; the gate lives in `src/proxy.ts` | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md` | | |
| 2026-10-09T21:45 | gate4 | Exempt paths: `/card`, `/r/<token>/opengraph-image` (with an optional hash suffix), `/_next/static/*`, `/favicon.ico`, `/robots.txt`, plus `/gate` and `/gate/unlock` so the form is reachable. Gated pages redirect to `/gate?next=`; gated `/api/*` returns 401 JSON `PASSCODE_REQUIRED` | the ruling's list, plus the gate itself | `src/__tests__/proxy.test.ts` lists exempt and gated paths exactly | |
| 2026-10-09T21:45 | gate4 | With the gate on, `/gate` renders the run's title and `og:image` when `next` is a share link | the ruling gates `/r/[token]` itself, so a preview bot that follows the redirect would otherwise see no preview | `src/app/gate/page.tsx` | |
| 2026-10-09T21:45 | gate4 | The cookie holds sha256 of the passcode, compared in constant time; changing the passcode logs everyone out | no raw passcode in cookies | proxy test "stale cookie" | |
| 2026-10-09T21:45 | gate4 | Noindex comes from three places: `robots` metadata on every page, an `X-Robots-Tag: noindex, nofollow` header on every response, and `robots.txt` disallowing `*` but allowing the named link-preview bots | Twitterbot and others honour robots.txt, so `Disallow: /` for everyone would break previews | `src/app/robots.ts`, `next.config.ts` | no sitemap |
| 2026-10-09T21:55 | gate1 | Migration proven on Neon branch `migration-proof` (`br-rough-bird-b79ahwsx`): upgrade, smoke insert and select (and the daily duplicate rejected with 23505), rollback (zero tables, zero bookkeeping rows), upgrade again, smoke again | dispatch GATE 1 | command output in the PR | |
| 2026-10-09T21:56 | gate1 | Store conflict mapping checked against the real Neon HTTP driver on the branch: a duplicate token maps to `token`, a second daily row to `daily` | PGlite and Neon wrap Postgres errors differently | one-off probe, not committed | |
| 2026-10-09T21:58 | gate1 | Migration applied to the main branch (`br-morning-snow-b7dn8iy8`) | dispatch GATE 1 | `[db:migrate] OK, 1 migration(s) recorded` | |
| 2026-10-09T22:40 | review r1 | GLM 5.3 Flash round 1 on `e174533`: REQUEST_CHANGES, canary echoed. B1: a duplicate token resubmitted under new nicknames replayed every time and never counted toward the rate limit | the limit counts accepted rows only | `review-r1` in the PR receipt | fixed |
| 2026-10-09T22:40 | review r1 | B1 fix: probe the two unique keys (`md5(token)`, then the nickname's daily slot) before the replay; a hit returns 409 without simulating. An attempts table was not added | the dispatch counts the limit in `leaderboard_entries`; after the probe, the only unthrottled work per request is a decode, two indexed selects, and at most one draft replay that fails or inserts (and inserts are counted) | guard test: 4 duplicate resubmissions plus a daily retry leave the replay count at 2 | residual: invalid tokens are not counted; acceptable for a friends-only board |
| 2026-10-09T22:40 | security | The background commit security review flagged an open redirect in `safeNext`: `/\t/evil.test` passed the prefix checks and the URL parser strips the tab into `//evil.test` | real; browsers strip tabs and newlines the same way | guard test RED at `62b2d6f` | `safeNext` now resolves against a fixed origin and keeps only same-origin path, query and hash |
| 2026-10-09T22:40 | review r1 | N1 invalid calendar dates return 400 `INVALID_QUERY` (were 503); N2 an unknown 23505 constraint maps to `DUPLICATE_TOKEN`; N3 conflict copy says "this daily board" and no longer suggests switching nickname; N4 truncation at 50 tested; N6 dropped a double URI decode on `/gate` | cheap and correct | guard tests | N5 (`.mjs` specifier under tsx), N7 (banner already in `CLAUDE.md`, dormant until `STATE.md` says Vercel is linked) and N8 (generated files without trailing newline) left as is |
