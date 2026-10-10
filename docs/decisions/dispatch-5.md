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
| | `consume` is one `INSERT ... SELECT ... WHERE count < max RETURNING id` statement, so there is no separate read-then-write step. A refused attempt writes nothing. **Limit:** under READ COMMITTED two truly simultaneous statements can both see `count < max`, so a burst can overshoot `max` by a few rows. The probe was sequential and does not prove otherwise | a hammering client must not extend its own lockout, and the table stays bounded at about `max` rows per key and window. A strict bound would need an advisory lock or SERIALIZABLE, which is not worth it for a hobby leaderboard | probe on the Neon `preview` branch: 4 calls with max 3 returned true, true, true, false; true again after the window |
| | The submit limit now runs before the body is read, so malformed and rejected requests count too (400, 409 and 422 included) | the dispatch requires every attempt to count | `hardening.test.ts` |
| | Pruning runs inside `consume` for the key being served only, so rows for keys that never return stay. Growth is slow (at most `max` rows per key per window); a periodic sweep is a known follow-up | review NIT | |
| | `pnpm test:live` writes a `verify-bot` row, so a second same-day run fails with the duplicate nickname conflict. Run `pnpm db:delete-entry --nickname verify-bot --date <NY date>` between runs | review NIT | |
| | `countRecentByIp` is removed from the store. The `leaderboard_entries_ip_recent_idx` index stays | it was the only reader; dropping the index would need a second migration for no behaviour gain, so it is left as a known leftover | |
| | `hashIp` is HMAC-SHA256 keyed by `IP_HASH_SECRET`, at least 32 characters. A missing or short secret returns 503 `DB_UNAVAILABLE` on submit and `error=unavailable` on the gate, and logs the problem name (never the value) | no silent default key | `handlers.test.ts` |
| | **Key change.** Rows written before this change keep their unkeyed `sha256("pokedraft-ip:" + ip)` hashes. There is no backfill. Old hashes no longer match any new hash, which is harmless because the limits read `rate_limit_events`, not `leaderboard_entries.ip_hash` | dispatch item 4 | |
| | Client IP is `x-real-ip` first, then the first `x-forwarded-for` hop, then `unknown` | Vercel's `ipAddress()` helper reads `x-real-ip` (checked in `@vercel/functions` source); Vercel's header docs say it overwrites `x-forwarded-for` too, so both are trustworthy on Vercel and neither is off it. The old order trusted the first `x-forwarded-for` hop before `x-real-ip` | `CLAUDE.md` "Hosting assumptions" |
| | `/gate/unlock` allows 10 attempts per IP per 15 minutes, right or wrong, counted in the table. The passcode compare stays constant time (`timingSafeEqual` over SHA-256 digests). A locked IP is redirected to `/gate?error=limited` even with the right passcode. If the limiter is down the gate stays shut (`error=unavailable`) | fail closed | `src/gate/__tests__/unlock.test.ts` |
| | A rank lookup failure after a successful insert returns 201 with `rank: null`. `SubmitEntry.rank` is nullable in the contract and the client schema; the panel says the rank could not be loaded | the entry is saved, so reporting a failure invites a duplicate resubmit | `hardening.test.ts`, `SubmitPanel.test.tsx` |
| | `/r/<undecodable>` answers 404. `proxy.ts` calls `decodeToken` and rewrites a failure to `/run-not-found`, whose page calls `notFound()` so the segment `not-found.tsx` renders the friendly page | a streamed page has sent 200 before `notFound()` can run (Next docs, "Status codes"), and the page must stay inside `Suspense` under `cacheComponents` | `e2e/share.spec.ts`; RED on a build of `origin/main`: expected 404, received 200 |
| | **Limit.** A token that decodes but fails the replay (an illegal action sequence) still gets the friendly page with 200 | replaying in the proxy would double the replay cost of every valid view, undoing the dispatch 4 one-replay-per-request ruling | |
| | `pnpm test:live` runs `e2e-live/live.spec.ts` against `LIVE_URL`. It is outside CI because it writes one `verify-bot` row | the dispatch 4 live spec was never committed and is not on disk, so it is rebuilt from the dispatch 4 log | |

### Auto-mode classifier denials (reported, not worked around)

- **Neon `reset_from_parent` on `br-rough-bird-b79ahwsx`** was denied. The reset's purpose is a preview branch on the production schema, so I compared schema fingerprints on both branches instead: identical (`md5` over columns, indexes, constraints and migration hashes, 25 objects each, 0 rows each). The branch was renamed to `preview` with `update_branch`, which was allowed.
- **Vercel env writes** were first denied as secret-store writes. After the owner approved them they went through: `DATABASE_URL` (Preview) now points at the `preview` branch pooled endpoint, and `IP_HASH_SECRET` exists for Production and Preview as separate random values (`openssl rand -hex 32`, sensitive, never printed). The Preview value was added with `vercel api` and a JSON body file that was deleted straight after, because `vercel env add ... preview` kept answering `git_branch_required` in non-interactive mode. Production `DATABASE_URL` was not touched. `vercel env ls` lists names only: `DATABASE_URL` (Production, Preview), `IP_HASH_SECRET` (Production, Preview).
- **Migration 0001 on production** (`pnpm db:migrate`) was denied once by the classifier, then run after the owner moved to manual approvals. A pulled production env gives an empty `DATABASE_URL` (Vercel hides protected values), so the earlier pulled Preview env, whose host was verified against the main branch compute (`ep-falling-resonance-b7y5z6oi`), supplied the URL. Result: 2 migrations recorded; `rate_limit_events` exists with 0 rows; `leaderboard_entries` has 0 rows.

