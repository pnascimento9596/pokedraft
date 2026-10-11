# Dispatch 7 deferred audit findings

S3 findings from `docs/reports/platform-audit.md` that no dispatch 7 fix PR took on. Evidence and proposed fix for each are in that report under its ID. Mobile ones first. A fix PR that closes one on the way says so and removes its row.

| ID | Area | Sev | Mobile | Finding | Tier |
|---|---|---|---|---|---|
| SA-13 | A-mobile | S3 | yes | Filled pitch tokens have overlapping hit boxes on phones in every formation, and the bench gap is under 8px at 390 | Yellow |
| SA-14 | A-mobile | S3 | yes | The nickname and Picker search inputs lack the mobile keyboard attributes, and the keyboard cover case is unverified | Yellow |
| SA-15 | A-mobile | S3 | yes | The Image style select is 14.4px, below the 16px at which iOS Safari stops zooming on focus | Yellow |
| SA-16 | A-mobile | S3 | yes | layout.tsx exports no viewport, so there is no theme colour, color scheme, viewport-fit or interactive-widget setting | Yellow |
| SA-17 | A-mobile | S3 | yes | No web manifest, no 192 or 512 icons and no apple-touch-icon, so Add to Home Screen gives a plain shortcut | Red |
| SA-18 | A-mobile | S3 | yes | The stored theme is applied after hydration, so a person whose choice differs from the OS setting sees a flash of the other theme | Yellow |
| SA-19 | A-mobile | S3 | yes | Copy link and Share rely on navigator.clipboard alone, with no Web Share and no manual fallback | Yellow |
| SA-21 | A-mobile | S3 | yes | No touch defaults are set, so long-press callouts, tap highlights and double-tap zoom behave as the browser likes | Yellow |
| SA-22 | A-mobile | S3 | yes | Pressed feedback exists only on .btn, and hover rules are not gated, so hover can stick after a tap | Yellow |
| SA-23 | A-mobile | S3 | yes | No haptics today, and adding them behind the existing sound setting would be a small progressive enhancement | Yellow |
| SA-24 | D-perf | S3 | yes | The wheel mounts about 38 eager image elements and animates a blur filter every frame, a risk on slow phones | Yellow |
| SA-25 | C-a11y | S3 | yes | Picking or clearing in the Picker unmounts the dialog without close(), so focus does not return to the slot | Yellow |
| SA-32 | C-a11y | S3 | yes | Pitch rings and overlays on the light grass are 1.30 to 2.22:1, and the drag drop-target ring is the lowest | Yellow |
| SA-33 | C-a11y | S3 | yes | No ::placeholder rule exists, so placeholder text uses the engine default, assumed at 1.93:1 | Yellow |
| SA-34 | C-a11y | S3 | yes | The faded unplayed match card (opacity .7) drops its text to 2.56 to 3.78:1 | Yellow |
| SA-35 | C-a11y | S3 | yes | At 200 percent text several fixed-size parts would clip, collide or truncate, chiefly the pitch tokens, wheel faces and the Picker header | Yellow |
| SA-36 | C-a11y | S3 | yes | body is pinned to 16px, so inherited text ignores a browser default-size setting while rem text follows it | Yellow |
| SA-37 | A-mobile | S3 | yes | overflow-x: hidden on both html and body makes body a scroll container, which likely stops position: sticky and masks overflow | Yellow |
| SA-38 | F-tests | S3 | yes | The e2e suite has no mobile project, no touch and no tap-size check, and its draft helper hides scroll problems | Yellow |
| SA-39 | A-mobile | S3 | yes | The narrow-width nav override is declared before the base rule and never applies | Yellow |
| SA-40 | A-mobile | S3 | yes | After a touch drag the suppressClick flag may stay set, swallowing the next genuine tap on any token | Yellow |
| SA-41 | A-mobile | S3 | yes | No overscroll-behavior on html or body, so pull-to-refresh and bounce can fire mid-draft | Yellow |
| SA-42 | A-mobile | S3 | yes | The bench row needs 310px and has 274px at 320, so tokens shrink or overflow | Yellow |
| SA-43 | A-mobile | S3 | yes | The Open-style candidate list is a nested scroller capped at 320px, which can trap the swipe in the middle of the page | Yellow |
| SB-22 | B-desktop | S3 | yes | Share-preview wording: generic description, title without challenge or finish, unlabelled record, static alt text, and no og or twitter tags on / and the other routes | Yellow |
| SB-31 | B-desktop | S3 | yes | There is no Web Share API: 'Share' only copies a link to the clipboard | Yellow |
| SC-24 | C-a11y | S3 | yes | Builder Download image gives no feedback and can fail without a message | Yellow |
| SC-38 | C-a11y | S3 | yes | Saved theme applies only after hydration, so a chosen theme flashes the other one first | Yellow |
| SC-39 | C-a11y | S3 | yes | Tap to skip and the Scouting notes summary compute under 24 pixels tall | Yellow |
| SD-02 | D-perf | S3 | yes | /history and /leaderboard import the engine barrel for constants and pull the data chunk | Red |
| SD-03 | D-perf | S3 | yes | Proxy matcher covers /creatures/** and the proxy carries a 1.64 MB dataset copy | Red |
| SD-07 | D-perf | S3 | yes | Zod classic (111,559 B raw, 32,828 B wire) ships on every route | Yellow |
| SD-08 | D-perf | S3 | yes | Header Link prefetch pulls other routes' chunks, likely including the data chunk | Yellow |
| SD-09 | D-perf | S3 | yes | /daily LCP content is client rendered after hydration | Yellow |
| SD-10 | D-perf | S3 | yes | 21,510 B (60.8%) of the game CSS is not needed for / first paint | Yellow |
| SD-11 | D-perf | S3 | yes | Font set can be trimmed (Barlow 600 and preloads) and the Big Shoulders override warning needs a build log | Yellow |
| SD-12 | D-perf | S3 | yes | Stored theme is applied in useEffect, causing a flash and a possible label width shift | Yellow |
| SD-13 | D-perf | S3 | yes | Decoded image memory during a full 151 draft is bounded but unmeasured on a phone | Yellow |
| SD-15 | D-perf | S3 | yes | PlayScreen code is duplicated in the /play and /daily chunks | Yellow |
| SD-16 | D-perf | S3 | yes | Share card and OG image use max-age=0 must-revalidate, so each save or unfurl hits the heavy function | Red |
| SD-18 | D-perf | S3 | yes | /play and /leaderboard LCP content waits for a function resume that was 1.38 s on one probably cold sample | Red |
| SE-19 | E-backend | S3 | yes | Submit panel guards double submission with state only, lets any late reply overwrite the saved state, and has no request timeout | Yellow |
| SF-17 | F-tests | S3 | yes | The only narrow-viewport test is a resized desktop window, and its screenshots are written and never asserted | Yellow |
| SF-25 | F-tests | S3 | yes | The picker is a full-height native dialog with no swipe or back-button handling and no phone test, while GATE 4 asks for both | Yellow |
| SB-08 | B-desktop | S3 | no | How to Play never states 12 rules a player meets (Daily, leaderboard, extra time and penalties, awards, the 0 to 1000 scale, engine versions) | Yellow |
| SB-09 | B-desktop | S3 | no | Nickname hint omits the character rule, one sentence covers three rejections, and a 21 to 30 character entry silently disables Submit | Yellow |
| SB-10 | B-desktop | S3 | no | 'Leaderboard' names three different things, 'board' and 'leaderboard' are mixed, the board error repeats itself, and the empty-board copy invites 'claim the top spot' on dates no one can submit to | Yellow |
| SB-11 | B-desktop | S3 | no | Board INVALID_QUERY has no copy of its own, and a hand-edited date blames the server | Yellow |
| SB-12 | B-desktop | S3 | no | A blank ?seed= makes 'Start run' do nothing: the empty seed reaches the engine and throws inside the click handler | Yellow |
| SB-13 | B-desktop | S3 | no | An undecodable ?b= lineup link is dropped silently | Yellow |
| SB-14 | B-desktop | S3 | no | Builder 'Reset' also resets and saves the challenge settings, next to 'Clear all', with no explanation | Yellow |
| SB-15 | B-desktop | S3 | no | Terminology is inconsistent across the product (36 entries): rating, fit formats, Synergy versus link, builder/XI/squad, five Daily names, region versus generation, six verbs, seven buttons that go to / | Yellow |
| SB-16 | B-desktop | S3 | no | The Home panel controls have no inline help and apply unevenly across the Play buttons and the builder | Yellow |
| SB-17 | B-desktop | S3 | no | The W-D-L record is unlabelled on the share card, in the run title and in the history row | Yellow |
| SB-18 | B-desktop | S3 | no | Home hierarchy: four primary buttons compete, the challenge Play links sit in a panel called 'Control desk', and the h1 is the friendly builder with no one-line description of the game | Yellow |
| SB-19 | B-desktop | S3 | no | No automated guard for the 'no em dashes in user-facing copy' invariant | Yellow |
| SB-20 | B-desktop | S3 | no | Results: the sticky pitch column is estimated taller than a 900px viewport, so its bench and legend clip while stuck | Yellow |
| SB-21 | B-desktop | S3 | no | Wide-screen use of space: the 900px pitch tier is unreachable on Home, the Home toolbar and 'Play a friendly cup' sit at or below the fold at 900px, and the draft pitch is only about 684px wide | Yellow |
| SB-23 | B-desktop | S3 | no | On a shared run the only 'play' call to action is a ghost 'Play your own'; the primary button is 'Share' | Yellow |
| SB-24 | B-desktop | S3 | no | No designed fallback for no-JS or a render crash: /daily and /history serve only 'Loading ...', /play's content sits in a hidden block, and there is no noscript, error.tsx, global-error.tsx or loading.tsx | Yellow |
| SB-25 | B-desktop | S3 | no | Known carryover #2: cards show raw fit while the engine rates role-relative quality, so 'weakest' flags and the Team Score copy can disagree with the numbers on screen | Yellow |
| SB-27 | B-desktop | S3 | no | ARIA roles promise keyboard behaviour that is absent (toolbar, tablist, radiogroup), aria-label sits on a span and a div with no role, and the Sound toggle name flips with aria-pressed | Yellow |
| SB-28 | B-desktop | S3 | no | The header nav has no current-page state | Yellow |
| SB-29 | B-desktop | S3 | no | .chip, .segment, .tab and .switch controls have no hover state | Yellow |
| SB-30 | B-desktop | S3 | no | Run-card image routes set no cache headers of their own (Next default 'public, max-age=0, must-revalidate'), and PNG size, cold render time and platform caching are unmeasured | Red |
| SB-32 | B-desktop | S3 | no | Several submit errors give no next step or read as accusations (ILLEGAL_ACTION, DAILY_ALREADY_SUBMITTED, DUPLICATE_TOKEN, DAILY_SETTINGS_MISMATCH) | Yellow |
| SB-33 | B-desktop | S3 | no | The nickname blocklist is a substring match, so ordinary words and one Pokémon name are rejected (hand traced, not run) | Red |
| SB-34 | B-desktop | S3 | no | Lead refuted: the friends gate does not block link-preview bots | Yellow |
| SB-35 | B-desktop | S3 | no | Lead refuted: bare /play is not a dead end | Yellow |
| SB-36 | B-desktop | S3 | no | Lead refuted: og:description and twitter:description are not missing on /r/ pages | Yellow |
| SC-02 | C-a11y | S3 | no | CI axe scan of /play checks the invalid-link page, not the game | Yellow |
| SC-03 | C-a11y | S3 | no | CI axe coverage skips light theme, phones, interaction states and every gradient | Yellow |
| SC-15 | C-a11y | S3 | no | Tab, radio and toolbar roles promise arrow keys the page does not provide | Red |
| SC-16 | C-a11y | S3 | no | Focus rings clip inside overflow containers | Yellow |
| SC-17 | C-a11y | S3 | no | No skip link, seven Tab stops before the page content, no current-page cue | Yellow |
| SC-18 | C-a11y | S3 | no | Home page lists four h2 headings before its h1 | Yellow |
| SC-19 | C-a11y | S3 | no | Page titles and h1s are inconsistent, and the 404 title is the site name | Yellow |
| SC-20 | C-a11y | S3 | no | Species names are read twice in several accessible names, and every Scouting notes summary has the same name | Yellow |
| SC-21 | C-a11y | S3 | no | Results and shared pitches expose 16 disabled buttons | Yellow |
| SC-22 | C-a11y | S3 | no | Lists and cards lack names, and two aria-label values sit on generic elements | Yellow |
| SC-23 | C-a11y | S3 | no | Nickname label does not name the field, and errors are not tied to inputs | Red |
| SC-25 | C-a11y | S3 | no | Sound toggle changes its label and its pressed state together | Yellow |
| SC-26 | C-a11y | S3 | no | Synergy links exist only as an aria-hidden graphic | Yellow |
| SC-27 | C-a11y | S3 | no | Two data tables have no accessible name | Yellow |
| SC-28 | C-a11y | S3 | no | No error.tsx or global-error.tsx, so a fatal error shows an unthemed page with no lang | Yellow |
| SC-29 | C-a11y | S3 | no | Base type size is set in pixels on body while components use rem | Yellow |
| SC-30 | C-a11y | S3 | no | History dates use the browser locale on an English page | Yellow |
| SC-31 | C-a11y | S3 | no | Deselecting the last generation chip does nothing and says nothing | Yellow |
| SC-32 | C-a11y | S3 | no | Builder pitch tokens show note text that is not in their accessible name | Yellow |
| SC-33 | C-a11y | S3 | no | Forced colors mode drops the rings and fills that carry state | Yellow |
| SC-34 | C-a11y | S3 | no | Two looping pulses have no in-page way to stop | Yellow |
| SC-35 | C-a11y | S3 | no | Draft grid areas put the pitch before the road strip on screen but after it in the DOM | Yellow |
| SC-37 | C-a11y | S3 | no | Picker search misses names typed without their apostrophe, accents or punctuation | Yellow |
| SD-04 | D-perf | S3 | no | One 24.97 MB function bundle is shared by api/leaderboard, card, gate/unlock and the OG route | Red |
| SD-05 | D-perf | S3 | no | OG outputFileTracingIncludes key yields 0 of 2,052 creature files | Red |
| SD-06 | D-perf | S3 | no | /r/[token] holds 4 dataset copies and /gate 3 at module load | Red |
| SD-14 | D-perf | S3 | no | Goldens and CI run on Node 22 while production runs Node 24 | Red |
| SD-17 | D-perf | S3 | no | Premise of about 16,000 creature files is wrong. The count is 2,052 files, 13.10 MB | Yellow |
| SE-06 | E-backend | S3 | no | No health endpoint; nothing reports the deployed build | Red |
| SE-07 | E-backend | S3 | no | The proxy matches nearly every request, so even with the gate off each page, API call and creature image passes through a function | Red |
| SE-08 | E-backend | S3 | no | Migration safety is untested: down files and rollback.mts have no test, and production uses a non-atomic migrator that CI never exercises | Red |
| SE-09 | E-backend | S3 | no | leaderboard_entries_ip_recent_idx and the ip_hash column have no reader | Red |
| SE-10 | E-backend | S3 | no | rate_limit_events is pruned only for the key being served; keys that never return keep up to 10 rows forever | Red |
| SE-11 | E-backend | S3 | no | Board queries cannot use the index order, and the all-time board and rank are O(rows in the mode) | Red |
| SE-12 | E-backend | S3 | no | The rate-limit key is the exact client address: an IPv6 range gets many independent budgets, and a missing header would put everyone in one bucket | Red |
| SE-13 | E-backend | S3 | no | POST /gate/unlock returns 500 for any non-form body | Red |
| SE-14 | E-backend | S3 | no | safeNext returns a protocol-relative path for dot-segment inputs, so a hand-made POST to /gate/unlock redirects off-site | Red |
| SE-15 | E-backend | S3 | no | Nickname filter both over-blocks real words and is bypassed by lookalike characters | Red |
| SE-16 | E-backend | S3 | no | /gate says 'pokedraft is friends only' and asks for a passcode while the gate is off | Yellow |
| SE-17 | E-backend | S3 | no | Validators accept values Postgres cannot store, so crafted inputs return a misleading 503 | Red |
| SE-18 | E-backend | S3 | no | No time bound anywhere between the player and Neon | Red |
| SE-20 | E-backend | S3 | no | CI runs Node 22 only while production runs Node 24, and has no dependency audit or real-database migration check | Red |
| SE-21 | E-backend | S3 | no | pnpm audit: 1 high and 1 moderate, both dev-only and unreachable at runtime | Red |
| SE-22 | E-backend | S3 | no | POST routes accept any content type, buffer the whole body before the size check, and have no Origin check | Red |
| SE-23 | E-backend | S3 | no | The gate cookie value is an unsalted SHA-256 of the passcode | Red |
| SE-24 | E-backend | S3 | no | Environment documentation is incomplete | Red |
| SE-25 | E-backend | S3 | no | The rate-limit error tells players to wait a minute, but the window is an hour | Yellow |
| SF-10 | F-tests | S3 | no | A flaky pass is invisible in CI because retries are on, the report uploads only on failure, and failOnFlakyTests is unused | Yellow |
| SF-11 | F-tests | S3 | no | One animated e2e test takes about 79% of the e2e suite time and has only a 2.4x margin to the 120 s timeout | Yellow |
| SF-12 | F-tests | S3 | no | 33 PGlite tests run the full migration in beforeEach, and that cost is about 61% of summed unit test time | Red |
| SF-13 | F-tests | S3 | no | Neither CI job has a timeout-minutes, Playwright has no globalTimeout, and a second quick merge cancels the first main run | Yellow |
| SF-14 | F-tests | S3 | no | CI skips `format:check`, a dependency audit and coverage, caches no Playwright browsers, and builds the app twice | Yellow |
| SF-15 | F-tests | S3 | no | A stale local server on port 3400 is silently reused, so the e2e suite can run against old code | Yellow |
| SF-16 | F-tests | S3 | no | The draftSixteen helper hides layout problems and hard-codes the engine-3 token prefix in three tests | Yellow |
| SF-18 | F-tests | S3 | no | The down migrations and the rollback script are never run by a test | Red |
| SF-19 | F-tests | S3 | no | The live suite writes one production row per run, cannot be rerun on the same day, and fails without saying how to recover | Red |
| SF-21 | F-tests | S3 | no | E2E tests click server-rendered buttons straight after goto, so a click before hydration would be lost and a retry would hide it | Yellow |
| SF-22 | F-tests | S3 | no | The no-em-dash rule has three narrow guards and no scan of the shipped copy | Yellow |
| SF-23 | F-tests | S3 | no | A handful of tests would pass on a constant or build their expected value from the code under test | Yellow |
| SF-24 | F-tests | S3 | no | Several tests pin source text or concatenated markup, and no automated check guards the CLS claim | Yellow |
| SF-26 | F-tests | S3 | no | Seed expiry and the New York midnight boundary are tested for dailyDate only, not for the submit window | Red |
| SF-27 | F-tests | S3 | no | The Daily page keeps its date until a parent re-renders, and no test controls the browser clock | Yellow |
| SF-28 | F-tests | S3 | no | The History list and the theme toggle have no behavior test, and axe sees History only when it is empty | Yellow |
| SF-30 | F-tests | S3 | no | The accessibility scan of an 8-0-0 result page runs while a 600 ms banner animation may still be playing | Yellow |
| SF-31 | F-tests | S3 | no | role="alert" on the gate, submit and board errors is asserted by no test | Yellow |
