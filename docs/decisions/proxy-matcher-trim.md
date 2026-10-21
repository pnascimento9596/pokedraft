# Proxy matcher trim (row 7pm, Red)

Branch `fix/proxy-matcher-trim` off `origin/main` at `6606585`. Wave 7 row 7pm (Red, owner
decision 7).

## Scope

- `src/proxy.ts`: updates `matcher` on `config` from
  `["/((?!_next/static|favicon.ico|robots.txt).*)"]` to
  `["/((?!_next/static|creatures/|api/health$|api/csp-report$|favicon.ico|robots.txt).*)"]`.
- `src/__tests__/proxy.test.ts`: adds the guard test
  `creature images and health checks run the proxy and hit the passcode gate` using
  `unstable_doesMiddlewareMatch` from `next/experimental/testing/server`.
- `src/passcode.ts`: untouched (`isPublicPath` stays as is for defence in depth).

## RED commit

Commit `42c2f0db` (`1 failed | 17 passed (18)` in `src/__tests__/proxy.test.ts`), copied verbatim
from `01-red-vitest.log`:

```text
 RUN  v5.0.3 /Users/paulo/Projects/pokedraft-7pm

 ❯ src/__tests__/proxy.test.ts (18 tests | 1 failed) 21ms
   ❯ passcode gate (catches a gate that breaks link previews or leaks the API) (18)
     ✓ exempts exactly the preview and gate paths 1ms
     ✓ keeps the install files public (catches a home screen install that hits the gate, since browsers fetch the manifest without cookies) 0ms
     ✓ runs the proxy on every path except static assets (catches a matcher that skips the API or gates /_next/static) 2ms
     × creature images and health checks run the proxy and hit the passcode gate 2ms
     ✓ is off when FRIENDS_PASSCODE is unset 1ms
     ✓ redirects gated pages to /gate with the original path 0ms
     ✓ answers gated API calls with 401 JSON, never the gate page 1ms
     ✓ lets public paths and the right cookie through, and rejects a stale cookie 1ms
     ✓ rewrites an undecodable share link to the 404 route and passes a real token through 3ms
     ✓ passes an old engine's share link through to the page, which replays it on its own bundle 1ms
     ✓ restores the payload from a message-safe query link before rendering the canonical run 3ms
     ✓ keeps a shipped engine-5 share link on its page once engine 6 is live (catches pd5 links 404ing) 0ms
     ✓ passes a golden share link of every retained, live and flip-retained version (regression guard, no RED: behaviour already correct; catches pd6 links 404ing at the flip) 1ms
     ✓ keeps missing, malformed and unsupported query payloads on the real 404 route 1ms
     ✓ gates the complete query link before rewriting and lets an unlocked player replay it 0ms
     ✓ only follows same-site relative next paths 0ms
     ✓ returns / for dot segments that normalize to a protocol-relative path (catches SE-14, the /..//evil.com open redirect) 0ms
     ✓ keeps pokedex.json and scouting.json out of the proxy and token import closure (SD-03: 1.33 MB data chunk in proxy) 1ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/proxy.test.ts > passcode gate (catches a gate that breaks link previews or leaks the API) > creature images and health checks run the proxy and hit the passcode gate
AssertionError: expected [ …(4) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "/creatures/pokeapi-art/0001.webp",
+   "/api/health",
+   "/api/health?db=1",
+   "/api/csp-report",
+ ]

 ❯ src/__tests__/proxy.test.ts:175:81
    174|
    175|   it("redirects gated pages to /gate with the original path", () => {
    176|     vi.stubEnv("FRIENDS_PASSCODE", "pikachu");
       |           ^
    177|     const res = proxy(req("/r/pd1.abc?x=1"));
    178|     expect(res.status).toBe(307);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
   Start at  13:03:39
   Duration  638ms (import 64%, transform 32%, tests 4%)
```

Fixed in `81bf5fef` (`18 passed (18)` in `src/__tests__/proxy.test.ts`, `02-green-vitest.log`).

