# Security and integrity quick fixes (W1k)

Tier Red (gate, rate limits, database client, leaderboard). Branch `fix/security-integrity-quick-fixes` off `f4489cb`.

## Scope

1. `safeNext` (`src/passcode.ts`) returns `/` when the parsed pathname starts with `//` (SE-14).
2. `hashIp` (`src/leaderboard/server/handlers.ts`) hashes `rateKey(ip)`: an IPv6 address becomes its /64 (`2001:db8:1:2::/64`), an IPv4-mapped IPv6 address becomes its IPv4 address, IPv4 and anything else are unchanged. The HMAC keyed by `IP_HASH_SECRET` is unchanged (SE-12). Gate unlocks and leaderboard submissions both use it.
3. `getDb` (`src/db/client.ts`) passes `fetchOptions` whose `signal` is a getter returning `AbortSignal.timeout(4000)`. `@neondatabase/serverless` 1.2.0 spreads `fetchOptions` into each `fetch` call (`{ method, body, headers, ...I }` in `index.mjs`), so every query gets a fresh signal. A plain `AbortSignal.timeout(4000)` in the options would be one signal created at startup, and every query after four seconds would abort (SE-18).
4. `handleUnlock` (`src/gate/unlock.ts`) catches a body `formData()` cannot read and answers 303 to `/gate?next=%2F&error=1` (SE-13).
5. `rankOf(row, board, coach)` counts only rows in the coach view. The submit body gains optional `coach`. Absent means All, so older clients get the same reply as before. A view the run is not in is a 400 INVALID_BODY before the database.
6. `coach` is in the board URL (`/leaderboard?mode=cup8&scope=all&coach=uncoached`). `Board` is controlled by `LeaderboardScreen`. The submit panel sends the run's own view, names it, and links to it.

## RED (commit `209c429`, run on `f4489cb` plus the tests)

```
 FAIL  src/__tests__/proxy.test.ts > ... > returns / for dot segments that normalize to a protocol-relative path (catches SE-14, the /..//evil.com open redirect)
AssertionError: expected '//evil.com' to be '/' // Object.is equality
 FAIL  src/db/__tests__/client.test.ts > ... > gives every query its own live 4000 ms abort signal, not one shared signal made at startup
AssertionError: expected [ false, false ] to deeply equal [ true, true ]
 FAIL  src/db/__tests__/client.test.ts > ... > rejects a query whose fetch never answers once its signal fires
Error: Test timed out in 15000ms.
 FAIL  src/gate/__tests__/unlock.test.ts > IPv6 attempt buckets (...) > locks every address in the same /64 once ten attempts are spent, and leaves the next /64 alone
AssertionError: expected [ 303, '/daily' ] to deeply equal [ 303, …(1) ]
 FAIL  src/gate/__tests__/unlock.test.ts > a body that is not a form (...) > answers a JSON body with a 303 back to the gate and an error, without a cookie
TypeError: Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded".
 FAIL  src/gate/__tests__/unlock.test.ts > a body that is not a form (...) > answers an empty text/plain body the same way
TypeError: Content-Type was not one of "multipart/form-data" or "application/x-www-form-urlencoded".
 FAIL  src/components/leaderboard/__tests__/coach-view.test.tsx > ... > reads coach from the query and defaults anything else to all
AssertionError: expected undefined to be 'uncoached' // Object.is equality
 FAIL  src/components/leaderboard/__tests__/coach-view.test.tsx > ... > writes coach into the link only for a filtered view
AssertionError: expected '/leaderboard?mode=cup8&scope=all' to be '/leaderboard?mode=cup8&scope=all&coac…' // Object.is equality
 FAIL  src/components/leaderboard/__tests__/coach-view.test.tsx > ... > sends coach=uncoached for an uncoached run and links to the uncoached board
AssertionError: expected '#1Misty is on the all-time board.' to be '#1Misty is on the all-time board, amo…' // Object.is equality
 FAIL  src/components/leaderboard/__tests__/coach-view.test.tsx > ... > sends coach=coached for a coached run and links to the coached board
AssertionError: expected '#1Misty is on the all-time board.' to be '#1Misty is on the all-time board, amo…' // Object.is equality
 FAIL  src/leaderboard/server/__tests__/coach-board.test.ts > ... > rankOf ranks the uncoached #1 at 1 on the uncoached board and 52 on All (catches a submit reply saying #52 for the uncoached leader)
AssertionError: expected 52 to be 1 // Object.is equality
 FAIL  src/leaderboard/server/__tests__/handlers.test.ts > ... > reports the rank in the coach view the client names (catches an uncoached leader told it is #3 behind coached runs)
AssertionError: expected [ 201, 3, false ] to deeply equal [ 201, 1, false ]
 FAIL  src/leaderboard/server/__tests__/handlers.test.ts > ... > rejects a coach view the run is not in with 400 INVALID_BODY before the database
TypeError: Cannot read properties of undefined (reading 'code')
 FAIL  src/leaderboard/server/__tests__/ip-key.test.ts > ... > hashes every spelling of an address in 2001:db8:1:2::/64 to the /64 key
AssertionError: expected [ '2001:db8:1:2::1', …(1) ] to deeply equal [ '2001:db8:1:2::1', …(1) ]
 FAIL  src/leaderboard/server/__tests__/ip-key.test.ts > ... > keys an IPv4-mapped IPv6 address as its IPv4 address, not as ::/64 shared by every mapped client
AssertionError: expected '9c22922221af14213755c6aba882220850dc9…' to be '08132e53f74181387910c31bcdaf902851d49…' // Object.is equality
 Test Files  7 failed (7)
      Tests  15 failed | 74 passed (89)
```

