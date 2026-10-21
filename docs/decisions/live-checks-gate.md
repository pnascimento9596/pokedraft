# Live checks through the passcode gate (Green)

## Scope

Production (`https://pokedraft-woad.vercel.app`) has `FRIENDS_PASSCODE` enabled, so gated routes answer `307` to `/gate` and gated `/api/*` routes answer `401` unless the request carries the `pokedraft_pass` cookie (`src/proxy.ts:50-65`). This row wires optional `PLAYWRIGHT_GATE_COOKIE_FILE` support into `playwright.config.ts` through a pure helper (`e2e/gate-cookie.ts`), unit-tests the helper in `scripts/e2e/gate-cookie.test.ts` (RED at `697f7ad7`, GREEN at `ee047837`), tightens the `/r` server-HTML assertion in `e2e/seed-board.spec.ts:158` so `/gate` cannot satisfy it, and audits the live-check specs and ungated-host specs. `src/` runtime code and `.github/` are untouched.

## RED output

From `/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7-0/vitest-red.log` at commit `697f7ad7`:

```
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7-0

 ❯ scripts/e2e/gate-cookie.test.ts (3 tests | 3 failed) 5ms
   ❯ Playwright passcode gate cookie (3)
     × adds the pokedraft_pass cookie only when both PLAYWRIGHT_BASE_URL and PLAYWRIGHT_GATE_COOKIE_FILE are set (catches a live check that omits the cookie or a local run that sends one) 3ms
     × trims trailing newlines from the cookie file and returns no cookie when the file is unreadable or blank (catches a newline in the Cookie header or a crash on a missing file) 1ms
     × sets domain to the hostname of PLAYWRIGHT_BASE_URL (catches a domain with a scheme or port that Chromium refuses) 0ms
```

At commit `ee047837` (`/Users/paulo/.gemini/antigravity-cli/brain/432c72be-fea7-4e5b-a536-fe1d5f75a56a/scratch/logs/7-0/vitest-green.log`), all 3 tests in `scripts/e2e/gate-cookie.test.ts` pass.

## Decisions

