# Club region identity checkpoint

Presentation metadata maps every current schedule club ID to its city's verified region. `BossRoster` displays the region in result cards and MatchdayLive, including retained shirt rosters. Unknown IDs omit the label. The registry imports no engine or data modules. No engine, roster eligibility, RNG, strength, frozen source, or generated data file changed.

## Source verification

Checked on October 15, 2026. Club football suffixes are presentation aliases for the named Pokémon location. Ecruteak Town maps to Ecruteak City, Santalune Town to Santalune City, and Cinnabar FC to Cinnabar Island. Both Vermilion club IDs map to the same city. Indigo Plateau is listed among Kanto landmarks and hosts the shared Kanto and Johto League. This labels its location, not exclusive league membership.

| Region | Current club names | Verified source |
| --- | --- | --- |
| Kanto | Viridian FC, Cerulean City, Vermilion Athletic, Pallet Town, Pewter United, Vermilion FC, Lavender Town, Celadon City, Fuchsia United, Saffron City, Cinnabar FC, Indigo Plateau United | [Bulbapedia Kanto settlements and landmarks](https://bulbapedia.bulbagarden.net/wiki/Kanto#Settlements) |
| Johto | Goldenrod United, Ecruteak Town, Olivine Rovers, Mahogany FC | [Bulbapedia Johto settlements](https://bulbapedia.bulbagarden.net/wiki/Johto#Settlements) |
| Hoenn | Lilycove Athletic, Slateport United, Mauville City, Fortree Rovers | [Bulbapedia Hoenn settlements](https://bulbapedia.bulbagarden.net/wiki/Hoenn#Settlements) |
| Sinnoh | Hearthome City, Jubilife FC, Veilstone United, Canalave Athletic | [Bulbapedia Sinnoh geography and settlements](https://bulbapedia.bulbagarden.net/wiki/Sinnoh#Geography) |
| Unova | Castelia City, Nimbasa United, Driftveil FC, Opelucid Rovers | [Bulbapedia Unova settlements](https://bulbapedia.bulbagarden.net/wiki/Unova#Settlements) |
| Kalos | Lumiose FC, Santalune Town, Shalour City, Coumarine United | [Bulbapedia Kalos settlements](https://bulbapedia.bulbagarden.net/wiki/Kalos#Settlements) |
| Alola | Hau'oli City, Konikoni Athletic | [Bulbapedia Alola settlements](https://bulbapedia.bulbagarden.net/wiki/Alola#Settlements), [Serebii Konikoni City](https://www.serebii.net/pokearth/alola/konikonicity.shtml) |
| Galar | Hammerlocke Rovers, Motostoke United, Wyndon FC | [Bulbapedia Galar settlements](https://bulbapedia.bulbagarden.net/wiki/Galar#Settlements) |
| Paldea | Mesagoza FC, Levincia City | [Bulbapedia Paldea settlements](https://bulbapedia.bulbagarden.net/wiki/Paldea#Notable_locations) |

Bulbapedia and Serebii are secondary game references. Official search results corroborated [Hau'oli in Alola](https://www.pokemon.com/us/features/remember-the-region-alola-spotlight), [Levincia in Paldea](https://www.pokemon.com/us/pokemon-news/picturesque-perspectives-of-paldea-across-pokemon-horizons-the-series-and-the-video-games), and [Wyndon in the Galar tour brochure](https://assets.pokemon.com/assets/cms2/pdf/video-game/sword-shield/Galar_Tour_Brochure_US.pdf). Those official pages returned empty/error bodies when opened, so the complete mappings rely on the readable secondary sources above.

## Measured evidence

- RED commit `e9291aa9da8bafeeccce42e1becbf4d02e72273a` adds guards before production edits. BossRoster run failed 40 tests and passed 3. Log `/tmp/club-region-red.log`.
- GREEN `node_modules/.bin/vitest run src/components/results/__tests__/BossRoster.test.tsx src/ui/__tests__/club-identity.test.ts --maxWorkers=2` passed 45 tests in 2 files.
- Focused ESLint passed for all five runtime/test files before the final browser locator refinement. The refinement only scopes the locator to the existing `matchday-live` test ID.
- `PLAYWRIGHT_BASE_URL=http://localhost:3427 node_modules/.bin/playwright test e2e/club-region-identity.spec.ts --project=chromium --workers=1` passed 2 tests in 4.9 seconds. Chromium proves the Kalos label for Santalune Town in results and MatchdayLive at 320 and 1280 pixels, with ratings disabled in browser settings, eleven players, and no page overflow. The unchanged fixture still shows record 5-0-1 and score 943.
- Browser screenshots are under `output/playwright/club-region-identity/`. They were generated, but manual image inspection was NOT RUN before the user requested a safe stop.
- Initial browser attempt failed because the live roster selector also matched result cards. Scoping to `matchday-live` corrected the test. Both final browser cases passed.

## Safe stop and remaining work

The user requested a low-quota handoff. The isolated dev server on port 3427, exec session 87102, was stopped cleanly. Browser test processes completed. No PR, push, independent review, merge, deploy, DB write, full suite, full typecheck, or production build ran in this lane. Root integrates this patch into the fourth opponent completion dispatch with engine v5 saves, then owns combined exact-head gates and independent review.

Dependencies use an untracked `node_modules` symlink to the infrastructure worktree. `pnpm` attempted its automatic dependency check/install and aborted without a TTY. Existing local executables ran successfully and no dependency install was performed. Remove the symlink only when cleaning this worktree.

Model the Domain shaped the single stable-ID registry. Test Behavior, Not Implementation shaped the rendered labels for all 39 club IDs. Sequence Work into Verifiable Units shaped the committed RED guard before the fix. Architectural exploration was skipped because the parent fixed this presentation-only design. Nested delegation, PR opening, and shipping were outside this lane's explicit scope.