The Neon hang test first asserted a message regex. After the fix the driver error read `Failed query: select 1`, so `0db29fe` pins the observed chain instead (`Error`, `NeonDbError` via `sourceError`, `TimeoutError`). Before the fix that test cannot pass either: the fetch never settles and the test times out.

The HMAC literals in `ip-key.test.ts` come from `printf '%s' <key> | openssl dgst -sha256 -hmac <secret>`, not from the code.

## Decisions

- The submit panel ranks a run in its own view (uncoached or coached), not All. The audit's complaint is an uncoached leader shown #52. The success line names the view ("Misty is on the daily board, among uncoached runs.") and the link opens that view, so the rank matches the board the player lands on.
- The server refuses a coach view the run is not in. A rank counted in a view the row is not part of is a number with no board behind it.
- A non-form unlock body returns to the gate with `error=1` and `next=/`. There is no passcode to check and no `next` to trust, and no attempt is spent.
- IPv4-mapped IPv6 keys as IPv4. Keying it by /64 would put every mapped client in `0:0:0:0::/64`, one shared bucket.
- Existing IPv6 `ip_hash` values and rate-limit history stop matching new requests. That only resets IPv6 rate-limit history, the same effect CLAUDE.md names for a secret rotation.
- `coach` stays on a mode or date switch, the way the in-memory filter did.

## Gates at `5b7ca8d`

- `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `prettier --check` on every changed file exited 0.
- `pnpm test`: 1,331 passed in 147 files.
- Playwright on a fresh build (`PLAYWRIGHT_PORT=3561 CI=1`), `e2e/leaderboard.spec.ts`, `e2e/leaderboard-cls.spec.ts`, `e2e/leaderboard-date.spec.ts`, `e2e/mobile-targets.spec.ts`, `e2e/mobile-acceptance.spec.ts`: 375 passed, 54 skipped, 0 failed.
- Browser proof: `docs/reports/security-integrity-quick-fixes/leaderboard-coach-url-390x844.png`, from the new scene in `e2e/leaderboard.spec.ts` that opens `/leaderboard?mode=cup8&scope=all&coach=uncoached` at 390x844.

## NOT RUN

- Full Playwright suite (hosted CI runs it on the PR).
- A live probe of the gate, a real IPv6 client, or a real hung Neon request. The timeout is proven against a stubbed `fetch` only.
- Production check after merge (`/api/health?db=1`, `/gate/unlock` with a JSON body).
- Independent review (the coordinator runs it).