### Preview isolation proof (2026-10-09)

Migration 0001 applied to the `preview` branch. A row with nickname `preview-marker` was inserted on that branch only, then `vercel curl /api/leaderboard?mode=cup8&scope=all` against the Preview deployment of `5857a02` returned it at rank 1, while `curl https://pokedraft-woad.vercel.app/api/leaderboard?mode=cup8&scope=all` returned `entries: []`. The marker was deleted afterwards. The Vercel MCP `web_fetch_vercel_url` returned 403 for both deployments, so the CLI was used.

## PR A. Image packs

| ts | decision | why | evidence |
|---|---|---|---|
| 2026-10-10 | Two packs ship: `pokeapi-pixel` (default) and `pokeapi-art`, 1025 of 1025 Dex ids each. Ids match by the PokeAPI file number, which equals the Dex id; named files must equal an English species name exactly; anything else is reported as unmatched and never guessed (516 unmatched files in the pixel source and 0 missing Dex ids) | The owner asked for careful name-to-sprite matching. Form files (`10001.png` and up) are not Dex species | `docs/reports/image-pack-*.md`; spot check of the rendered builder and card |
| 2026-10-10 | The importer trims every image to its opaque box, scales all of a pack's images by one shared factor (pixel: integer, canvas 96; art: at most 256), and bottom-aligns on a square canvas. Output is byte-identical on a rerun | Relative creature size survives, pixel art stays crisp, and every file shares one footprint so the blank fallback is the same square | `scripts/images/import.test.ts` (15 tests, includes a 5-image fixture run twice) |
| 2026-10-10 | `PlayerImage` stays the only seam, now two files: `PlayerImage.tsx` (client, follows the player's pack) and `PlayerPicture.tsx` (pure, hook-free). `check:image-seam` allows both and still fails any other `<img`, `next/image`, `background-image` or `url(` | The satori card cannot run hooks, and a server module cannot import a hook-based file (the build failed on exactly that before the split) | `pnpm check:image-seam`, `pnpm build` |
| 2026-10-10 | The card reads pack files from disk and inlines them as PNG data URIs. WebP packs are re-encoded to 104 px PNG with `sharp`, which moves from devDependencies to dependencies. `next.config.ts` traces `public/creatures` into `/card` and the OG image | Measured: satori draws nothing and raises no error for a WebP, so the art pack exported an empty card. A server fetch of the site's own files would also fail on a protected preview | `src/app/card/__tests__/route.test.ts` counts creature pixels per pack. Production proof is part of the PR B live verify (card with `pack=pokeapi-art`) |
| 2026-10-10 | `/card` takes `pack` and `mirror=0`. An unknown pack id falls back to the default. The download sends the player's saved choice | The exported picture must match the screen. A bad id must not break a shared link | `download.test.ts`, route tests, `e2e/images.spec.ts` |
| 2026-10-10 | `/creatures/*` stays behind the friends gate (not excluded from the proxy matcher) and gets `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` | The pictures are third-party copyrighted art for a private game, and the gate check is a cookie compare. File names carry no hash, so the cache is a day, not immutable | `next.config.ts` |
| 2026-10-10 | Right-half tokens mirror to face the center (CSS on the pitch, `scaleX(-1)` on the card), on by default, switchable in the Image style panel. The half is `x > 50` in the portrait layout and `y > 50` in the landscape layout | The two layouts swap axes, so the rule is per layout | `Pitch.module.css`, `e2e/images.spec.ts` |
| 2026-10-10 | The wheel mounts its whole strip with `loading="eager"`, which starts every face's download when the stage appears. There is no separate preload pass | The strip is already in the DOM before the first frame, so a second preload would add code for the same effect. `preloadCreatures` stays as a helper for later | `Wheel.tsx`. NOT MEASURED: whether a cold connection shows an unloaded face in the first frames of the spin |
| 2026-10-10 | Pitch fit: the picture is capped to the token circle with `max-width/max-height: 100%`, and the 36 px picture sits inside the 38 px narrow circle | A pack whose canvas is larger than the box must never overflow the token | `Pitch.module.css` |
| 2026-10-10 | CI gains `check:image-packs`: every folder under `public/creatures` needs `pack.json` with non-empty `author`, `license`, `label`, `source`, files named for real Dex ids, a matching coverage count, and `src/data/image-packs.json` must equal what the folders generate | Credit can never be dropped, and the generated list cannot be hand-edited | `scripts/images/check-packs.test.ts` |

### Proof (screenshots at 390 and 1440 px)

`docs/reports/dispatch-5-pr-a-proof/`: `builder-*`, `wheel-mid-spin-*`, `results-*`, `export-*` (the exported 1200x630 PNG, which is viewport independent). Captured from a local `next start` build of this head.