- **Pure helper at the config boundary (`principle-boundary-discipline`).** `e2e/gate-cookie.ts` exports `gateCookies(baseUrl, cookieFile, readFile)`. When both `baseUrl` and `cookieFile` are non-empty and `readFile(cookieFile).trim()` yields a non-empty digest, it returns a single-element cookie array matching `src/gate/unlock.ts:59-65` (`name: PASSCODE_COOKIE`, `path: "/"`, `httpOnly: true`, `secure: true`, `sameSite: "Lax"`, `expires: -1` for a session entry in Playwright's `storageState.cookies` schema at `node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core/types/types.d.ts:10696-10725`, and `domain: new URL(baseUrl).hostname`). Otherwise it returns `[]`, and it never logs or prints the cookie value.
- **Reusing `PASSCODE_COOKIE` from `src/passcode.ts`.** `src/passcode.ts:1-3` imports only `node:crypto` and does not import `server-only`, so `e2e/gate-cookie.ts:2` imports `PASSCODE_COOKIE` directly without pulling server-only code into `playwright.config.ts`.
- **Playwright `request` fixture and `use.storageState.cookies`.** In `node_modules/.pnpm/playwright@1.64.0/node_modules/playwright/lib/index.js:169-170`, the `{ request }` fixture calls `playwright.request.newContext()`. Before the context is created, the auto fixture `_setupArtifacts` (`node_modules/.pnpm/playwright@1.64.0/node_modules/playwright/lib/index.js:77, 128-132, 168`) runs `runBeforeCreateRequestContext(options)`, which copies `_combinedContextOptions` (including `storageState` from `node_modules/.pnpm/playwright@1.64.0/node_modules/playwright/lib/index.js:253, 286, 333-334`) onto `options`. `APIRequest.newContext` (`node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core/lib/coreBundle.js:60694-60706`) passes `storageState` to `GlobalAPIRequestContext` (`node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core/lib/coreBundle.js:28190-28197`), which populates its `CookieStore` via `this._cookieStore.addCookies(options.storageState.cookies || [])` (`coreBundle.js:28196`). `page.request` (`BrowserContextAPIRequestContext`, `coreBundle.js:28172-28189`) shares the browser context's cookie store directly. Because both `{ request }` and `page.request` already inherit `use.storageState.cookies`, no `extraHTTPHeaders` workaround was added (`principle-laziness-protocol`).

## Real-page assertions in the live-check specs

`src/app/gate/page.tsx:30-76` renders the `"Friends only"` card (`h1` `"pokedraft is friends only"`), `"Friends passcode"`, `data-testid="gate-passcode"`, and the `"Enter"` button. When `next` is a share link, `generateMetadata` (`src/app/gate/page.tsx:13-18`) also emits the run's `<title>`, description, and Open Graph card metadata through `runMetadata` (`src/app/r/[token]/title.ts:19-40`). Each live-check spec below has at least one assertion that `/gate` cannot satisfy:

- `e2e/health.spec.ts`: `e2e/health.spec.ts:10-13` asserts the JSON response matches `{ engine: ENGINE_VERSION, tokenVersions: TOKEN_VERSIONS }`.
- `e2e/old-links.spec.ts`: `e2e/old-links.spec.ts:12` asserts `page.getByTestId("engine-label")` has text `"Played on engine v1"` (`toHaveTitle` on `e2e/old-links.spec.ts:11` would also pass on `/gate?next=...`, whereas `engine-label` is rendered only by `src/components/results/SharedRun.tsx:27`).
- `e2e/share.spec.ts`:
  - `e2e/share.spec.ts:14-16`: HTTP `404`, `page.getByTestId("run-error")` (`"Run not found"`), and the `"Play a new run"` link.
  - `e2e/share.spec.ts:28-30, 46-55`: URL `/r/pd3\?t=`, `results-record` (`"1-1-1"`), `results-score` (`"283"`), `"Download image"`, and `"Share"`.
  - `e2e/share.spec.ts:65-67`: `results-record`, `results-score`, and `engine-label` (`Played on engine ${version}`) across `v1`, `v2`, and `v6`.
  - `e2e/share.spec.ts:71-86`: intentionally tests `/gate?next=${encodeURIComponent(QUERY_PATH)}` (`input[name="next"]` and `og:image`).
  - `e2e/share.spec.ts:103-104`: HTTP `404` and `page.getByTestId("run-error")` (`"Run not found"`).
- `e2e/leaderboard.spec.ts`:
  - `e2e/leaderboard.spec.ts:55-68`: `daily-kicker` (`"Daily challenge"`), `run-start`, `draftSixteen`, `submit-panel`, and `submit-success`.
  - `e2e/leaderboard.spec.ts:100-107`: `run-start`, `draftSixteen`, and `submit-error`.
  - `e2e/leaderboard.spec.ts:122-127`: `board-row` count 2 (`"Misty"`, `"8-0-0"`, `/r/pd1.e2e-one`).
  - `e2e/leaderboard.spec.ts:154-164`: `board-row`, `coached-chip`, and `coach-filter-uncoached`.
  - `e2e/leaderboard.spec.ts:189-191`: `board-row` count 1 and `coach-filter-uncoached` `aria-pressed="true"`.
  - `e2e/leaderboard.spec.ts:209-211`: `board-error` visible and `board` count 0.
  - `e2e/leaderboard.spec.ts:239, 244`: `run-start` visible on `/daily` and `board-row` count 2 on `/leaderboard`.
- `e2e/seed-board.spec.ts`:
  - `e2e/seed-board.spec.ts:105-112`: `getByRole("table", { name: "Friends on this seed" })` and its three `tbody tr` rows.
  - `e2e/seed-board.spec.ts:138-140`: `seed-board-error` (`"Board unavailableThe runs on this seed could not be loaded."`).
  - `e2e/seed-board.spec.ts:148-150`: `results-record` (`"3-0-2"`) and `seed-board` count 0.
  - `e2e/seed-board.spec.ts:153-160`: added `expect(html).toContain('data-testid="results-record"')` at `e2e/seed-board.spec.ts:158`. Before this change, the test only checked `expect(html).toContain("Team Score")` and `expect(html).not.toContain("Friends on this seed")`, both of which `/gate?next=%2Fr%2F...` also satisfies via `runMetadata` (`src/app/gate/page.tsx:17`).
  - `e2e/seed-board.spec.ts:170-177`: `run-start`, `draftSixteen`, `results-record`, and the `"Friends on this seed"` table rows.
  - `e2e/seed-board.spec.ts:210-217`: `run-start`, `draftSixteen`, `submit-success`, and the updated `"Friends on this seed"` table rows.
  - `e2e/seed-board.spec.ts:252-261`: `board-row`, `"All engines"` button, and `engine-row-label` (`["Engine v3", "Engine v6"]`).
- `e2e/dossier-contributions.spec.ts`:
  - `e2e/dossier-contributions.spec.ts:40-53`: `"Snorlax"` dialog (`getByRole("dialog", { name: "Snorlax" })`) and `attr-abilities-ACC`, `attr-abilities-PHY`, `attr-moves-SHO`, `attr-contributions-note`.
  - `e2e/dossier-contributions.spec.ts:67-78`: `round-header` (`"Round 1 of 16"`), `"Dewott"` dialog, and `attr-abilities-DEF` through `attr-contributions-note`.
  - `e2e/dossier-contributions.spec.ts:86-97`: `round-header` (`"Round 1 of 16"`), `"Dewott"` dialog, and the blind-mode note inside `getByRole("region", { name: "Soccer attributes" })`.
  - `e2e/dossier-contributions.spec.ts:119-121`: `"Snorlax"` dialog, `attr-abilities-PHY`, and `attr-moves-SHO`.
- `e2e/xg-river.spec.ts`:
  - `e2e/xg-river.spec.ts:32, 34`: `watchPinned` asserts `results-record` and `match-replay` `broadcast` are visible, followed by `match-hud` (`e2e/xg-river.spec.ts:91`) and `xg-river` (`e2e/xg-river.spec.ts:97-103, 122, 128, 133, 154`).
- `e2e/penalty-takers.spec.ts`:
  - `e2e/penalty-takers.spec.ts:16-19`: `toPreMatch` clicks `run-start`, runs `draftSixteen`, clicks `see-results`, and asserts `prematch` is visible, followed by `getByRole("group", { name: "Set pieces" })` and `touchline` (`e2e/penalty-takers.spec.ts:60-87`), `fulltime` and `ticker` (`e2e/penalty-takers.spec.ts:107-110`), or `set-pieces` count 0 on `prematch` (`e2e/penalty-takers.spec.ts:117`).
- `e2e/opponent-injuries.spec.ts`:
  - `e2e/opponent-injuries.spec.ts:25-28`: `toPreMatch` clicks `run-start`, runs `draftSixteen`, clicks `see-results`, and asserts `prematch` is visible, followed by `match-player`, `data-pose="down"`, and the `ticker` injury and rotation lines (`e2e/opponent-injuries.spec.ts:85-97, 113-114`).

## Specs that assume an ungated host or target `/gate` directly

- `e2e/resilience-a11y.spec.ts:9`: `test.use({ storageState: { cookies: [], origins: [] } })` replaces `use.storageState` with `cookies: []` so the spec can play as a first-time visitor without `pokedraft:coach:draft` in `localStorage`. On a gated host, all six tests (`e2e/resilience-a11y.spec.ts:19, 36, 57, 89, 114, 123`) send no `pokedraft_pass` cookie when requesting `/how-to-play`, `/`, `/daily`, `/history`, and `/play`, so they hit the `307` redirect to `/gate`.
- `playwright.live.config.ts:14` and `e2e-live/live.spec.ts:8-65`: `playwright.live.config.ts` sets `use: { baseURL, trace: "retain-on-failure", colorScheme: "dark" }` without `storageState` cookies, so `e2e-live/live.spec.ts` requests `/`, `/api/leaderboard?mode=cup8&scope=all`, `/r/garbage-not-a-token`, `/daily`, `/leaderboard`, `/history`, and `/how-to-play` (`e2e-live/live.spec.ts:9, 17, 26, 59, 61`) without `pokedraft_pass`.
- Direct `/gate` specs: `e2e/share.spec.ts:71-86`, `e2e/share-sheet.spec.ts:35-41`, `e2e/mobile-targets.spec.ts:162-167`, and `e2e/theme-support.spec.ts:10, 24-30` navigate directly to `/gate?next=...` or `/gate?error=unavailable`. Because `/gate` is in `PUBLIC` (`src/passcode.ts:18`) and `GatePage` (`src/app/gate/page.tsx:60-76`) always renders the gate form even when `pokedraft_pass` is present, these tests stay unchanged on both gated and ungated hosts.

## NOT RUN

- Production Playwright checks with `PLAYWRIGHT_GATE_COOKIE_FILE` (run by the coordinator; this lane never reads `~/.pokedraft/` or targets production).
- The grace-window receipt (the window closes at `2026-10-23T04:00:00Z`).
- Hosted CI and reviewer receipt on the pushed branch.
- The phone check and screen reader pass.