## Decisions

- **Anchor `creatures/`, `api/health$` and `api/csp-report$` in the negative lookahead.** Next.js
  compiles `matcher` on `config` against the request `pathname` after the leading `/`. Adding
  `creatures/` excludes paths under `/creatures/` (such as `/creatures/pokeapi-art/0001.webp`)
  while still matching `/creaturesx`. Adding `api/health$` and `api/csp-report$` with `$` excludes
  `/api/health` (including `/api/health?db=1`, because the matcher runs on `pathname` after
  stripping the query string) and `/api/csp-report`, while still matching `/api/healthz`. Verified
  with `unstable_doesMiddlewareMatch({ config, url })` in `src/__tests__/proxy.test.ts:144-168`.
- **Skip `proxy` on `/api/health` and `/api/csp-report` without losing route behavior.** In
  `src/proxy.ts:34-47`, `pass` checks `SHARE_PATH` (`/^\/r\/([^/]+)$/`) and immediately returns
  `NextResponse.next()` for every other route. `src/app/api/health/route.ts:5-25` reads
  `new URL(request.url).searchParams.get("db") !== "1"` directly from `request.url` and does not
  depend on `proxy`. `e2e/health.spec.ts` passed (`16-playwright.log`).
- **Keep `isPublicPath` in `src/passcode.ts` unchanged.** `src/passcode.ts:8-27` continues to list
  `/^\/api\/csp-report$/` and `/^\/api\/health$/` as defence in depth if `proxy` is ever called
  directly in unit tests (`src/__tests__/proxy.test.ts:196`).

## Gates at `81bf5fef`

- `pnpm vitest run src/__tests__/proxy.test.ts`: 18 passed in 1 file (`02-green-vitest.log`).
- `pnpm lint`: exited 0 (`03-lint.log`).
- `pnpm typecheck`: exited 0 (`04-typecheck.log`).
- `pnpm test`: 2,188 passed in 249 files (`05-test.log`).
- `pnpm build`: exited 0; `pnpm data:validate` validated 1,025 Pokedex, 1,025 scouting, and 1,025
  contribution records (`06-build.log`).
- `check:*` scripts: all 9 exited 0 (`07-check-mirrors.log`, `08-check-image-seam.log`,
  `09-check-image-packs.log`, `10-check-client-bundle.log` with 0 client files and 24 server
  files, `11-check-theme-contrast.log`, `12-check-theme-colors.log`, `13-check-dashes.log`,
  `14-check-breakpoints.log`, `15-check-theme-cvd.log`).
- `pnpm exec prettier --check`: exited 0 on `src/proxy.ts`, `src/__tests__/proxy.test.ts`,
  `STATE.md`, and `docs/decisions/proxy-matcher-trim.md` (`17-prettier.log`).
- Playwright (`CI=1 PLAYWRIGHT_PORT=3972 pnpm exec playwright test e2e/health.spec.ts e2e/old-links.spec.ts e2e/share.spec.ts --project=chromium`):
  20 passed in 3 files (`16-playwright.log`).

## Coordinator check on a real build

Build (`next start` from this branch at `81bf5fef` with a dummy `FRIENDS_PASSCODE`, no cookie, stopped by PID): `/creatures/pokeapi-art/0001.webp` 200, `/api/health` 200, `/api/health?db=1` 503 (no local database, not the gate), `POST /api/csp-report` 204, `/api/healthz` 401, `/api/leaderboard` 401, `/` 307, `/creaturesx` 307. The coordinator re-ran the RED commit `42c2f0db` in a detached worktree: 1 of 18 failed.

## NOT RUN

- Production verification (run by the coordinator after merge).
- Non-Chromium Playwright projects and the remaining Chromium e2e specs locally.
- Hosted CI, coordinator review, and merge.
- The phone check, the screen reader pass, and the final grace-window receipt after
  `2026-10-23T04:00:00Z`.
