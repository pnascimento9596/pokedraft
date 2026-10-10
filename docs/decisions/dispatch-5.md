# Dispatch 5 decision log

Lane owner: Claude Code, Sonnet 5.5. Mode `pokedraft-mode`. PR C is Red (deploy and env), PR A and PR B are Yellow.

## State anchor

On 2026-10-09 fetched `origin/main` was `8101a92f3fbe4fc194edc099ab4415c462fba919` (PR #5), the dispatch anchor, with no newer commits.

## IMAGE SOURCE (the dispatch block was unfilled; filled from the source the owner named)

| Field | Value | Evidence |
|---|---|---|
| Location | `https://github.com/PokeAPI/sprites`, commit `35fdbe9bdec8f519f882c3edc3c0185f08af4d86`, folders `sprites/pokemon/` (96x96 PNG) and `sprites/pokemon/other/official-artwork/` (475x475 PNG) | sparse clone |
| Author | PokeAPI sprites contributors. Images are copyright The Pokémon Company. Pokémon 650 and up in the 96x96 set are custom sprites by the Smogon community (README credits list) | `LICENCE.txt`, `README.md` |
| License | The repository is CC0 1.0. `LICENCE.txt` opens with "All image contents within are Copyright The Pokémon Company", and CC0 section 4(a) waives no trademark rights. The game is private, non-commercial and carries the fan-project disclaimer | `LICENCE.txt` |
| Styles | `pixel` (96x96 PNG) and `art` (official artwork, converted to WebP) | |

## PR C. Live hardening

| ts | decision | why | evidence |
|---|---|---|---|
| 2026-10-09 | Throttle state moves to a new table `rate_limit_events (scope, key_hash, created_at)` with an index on all three. One table serves both the submit limit and the gate limit | rejected submissions never reach `leaderboard_entries`, so counting them needs its own rows | `drizzle/0001_rate_limit_events.sql`, paired `drizzle/rollback/0001_rate_limit_events.down.sql` |
| | `consume` is one `INSERT ... SELECT ... WHERE count < max RETURNING id` statement, so a burst cannot all read the same count first. A refused attempt writes nothing | a hammering client must not extend its own lockout, and the table stays bounded at `max` rows per key and window | probe on the Neon `preview` branch: 4 calls with max 3 returned true, true, true, false; true again after the window |
| | The submit limit now runs before the body is read, so malformed and rejected requests count too (400, 409 and 422 included) | the dispatch requires every attempt to count | `hardening.test.ts` |
| | `countRecentByIp` is removed from the store. The `leaderboard_entries_ip_recent_idx` index stays | it was the only reader; dropping the index would need a second migration for no behaviour gain, so it is left as a known leftover | |
| | `hashIp` is HMAC-SHA256 keyed by `IP_HASH_SECRET`, at least 32 characters. A missing or short secret returns 503 `DB_UNAVAILABLE` on submit and `error=unavailable` on the gate, and logs the problem name (never the value) | no silent default key | `handlers.test.ts` |
| | **Key change.** Rows written before this change keep their unkeyed `sha256("pokedraft-ip:" + ip)` hashes. There is no backfill. Old hashes no longer match any new hash, which is harmless because the limits read `rate_limit_events`, not `leaderboard_entries.ip_hash` | dispatch item 4 | |
| | Client IP is `x-real-ip` first, then the first `x-forwarded-for` hop, then `unknown` | Vercel's `ipAddress()` helper reads `x-real-ip` (checked in `@vercel/functions` source); Vercel's header docs say it overwrites `x-forwarded-for` too, so both are trustworthy on Vercel and neither is off it. The old order trusted the first `x-forwarded-for` hop before `x-real-ip` | `CLAUDE.md` "Hosting assumptions" |
| | `/gate/unlock` allows 10 attempts per IP per 15 minutes, right or wrong, counted in the table. The passcode compare stays constant time (`timingSafeEqual` over SHA-256 digests). A locked IP is redirected to `/gate?error=limited` even with the right passcode. If the limiter is down the gate stays shut (`error=unavailable`) | fail closed | `src/gate/__tests__/unlock.test.ts` |
| | A rank lookup failure after a successful insert returns 201 with `rank: null`. `SubmitEntry.rank` is nullable in the contract and the client schema; the panel says the rank could not be loaded | the entry is saved, so reporting a failure invites a duplicate resubmit | `hardening.test.ts`, `SubmitPanel.test.tsx` |
| | `/r/<undecodable>` answers 404. `proxy.ts` calls `decodeToken` and rewrites a failure to `/run-not-found`, whose page calls `notFound()` so the segment `not-found.tsx` renders the friendly page | a streamed page has sent 200 before `notFound()` can run (Next docs, "Status codes"), and the page must stay inside `Suspense` under `cacheComponents` | `e2e/share.spec.ts`; RED on a build of `origin/main`: expected 404, received 200 |
| | **Limit.** A token that decodes but fails the replay (an illegal action sequence) still gets the friendly page with 200 | replaying in the proxy would double the replay cost of every valid view, undoing the dispatch 4 one-replay-per-request ruling | |
| | `pnpm test:live` runs `e2e-live/live.spec.ts` against `LIVE_URL`. It is outside CI because it writes one `verify-bot` row | the dispatch 4 live spec was never committed and is not on disk, so it is rebuilt from the dispatch 4 log | |

### Blocked by the auto-mode classifier (reported, not worked around)

- **Neon `reset_from_parent` on `br-rough-bird-b79ahwsx`** was denied. The reset's purpose is a preview branch on the production schema, so I compared schema fingerprints on both branches instead: identical (`md5` over columns, indexes, constraints and migration hashes, 25 objects each, 0 rows each). The branch was renamed to `preview` with `update_branch`, which was allowed.
- **Vercel env writes** (`vercel env update DATABASE_URL preview`, `vercel env add IP_HASH_SECRET`) were denied as secret-store writes. Nothing was written. The derived preview URL was checked privately: it reaches endpoint `ep-small-breeze-b7nhwrer`, which is the `preview` branch.
