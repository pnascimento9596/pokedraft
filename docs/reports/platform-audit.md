# Platform audit (dispatch 7, GATE 1 and GATE 2)

Static and measured audit of `main` at `928e4b1` across six areas: A mobile, B desktop, copy, How to Play and OG, C accessibility, D performance, E back end, F test suite. Each finding was written by one auditor with file and line evidence; `status` says whether it was only read in code (`static-only`) or reproduced. Severity: S1 breaks a core flow or loses data, S2 a real defect a player meets, S3 polish. Tier is the repo's Green, Yellow or Red review tier.

Triage (GATE 2): no S1 was found. Every S2 goes to a one-theme fix PR (column Plan). S3 findings are deferred to `docs/queue/dispatch-7-deferred.md` unless a theme PR fixes them on the way, in which case that PR says so. Findings in frozen areas (engine semantics, scouting numbers, coefficients, image packs) are reported only, in `docs/queue/dispatch-7-frozen.md`.

## Counts

| Severity | Total | Fix PR | Deferred | Frozen |
|---|---|---|---|---|
| S1 | 0 | 0 | 0 | 0 |
| S2 | 56 | 56 | 0 | 0 |
| S3 | 137 | 0 | 135 | 2 |

## Fix themes

- **7C mobile draft layout and sheets**: SA-01, SA-03, SA-04, SA-05, SA-09, SA-10
- **7D tap targets and small text**: SA-06, SA-07, SA-11, SA-12
- **7E contrast and focus rings**: SA-26, SA-27, SA-28, SA-29, SA-30, SA-31, SC-04, SC-05, SC-06, SC-07, SC-08, SC-09, SC-36
- **7F swap without drag, focus and announcements**: SA-02, SB-26, SC-10, SC-11, SC-12, SC-13, SC-14, SF-02
- **7G run survives reload, download feedback**: SA-08, SB-06, SA-20, SB-05
- **7H rules and copy**: SB-01, SB-02, SB-03, SB-04, SB-07
- **7I client data split (Red, alone)**: SD-01
- **7J leaderboard and server hardening (Red)**: SE-01, SE-02, SE-03, SE-04, SE-05, SF-06, SF-07
- **7L footer layout shift**: SX-01
- **7K test suite**: SC-01, SF-03, SF-04, SF-05, SF-08, SF-09
- **7B mobile acceptance harness (PR #13)**: SF-01

Several findings are the same defect seen from two areas (for example SA-28 and SC-05, SA-08 and SB-06); they share a theme and are closed together.

## Findings

| ID | Area | Sev | Mobile | Finding | Tier | Plan |
|---|---|---|---|---|---|---|
| [SA-01](#sa-01) | A-mobile | S2 | yes | The draft pitch sits below the fold and no action bar exists, so every round needs several page scrolls | Yellow | 7C |
| [SA-02](#sa-02) | A-mobile | S2 | yes | touch-action: none on the pitch makes it a scroll dead zone, and swap in the draft is drag-only with no long press | Yellow | 7F |
| [SA-03](#sa-03) | A-mobile | S2 | yes | The Picker is a full-screen native dialog with no sheet behaviour, and nothing handles the Back button | Yellow | 7C |
| [SA-04](#sa-04) | A-mobile | S2 | yes | The Picker header stack never scrolls and takes a third or more of a phone, leaving a short list | Yellow | 7C |
| [SA-05](#sa-05) | A-mobile | S2 | yes | Landscape phones are not handled, the pitch can be 2.5 screens tall and the Picker leaves under 160px of list | Yellow | 7C |
| [SA-06](#sa-06) | A-mobile | S2 | yes | The shared button, small button, chip and segment primitives are under 44px, so most controls fail the tap bar | Yellow | 7D |
| [SA-07](#sa-07) | A-mobile | S2 | yes | The site header is not built for phones, six items wrap to two rows (about 126px) and the links are 31.7px high | Yellow | 7D |
| [SA-08](#sa-08) | A-mobile | S2 | yes | A draft in progress and the results screen live only in React state, so a refresh, tab discard or Back swipe loses the run | Yellow | 7G |
| [SA-09](#sa-09) | A-mobile | S2 | yes | Invalid-tap hints and errors render in the top column, off screen when the person is tapping the pitch | Yellow | 7C |
| [SA-10](#sa-10) | A-mobile | S2 | yes | The Images popover is anchored to its button and can start off screen, where overflow-x: hidden makes it unreachable | Yellow | 7C |
| [SA-11](#sa-11) | A-mobile | S2 | yes | Four text styles are under 11px, including the position label on every pitch token | Yellow | 7D |
| [SA-12](#sa-12) | A-mobile | S2 | yes | Inputs and selects are 36 to 40px high, and four controls are under 24px, including Tap to skip | Yellow | 7D |
| [SA-20](#sa-20) | A-mobile | S2 | yes | Download image is a blob link click, unproven on iOS, and the Builder's button has no busy or failure state | Yellow | 7G |
| [SA-26](#sa-26) | C-a11y | S2 | yes | In the light theme the amber --flood token is used as text and as a UI colour at 1.50 to 2.22:1 | Yellow | 7E |
| [SA-27](#sa-27) | C-a11y | S2 | yes | White labels on 13 of 18 type chips fail 4.5:1, in both themes | Yellow | 7E |
| [SA-28](#sa-28) | C-a11y | S2 | yes | --ink-faint is a few hundredths under 4.5:1 on panels in dark, and 3.80 to 4.24:1 in light | Yellow | 7E |
| [SA-29](#sa-29) | C-a11y | S2 | yes | White labels on the light-theme grass and the results hero fall between 2.69 and 4.07:1 | Yellow | 7E |
| [SA-30](#sa-30) | C-a11y | S2 | yes | Light --win and --token-weak used as text miss 4.5:1, and --token-weak is never redefined for light | Yellow | 7E |
| [SA-31](#sa-31) | C-a11y | S2 | yes | Input and switch boundaries are 2.0 to 2.5:1, below the 3:1 UI bar, in both themes | Yellow | 7E |
| [SB-06](#sb-06) | B-desktop | S2 | yes | A run lives only in React state: reload, a phone browser discarding the tab, or Back mid-draft loses it, and a finished run that was not submitted can never be submitted later | Yellow | 7G |
| [SC-04](#sc-04) | C-a11y | S2 | yes | Light theme --flood fails contrast as text, ring and state colour | Yellow | 7E |
| [SC-05](#sc-05) | C-a11y | S2 | yes | --ink-faint text fails 4.5 to 1 contrast on panels in both themes and on the page in light | Yellow | 7E |
| [SC-06](#sc-06) | C-a11y | S2 | yes | Type chips put white text on 13 type colours that fail 4.5 to 1 | Yellow | 7E |
| [SC-07](#sc-07) | C-a11y | S2 | yes | Light-theme pitch fails contrast for the focus ring, state rings and names | Yellow | 7E |
| [SC-08](#sc-08) | C-a11y | S2 | yes | Results hero sets white text on a gradient that turns pale in light theme | Yellow | 7E |
| [SC-10](#sc-10) | C-a11y | S2 | yes | Swapping players on the draft screen works only by dragging | Yellow | 7F |
| [SC-11](#sc-11) | C-a11y | S2 | yes | No focus management after screen swaps, rerolls, picks and Try again | Red | 7F |
| [SC-12](#sc-12) | C-a11y | S2 | yes | Picker pick and clear unmount an open dialog, which skips the focus return | Yellow | 7F |
| [SC-13](#sc-13) | C-a11y | S2 | yes | Live regions are inserted with their text or swapped out, so announcements can drop | Red | 7F |
| [SC-14](#sc-14) | C-a11y | S2 | yes | Draft and builder outcomes are silent for screen readers | Yellow | 7F |
| [SC-36](#sc-36) | C-a11y | S2 | yes | Light-theme win and weak-spot text fail 4.5 to 1 contrast on panels | Yellow | 7E |
| [SD-01](#sd-01) | D-perf | S2 | yes | 1.33 MB data chunk (243,173 B wire) loads eagerly on interaction-gated routes /, /play and /daily | Red | 7I |
| [SE-02](#se-02) | E-backend | S2 | yes | Submit is not idempotent for the same (token, nickname): a retry after a lost response returns an error and spends an hourly attempt | Red | 7J |
| [SF-01](#sf-01) | F-tests | S2 | yes | No phone profile, touch input or WebKit exists in any test or CI job, and the GATE 4 mobile spec is absent | Yellow | 7B |
| [SF-02](#sf-02) | F-tests | S2 | yes | Touch drag-swap is tested only in jsdom with faked hit-testing, and a touch drag may leave the next tap swallowed | Yellow | 7F |
| [SX-01](#sx-01) | D-performance | S2 | yes | The site footer shifts when the page content streams in: CLS 0.211 on /r/<token> and 0.046 on /daily on production, every run | Yellow | 7L |
| [SB-01](#sb-01) | B-desktop | S2 | no | How to Play and the results page still say the ladder gets hard from the quarter-final (stale since the engine 3 ladder) | Yellow | 7H |
| [SB-02](#sb-02) | B-desktop | S2 | no | How to Play says Open and Classic are 'tracked separately', but the leaderboard ranks them together | Yellow | 7H |
| [SB-03](#sb-03) | B-desktop | S2 | no | How to Play promises 'any Pokémon', but the builder hides Legendary and Mythical by default and challenge squads cap them at 3 | Yellow | 7H |
| [SB-04](#sb-04) | B-desktop | S2 | no | RATE_LIMITED copy says 'Wait a minute', but the lockout is up to an hour | Yellow | 7H |
| [SB-05](#sb-05) | B-desktop | S2 | no | Builder 'Download image' has no busy, success or failure feedback, and a failed download is an unhandled rejection | Yellow | 7G |
| [SB-07](#sb-07) | B-desktop | S2 | no | How to Play says a region reroll gives 'a new region and a new type'; the type can repeat | Yellow | 7H |
| [SB-26](#sb-26) | B-desktop | S2 | no | Draft-board swap is pointer-only: keyboard and screen-reader users cannot swap players, and tapping a filled slot after the draft does nothing | Yellow | 7F |
| [SC-01](#sc-01) | C-a11y | S2 | no | CI axe suite runs 1 rule, not the 89 its tags select | Yellow | 7K |
| [SC-09](#sc-09) | C-a11y | S2 | no | Focus ring replaced or weakened on armed slots and picker fields | Yellow | 7E |
| [SE-01](#se-01) | E-backend | S2 | no | The same run can be listed more than once: the duplicate guard keys on the exact token string, and the decoder accepts many encodings of one run | Red | 7J |
| [SE-03](#se-03) | E-backend | S2 | no | Server errors are swallowed: five catch blocks return 503 without logging, there is no request id and no instrumentation hook | Red | 7J |
| [SE-04](#se-04) | E-backend | S2 | no | No CSP, nosniff, Referrer-Policy, Permissions-Policy or frame protection on any response; adding a strict CSP would trip a zod eval probe | Red | 7J |
| [SE-05](#se-05) | E-backend | S2 | no | /card and the share-image route are public, uncached CPU renders with no cap | Red | 7J |
| [SF-03](#sf-03) | F-tests | S2 | no | No test drives Position First, a reroll button, the home Start links or the animated Randomize cascade | Yellow | 7K |
| [SF-04](#sf-04) | F-tests | S2 | no | Builder first placement, Clear all, Reset, Copy link and Download image have no test, while finish-qa.md reports F2 and F3 as covered | Yellow | 7K |
| [SF-05](#sf-05) | F-tests | S2 | no | No test operates the app by keyboard, and the picker dialog's focus and Escape behavior is stubbed away | Yellow | 7K |
| [SF-06](#sf-06) | F-tests | S2 | no | Double submit has no test at either layer, and the insert-time unique-violation path never runs | Red | 7J |
| [SF-07](#sf-07) | F-tests | S2 | no | The friends gate has no test for its cookie attributes, route wiring, matcher, error copy or a browser unlock | Red | 7J |
| [SF-08](#sf-08) | F-tests | S2 | no | The accessibility spec audits an invalid-link page instead of the builder, and runs axe in dark mode on 7 URLs only | Yellow | 7K |
| [SF-09](#sf-09) | F-tests | S2 | no | The wheel test 'settles on the engine roll for 500 seeded rolls' keeps the default 5 s timeout and fails under load | Yellow | 7K |
| [SA-13](#sa-13) | A-mobile | S3 | yes | Filled pitch tokens have overlapping hit boxes on phones in every formation, and the bench gap is under 8px at 390 | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-14](#sa-14) | A-mobile | S3 | yes | The nickname and Picker search inputs lack the mobile keyboard attributes, and the keyboard cover case is unverified | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-15](#sa-15) | A-mobile | S3 | yes | The Image style select is 14.4px, below the 16px at which iOS Safari stops zooming on focus | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-16](#sa-16) | A-mobile | S3 | yes | layout.tsx exports no viewport, so there is no theme colour, color scheme, viewport-fit or interactive-widget setting | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-17](#sa-17) | A-mobile | S3 | yes | No web manifest, no 192 or 512 icons and no apple-touch-icon, so Add to Home Screen gives a plain shortcut | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-18](#sa-18) | A-mobile | S3 | yes | The stored theme is applied after hydration, so a person whose choice differs from the OS setting sees a flash of the other theme | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-19](#sa-19) | A-mobile | S3 | yes | Copy link and Share rely on navigator.clipboard alone, with no Web Share and no manual fallback | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-21](#sa-21) | A-mobile | S3 | yes | No touch defaults are set, so long-press callouts, tap highlights and double-tap zoom behave as the browser likes | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-22](#sa-22) | A-mobile | S3 | yes | Pressed feedback exists only on .btn, and hover rules are not gated, so hover can stick after a tap | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-23](#sa-23) | A-mobile | S3 | yes | No haptics today, and adding them behind the existing sound setting would be a small progressive enhancement | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-24](#sa-24) | D-perf | S3 | yes | The wheel mounts about 38 eager image elements and animates a blur filter every frame, a risk on slow phones | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-25](#sa-25) | C-a11y | S3 | yes | Picking or clearing in the Picker unmounts the dialog without close(), so focus does not return to the slot | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-32](#sa-32) | C-a11y | S3 | yes | Pitch rings and overlays on the light grass are 1.30 to 2.22:1, and the drag drop-target ring is the lowest | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-33](#sa-33) | C-a11y | S3 | yes | No ::placeholder rule exists, so placeholder text uses the engine default, assumed at 1.93:1 | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-34](#sa-34) | C-a11y | S3 | yes | The faded unplayed match card (opacity .7) drops its text to 2.56 to 3.78:1 | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-35](#sa-35) | C-a11y | S3 | yes | At 200 percent text several fixed-size parts would clip, collide or truncate, chiefly the pitch tokens, wheel faces and the Picker header | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-36](#sa-36) | C-a11y | S3 | yes | body is pinned to 16px, so inherited text ignores a browser default-size setting while rem text follows it | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-37](#sa-37) | A-mobile | S3 | yes | overflow-x: hidden on both html and body makes body a scroll container, which likely stops position: sticky and masks overflow | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-38](#sa-38) | F-tests | S3 | yes | The e2e suite has no mobile project, no touch and no tap-size check, and its draft helper hides scroll problems | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-39](#sa-39) | A-mobile | S3 | yes | The narrow-width nav override is declared before the base rule and never applies | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-40](#sa-40) | A-mobile | S3 | yes | After a touch drag the suppressClick flag may stay set, swallowing the next genuine tap on any token | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-41](#sa-41) | A-mobile | S3 | yes | No overscroll-behavior on html or body, so pull-to-refresh and bounce can fire mid-draft | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-42](#sa-42) | A-mobile | S3 | yes | The bench row needs 310px and has 274px at 320, so tokens shrink or overflow | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SA-43](#sa-43) | A-mobile | S3 | yes | The Open-style candidate list is a nested scroller capped at 320px, which can trap the swipe in the middle of the page | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-22](#sb-22) | B-desktop | S3 | yes | Share-preview wording: generic description, title without challenge or finish, unlabelled record, static alt text, and no og or twitter tags on / and the other routes | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-31](#sb-31) | B-desktop | S3 | yes | There is no Web Share API: 'Share' only copies a link to the clipboard | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-24](#sc-24) | C-a11y | S3 | yes | Builder Download image gives no feedback and can fail without a message | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-38](#sc-38) | C-a11y | S3 | yes | Saved theme applies only after hydration, so a chosen theme flashes the other one first | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-39](#sc-39) | C-a11y | S3 | yes | Tap to skip and the Scouting notes summary compute under 24 pixels tall | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-02](#sd-02) | D-perf | S3 | yes | /history and /leaderboard import the engine barrel for constants and pull the data chunk | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-03](#sd-03) | D-perf | S3 | yes | Proxy matcher covers /creatures/** and the proxy carries a 1.64 MB dataset copy | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-07](#sd-07) | D-perf | S3 | yes | Zod classic (111,559 B raw, 32,828 B wire) ships on every route | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-08](#sd-08) | D-perf | S3 | yes | Header Link prefetch pulls other routes' chunks, likely including the data chunk | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-09](#sd-09) | D-perf | S3 | yes | /daily LCP content is client rendered after hydration | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-10](#sd-10) | D-perf | S3 | yes | 21,510 B (60.8%) of the game CSS is not needed for / first paint | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-11](#sd-11) | D-perf | S3 | yes | Font set can be trimmed (Barlow 600 and preloads) and the Big Shoulders override warning needs a build log | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-12](#sd-12) | D-perf | S3 | yes | Stored theme is applied in useEffect, causing a flash and a possible label width shift | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-13](#sd-13) | D-perf | S3 | yes | Decoded image memory during a full 151 draft is bounded but unmeasured on a phone | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-15](#sd-15) | D-perf | S3 | yes | PlayScreen code is duplicated in the /play and /daily chunks | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-16](#sd-16) | D-perf | S3 | yes | Share card and OG image use max-age=0 must-revalidate, so each save or unfurl hits the heavy function | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-18](#sd-18) | D-perf | S3 | yes | /play and /leaderboard LCP content waits for a function resume that was 1.38 s on one probably cold sample | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-19](#se-19) | E-backend | S3 | yes | Submit panel guards double submission with state only, lets any late reply overwrite the saved state, and has no request timeout | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-17](#sf-17) | F-tests | S3 | yes | The only narrow-viewport test is a resized desktop window, and its screenshots are written and never asserted | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-25](#sf-25) | F-tests | S3 | yes | The picker is a full-height native dialog with no swipe or back-button handling and no phone test, while GATE 4 asks for both | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-08](#sb-08) | B-desktop | S3 | no | How to Play never states 12 rules a player meets (Daily, leaderboard, extra time and penalties, awards, the 0 to 1000 scale, engine versions) | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-09](#sb-09) | B-desktop | S3 | no | Nickname hint omits the character rule, one sentence covers three rejections, and a 21 to 30 character entry silently disables Submit | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-10](#sb-10) | B-desktop | S3 | no | 'Leaderboard' names three different things, 'board' and 'leaderboard' are mixed, the board error repeats itself, and the empty-board copy invites 'claim the top spot' on dates no one can submit to | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-11](#sb-11) | B-desktop | S3 | no | Board INVALID_QUERY has no copy of its own, and a hand-edited date blames the server | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-12](#sb-12) | B-desktop | S3 | no | A blank ?seed= makes 'Start run' do nothing: the empty seed reaches the engine and throws inside the click handler | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-13](#sb-13) | B-desktop | S3 | no | An undecodable ?b= lineup link is dropped silently | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-14](#sb-14) | B-desktop | S3 | no | Builder 'Reset' also resets and saves the challenge settings, next to 'Clear all', with no explanation | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-15](#sb-15) | B-desktop | S3 | no | Terminology is inconsistent across the product (36 entries): rating, fit formats, Synergy versus link, builder/XI/squad, five Daily names, region versus generation, six verbs, seven buttons that go to / | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-16](#sb-16) | B-desktop | S3 | no | The Home panel controls have no inline help and apply unevenly across the Play buttons and the builder | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-17](#sb-17) | B-desktop | S3 | no | The W-D-L record is unlabelled on the share card, in the run title and in the history row | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-18](#sb-18) | B-desktop | S3 | no | Home hierarchy: four primary buttons compete, the challenge Play links sit in a panel called 'Control desk', and the h1 is the friendly builder with no one-line description of the game | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-19](#sb-19) | B-desktop | S3 | no | No automated guard for the 'no em dashes in user-facing copy' invariant | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-20](#sb-20) | B-desktop | S3 | no | Results: the sticky pitch column is estimated taller than a 900px viewport, so its bench and legend clip while stuck | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-21](#sb-21) | B-desktop | S3 | no | Wide-screen use of space: the 900px pitch tier is unreachable on Home, the Home toolbar and 'Play a friendly cup' sit at or below the fold at 900px, and the draft pitch is only about 684px wide | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-23](#sb-23) | B-desktop | S3 | no | On a shared run the only 'play' call to action is a ghost 'Play your own'; the primary button is 'Share' | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-24](#sb-24) | B-desktop | S3 | no | No designed fallback for no-JS or a render crash: /daily and /history serve only 'Loading ...', /play's content sits in a hidden block, and there is no noscript, error.tsx, global-error.tsx or loading.tsx | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-25](#sb-25) | B-desktop | S3 | no | Known carryover #2: cards show raw fit while the engine rates role-relative quality, so 'weakest' flags and the Team Score copy can disagree with the numbers on screen | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-27](#sb-27) | B-desktop | S3 | no | ARIA roles promise keyboard behaviour that is absent (toolbar, tablist, radiogroup), aria-label sits on a span and a div with no role, and the Sound toggle name flips with aria-pressed | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-28](#sb-28) | B-desktop | S3 | no | The header nav has no current-page state | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-29](#sb-29) | B-desktop | S3 | no | .chip, .segment, .tab and .switch controls have no hover state | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-30](#sb-30) | B-desktop | S3 | no | Run-card image routes set no cache headers of their own (Next default 'public, max-age=0, must-revalidate'), and PNG size, cold render time and platform caching are unmeasured | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-32](#sb-32) | B-desktop | S3 | no | Several submit errors give no next step or read as accusations (ILLEGAL_ACTION, DAILY_ALREADY_SUBMITTED, DUPLICATE_TOKEN, DAILY_SETTINGS_MISMATCH) | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-33](#sb-33) | B-desktop | S3 | no | The nickname blocklist is a substring match, so ordinary words and one Pokémon name are rejected (hand traced, not run) | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-34](#sb-34) | B-desktop | S3 | no | Lead refuted: the friends gate does not block link-preview bots | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-35](#sb-35) | B-desktop | S3 | no | Lead refuted: bare /play is not a dead end | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SB-36](#sb-36) | B-desktop | S3 | no | Lead refuted: og:description and twitter:description are not missing on /r/ pages | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-02](#sc-02) | C-a11y | S3 | no | CI axe scan of /play checks the invalid-link page, not the game | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-03](#sc-03) | C-a11y | S3 | no | CI axe coverage skips light theme, phones, interaction states and every gradient | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-15](#sc-15) | C-a11y | S3 | no | Tab, radio and toolbar roles promise arrow keys the page does not provide | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-16](#sc-16) | C-a11y | S3 | no | Focus rings clip inside overflow containers | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-17](#sc-17) | C-a11y | S3 | no | No skip link, seven Tab stops before the page content, no current-page cue | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-18](#sc-18) | C-a11y | S3 | no | Home page lists four h2 headings before its h1 | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-19](#sc-19) | C-a11y | S3 | no | Page titles and h1s are inconsistent, and the 404 title is the site name | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-20](#sc-20) | C-a11y | S3 | no | Species names are read twice in several accessible names, and every Scouting notes summary has the same name | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-21](#sc-21) | C-a11y | S3 | no | Results and shared pitches expose 16 disabled buttons | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-22](#sc-22) | C-a11y | S3 | no | Lists and cards lack names, and two aria-label values sit on generic elements | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-23](#sc-23) | C-a11y | S3 | no | Nickname label does not name the field, and errors are not tied to inputs | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-25](#sc-25) | C-a11y | S3 | no | Sound toggle changes its label and its pressed state together | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-26](#sc-26) | C-a11y | S3 | no | Synergy links exist only as an aria-hidden graphic | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-27](#sc-27) | C-a11y | S3 | no | Two data tables have no accessible name | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-28](#sc-28) | C-a11y | S3 | no | No error.tsx or global-error.tsx, so a fatal error shows an unthemed page with no lang | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-29](#sc-29) | C-a11y | S3 | no | Base type size is set in pixels on body while components use rem | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-30](#sc-30) | C-a11y | S3 | no | History dates use the browser locale on an English page | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-31](#sc-31) | C-a11y | S3 | no | Deselecting the last generation chip does nothing and says nothing | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-32](#sc-32) | C-a11y | S3 | no | Builder pitch tokens show note text that is not in their accessible name | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-33](#sc-33) | C-a11y | S3 | no | Forced colors mode drops the rings and fills that carry state | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-34](#sc-34) | C-a11y | S3 | no | Two looping pulses have no in-page way to stop | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-35](#sc-35) | C-a11y | S3 | no | Draft grid areas put the pitch before the road strip on screen but after it in the DOM | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SC-37](#sc-37) | C-a11y | S3 | no | Picker search misses names typed without their apostrophe, accents or punctuation | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-04](#sd-04) | D-perf | S3 | no | One 24.97 MB function bundle is shared by api/leaderboard, card, gate/unlock and the OG route | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-05](#sd-05) | D-perf | S3 | no | OG outputFileTracingIncludes key yields 0 of 2,052 creature files | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-06](#sd-06) | D-perf | S3 | no | /r/[token] holds 4 dataset copies and /gate 3 at module load | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-14](#sd-14) | D-perf | S3 | no | Goldens and CI run on Node 22 while production runs Node 24 | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SD-17](#sd-17) | D-perf | S3 | no | Premise of about 16,000 creature files is wrong. The count is 2,052 files, 13.10 MB | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-06](#se-06) | E-backend | S3 | no | No health endpoint; nothing reports the deployed build | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-07](#se-07) | E-backend | S3 | no | The proxy matches nearly every request, so even with the gate off each page, API call and creature image passes through a function | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-08](#se-08) | E-backend | S3 | no | Migration safety is untested: down files and rollback.mts have no test, and production uses a non-atomic migrator that CI never exercises | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-09](#se-09) | E-backend | S3 | no | leaderboard_entries_ip_recent_idx and the ip_hash column have no reader | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-10](#se-10) | E-backend | S3 | no | rate_limit_events is pruned only for the key being served; keys that never return keep up to 10 rows forever | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-11](#se-11) | E-backend | S3 | no | Board queries cannot use the index order, and the all-time board and rank are O(rows in the mode) | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-12](#se-12) | E-backend | S3 | no | The rate-limit key is the exact client address: an IPv6 range gets many independent budgets, and a missing header would put everyone in one bucket | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-13](#se-13) | E-backend | S3 | no | POST /gate/unlock returns 500 for any non-form body | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-14](#se-14) | E-backend | S3 | no | safeNext returns a protocol-relative path for dot-segment inputs, so a hand-made POST to /gate/unlock redirects off-site | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-15](#se-15) | E-backend | S3 | no | Nickname filter both over-blocks real words and is bypassed by lookalike characters | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-16](#se-16) | E-backend | S3 | no | /gate says 'pokedraft is friends only' and asks for a passcode while the gate is off | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-17](#se-17) | E-backend | S3 | no | Validators accept values Postgres cannot store, so crafted inputs return a misleading 503 | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-18](#se-18) | E-backend | S3 | no | No time bound anywhere between the player and Neon | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-20](#se-20) | E-backend | S3 | no | CI runs Node 22 only while production runs Node 24, and has no dependency audit or real-database migration check | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-21](#se-21) | E-backend | S3 | no | pnpm audit: 1 high and 1 moderate, both dev-only and unreachable at runtime | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-22](#se-22) | E-backend | S3 | no | POST routes accept any content type, buffer the whole body before the size check, and have no Origin check | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-23](#se-23) | E-backend | S3 | no | The gate cookie value is an unsalted SHA-256 of the passcode | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-24](#se-24) | E-backend | S3 | no | Environment documentation is incomplete | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SE-25](#se-25) | E-backend | S3 | no | The rate-limit error tells players to wait a minute, but the window is an hour | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-10](#sf-10) | F-tests | S3 | no | A flaky pass is invisible in CI because retries are on, the report uploads only on failure, and failOnFlakyTests is unused | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-11](#sf-11) | F-tests | S3 | no | One animated e2e test takes about 79% of the e2e suite time and has only a 2.4x margin to the 120 s timeout | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-12](#sf-12) | F-tests | S3 | no | 33 PGlite tests run the full migration in beforeEach, and that cost is about 61% of summed unit test time | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-13](#sf-13) | F-tests | S3 | no | Neither CI job has a timeout-minutes, Playwright has no globalTimeout, and a second quick merge cancels the first main run | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-14](#sf-14) | F-tests | S3 | no | CI skips `format:check`, a dependency audit and coverage, caches no Playwright browsers, and builds the app twice | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-15](#sf-15) | F-tests | S3 | no | A stale local server on port 3400 is silently reused, so the e2e suite can run against old code | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-16](#sf-16) | F-tests | S3 | no | The draftSixteen helper hides layout problems and hard-codes the engine-3 token prefix in three tests | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-18](#sf-18) | F-tests | S3 | no | The down migrations and the rollback script are never run by a test | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-19](#sf-19) | F-tests | S3 | no | The live suite writes one production row per run, cannot be rerun on the same day, and fails without saying how to recover | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-20](#sf-20) | F-tests | S3 | no | The scouting test 'raises KIC only for keepers' cannot fail today, because no species has a positive KIC adjustment | Red | frozen: docs/queue/dispatch-7-frozen.md |
| [SF-21](#sf-21) | F-tests | S3 | no | E2E tests click server-rendered buttons straight after goto, so a click before hydration would be lost and a retry would hide it | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-22](#sf-22) | F-tests | S3 | no | The no-em-dash rule has three narrow guards and no scan of the shipped copy | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-23](#sf-23) | F-tests | S3 | no | A handful of tests would pass on a constant or build their expected value from the code under test | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-24](#sf-24) | F-tests | S3 | no | Several tests pin source text or concatenated markup, and no automated check guards the CLS claim | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-26](#sf-26) | F-tests | S3 | no | Seed expiry and the New York midnight boundary are tested for dailyDate only, not for the submit window | Red | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-27](#sf-27) | F-tests | S3 | no | The Daily page keeps its date until a parent re-renders, and no test controls the browser clock | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-28](#sf-28) | F-tests | S3 | no | The History list and the theme toggle have no behavior test, and axe sees History only when it is empty | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-29](#sf-29) | F-tests | S3 | no | The queued GK review rule has no test, and 2 of 160 GK-best species (Jigglypuff and Wigglytuff) already break it | Red | frozen: docs/queue/dispatch-7-frozen.md |
| [SF-30](#sf-30) | F-tests | S3 | no | The accessibility scan of an 8-0-0 result page runs while a 600 ms banner animation may still be playing | Yellow | deferred: docs/queue/dispatch-7-deferred.md |
| [SF-31](#sf-31) | F-tests | S3 | no | role="alert" on the gate, submit and board errors is asserted by no test | Yellow | deferred: docs/queue/dispatch-7-deferred.md |

## Evidence and proposed fix

### SA-01

**The draft pitch sits below the fold and no action bar exists, so every round needs several page scrolls** (S2, Yellow, needs-browser-proof)

- Evidence: Computed from declared CSS, nothing rendered (A-tap-targets.md appendix A). Below 960px the draft is one column in the order side, pitch, road (src/components/run/DraftBoard.module.css:1-9). The side column holds the round card, the wheel, the candidates and the reroll buttons (src/components/run/DraftBoard.tsx:120-228), so the pitch comes after all of it. At 390x664 with a 126px header the field starts at 818px in the Classic state and ends at 1371px, so 0 percent of it shows at scroll 0 in the Open, Classic and 151 states. At 320x568 the same states show 0 percent. The pitch block alone (field 553px, bench 124px) is 689px, 104 percent of a 664px screen, and 581px at 320. Position First, the quietest state, shows 41 percent of the field at 390x664 and 29 percent at 320x568. Candidates and all 16 slots never fit on one screen. Candidates plus the 11 starters fit at 390x844 only for 2 of 4 candidate states (Classic with one type line, and 151), and only after scrolling about 547px, which moves the wheel, the round counter and the rerolls out of view. No fixed or sticky bar exists below 960px (src/components/run/DraftBoard.module.css:11-24, and a grep for position: fixed over src returns no line). Reroll (src/components/run/DraftBoard.tsx:152-169) and See results (src/components/run/DraftBoard.tsx:210) are in the top column, away from thumb reach. The layout also moves during a round. The side column is 280px before a slot is tapped in Position First, 437px once the wheel shows and 660px with Classic cards, so the pitch drops about 156px at the tap and about 380px by the time cards show. The Builder has the same shape. Its toolbar and Play a friendly cup follow the whole pitch (src/components/builder/Builder.tsx:153-203).
- Fix: Keep the pitch and the actions on one screen. Put Reroll and See results in a sticky bottom bar (padding-bottom env(safe-area-inset-bottom), needs SA-16 and SA-37 first), give the side column a fixed height per state so the pitch does not move when the wheel or the cards appear, and compact the candidate strip so the pitch (field plus bench) can be reached with one short scroll. Then re-measure at 390x664 and 320x568 in a browser.
- Acceptance: [1]
- Notes: Header height is the least certain term (92px with one nav row under the brand, 126px with two, estimate). The conclusion survives either value because every candidate state starts the field more than 154px below the 664px fold. All numbers are inferred, A1 to A3 must read getBoundingClientRect.

### SA-02

**touch-action: none on the pitch makes it a scroll dead zone, and swap in the draft is drag-only with no long press** (S2, Yellow, needs-browser-proof)

- Evidence: The field and every token set touch-action: none (src/components/pitch/Pitch.module.css:9-29, src/components/pitch/Pitch.module.css:65-83). Drag is Pointer Events with setPointerCapture (src/components/pitch/Pitch.tsx:171-183), a 6px slop (DRAG_THRESHOLD, src/components/pitch/Pitch.tsx:102) and no long-press timer, so a touch that moves more than 6px starts a drag at once. It is not HTML5 drag and drop (no draggable attribute or onDrag handler exists in src). With touch-action: none the browser never pans from a finger that starts on the field or on a token, so a vertical swipe on the pitch cannot scroll the page. The field is 553px tall at 390 wide, 83 percent of a 664px screen, and 976px tall in iPhone landscape (SA-05), where only the 16px gutters remain as a scrollable strip. The bench tokens carry the same rule. In the draft a swap is drag-only. Tapping a filled slot shows a hint that says to drag one player onto another (src/components/run/DraftBoard.tsx:105), and the finished-draft copy says the same (src/components/run/DraftBoard.tsx:206). Tap-to-swap exists only in the Builder, through the Picker's Swap with row (src/components/builder/Picker.tsx:208).
- Fix: Set touch-action: pan-y on the field and tokens, start a drag after a 250 to 300ms press (or from a visible handle), and add a tap-to-swap path in the draft (tap a filled token to select it, tap a second one to swap). Keep the 6px slop for mouse. Verify with touch emulation and a real phone that vertical swipes on the pitch scroll the page and a long-press drag still swaps.
- Acceptance: [5]
- Notes: Whether the dead zone is felt depends on how much of the screen the pitch fills, so the strength of this finding grows with SA-01. Not exercised, the previous QA lists touch-emulated drag swap as NOT RUN (docs/reports/finish-qa.md).

### SA-03

**The Picker is a full-screen native dialog with no sheet behaviour, and nothing handles the Back button** (S2, Yellow, needs-browser-proof)

- Evidence: What exists today. A native dialog opened with showModal() in an effect (src/components/builder/Picker.tsx:55), labelled by its title (src/components/builder/Picker.tsx:96), closed by the Close button (src/components/builder/Picker.tsx:120), by Escape (native) and by a click on the backdrop (src/components/builder/Picker.tsx:99). Focus is trapped natively by showModal. The list has overscroll-behavior: contain (src/components/builder/Picker.module.css:113-121). What is missing. Below 720px the dialog is 100% wide and 100dvh tall (src/components/builder/Picker.module.css:1-11), so there is no backdrop to tap and no sheet shape, no drag handle and no swipe-to-close. A grep over src for pushState, popstate, CloseWatcher and beforeunload finds nothing (the only history call is replaceState for ?b= at src/components/home/HomeScreen.tsx:67), so the Back button gets no handling by this code. On Android Chrome a modal dialog may close on Back through the browser's own close watcher, which is not provable from source. iOS has no Back button, and an edge swipe navigates away from the page. Pick and Clear unmount the dialog through state without calling close() (src/components/builder/Builder.tsx:214-223). The other sheet-like surfaces are lighter. Settings is a collapse panel with aria-expanded (src/components/home/SidePanel.tsx:110), and the Images popover is a native details element (src/components/ImageSettings.tsx:12) that has no outside-tap or Escape close.
- Fix: Present the Picker as a bottom sheet on coarse pointers (about 85dvh, rounded top, drag handle, swipe-down past a threshold closes). Push one history entry on open and close on popstate so Back closes the sheet and then pops the entry on a normal close. Keep the native dialog for the focus trap and Escape. Close the Images details on outside tap and Escape.
- Acceptance: [4]
- Notes: Android Back behaviour (close watcher) and WebKit behaviour were not exercised. Classified needs-browser-proof for acceptance assertion 4.

### SA-04

**The Picker header stack never scrolls and takes a third or more of a phone, leaving a short list** (S2, Yellow, needs-browser-proof)

- Evidence: Only .list scrolls (src/components/builder/Picker.module.css:113-121). The title bar, the search and generation row, the 18 type chips and the count line stay put (src/components/builder/Picker.module.css:36-44, src/components/builder/Picker.module.css:57-62, src/components/builder/Picker.module.css:84-89, src/components/builder/Picker.module.css:106-111). From declared CSS that stack is about 263px at 3 chip rows, 230 to 296px across 320 to 430px wide and three text-width factors (the chip wrap is an estimate, 4 rows at 320 gives 296px). The list then gets about 401px at 390x664 (60 percent), 272px at 320x568, 160px in iPhone landscape 664x390 (full-screen sheet below 720px) and 96px at 844x390 (dialog height min(760px, 100dvh - 64px), src/components/builder/Picker.module.css:205-210). The search field is focused in code on open (src/components/builder/Picker.tsx:56). If a software keyboard of about 300px (assumed, device dependent) opens at the same time, about 101px of list is left at 390x664. iOS usually ignores programmatic focus outside a gesture, Android Chrome does not, so this differs by platform. The type chips are 28px high (SA-06).
- Fix: Let the filter block scroll away with the list, or collapse it behind a Filters button. Replace the 18 chips with a select or a one-row horizontal scroller. Do not autofocus the search on coarse pointers, so the keyboard opens only when the person taps the field. Use a bottom sheet height that leaves the list at least half of the screen.
- Acceptance: [4, 6]
- Notes: Chip rows are estimated from Next's capsize widths and good to about plus or minus 20 percent. The keyboard figure is an assumption, NOT RUN on a device.

### SA-05

**Landscape phones are not handled, the pitch can be 2.5 screens tall and the Picker leaves under 160px of list** (S2, Yellow, needs-browser-proof)

- Evidence: No stylesheet has an orientation or height media query (the full @media list is width based, prefers-color-scheme or prefers-reduced-motion). The pitch switches layout on its own container width, 640px (src/components/pitch/Pitch.module.css:235), not on orientation. iPhone 14 landscape is 664x390, so the container is 664 - 32 = 632px, still below the switch, and the field stays vertical at 976px tall (250 percent of a 390px screen). At 844x390 the container is 812px and the horizontal field is 526px tall, taller than the screen. The pitch never fits whole, and with touch-action: none (SA-02) a vertical field of 632px inside a 664px viewport leaves only the 16px gutters beside it as places where a swipe can start a scroll. The header is 57px at 664 and 57px at 844 (estimate), 15 percent of the height. The Picker is full screen below 720px, so its list gets about 160px at 664x390 and about 96px in the 844x390 dialog (SA-04). The wheel window is a fixed 144px (src/components/wheel/Wheel.module.css:34-36). No rotate hint exists.
- Fix: Add a landscape-and-short rule (orientation: landscape and max-height: 500px) that caps the field to the available height (aspect ratio keeps the width), reduces the header, and lets the page pan over the pitch. Either show a rotate-for-best-view hint on the draft or make the draft two columns (pitch left, wheel and candidates right) at that size. Re-check the Picker height there.
- Acceptance: [7]
- Notes: All figures are arithmetic on declared CSS and the Playwright device sizes, none rendered.

### SA-06

**The shared button, small button, chip and segment primitives are under 44px, so most controls fail the tap bar** (S2, Yellow, static-only)

- Evidence: src/app/globals.css:218-239 sets min-height 40px, src/app/globals.css:268-272 sets 32px, src/app/globals.css:274-289 sets 32px, the Picker type chips 28px (src/components/builder/Picker.module.css:91-97) and the segments 34px (src/components/home/SidePanel.module.css:121-133). The tap table (A-tap-targets.md) lists 66 control kinds (246 instances where countable). 53 kinds fail 44x44 and 13 pass. By root cause that is 22 kinds on .btn, 7 on .btn--sm, 5 chip kinds and 3 segmented controls here, plus 6 input kinds (SA-12), 6 header nav kinds (SA-07) and 4 tiny controls (SA-12). The primary actions the brief names miss the bar. Reroll is 32px, See results, Submit, Randomize and Play a friendly cup are 40px, and the Picker Close and Clear slot buttons are 32px. Pick rows and candidate cards pass. No hit-area expansion exists (a grep for negative inset offsets in src CSS returns no line), so the drawn size is the tap size. Chips sit 5 to 6px apart and the segments touch (CONTIG).
- Fix: Raise .btn to min-height 44px, give .btn--sm a 44px hit area (padding or a pseudo-element, the drawn pill can stay small), make .chip and the segments 44px with 8px gaps, and replace the Picker's 18 type chips with a select or a scroller. One change in globals.css flips every row tagged btn.
- Acceptance: [3]
- Notes: Widths of text-driven boxes are estimates, heights are exact from the 1.45 line height, so the 44px verdicts for heights do not depend on the estimate.

### SA-07

**The site header is not built for phones, six items wrap to two rows (about 126px) and the links are 31.7px high** (S2, Yellow, needs-browser-proof)

- Evidence: The header is a wrapping flex row with the brand and a nav of four links, the Images summary and the Theme button (src/app/layout.tsx:35-47, src/app/globals.css:363-371, src/app/globals.css:386-391). Links have no min-height, so each is 0.85rem x 1.45 + 12px = 31.7px, with a 2px gap (src/app/globals.css:412-421). Items are nowrap (src/app/globals.css:406-410). From the wrap model (capsize widths, factors 0.8, 1.0 and 1.2) the header is 126px high on two nav rows at 390 and 92px with one nav row under the brand, which is 19 percent of a 664px screen on every route. The header does not stick, but it pushes the draft down (SA-01). The links and buttons fail 44x44 and the 2px gaps fail 8px (rows T01 to T06 in A-tap-targets.md).
- Fix: Collapse the secondary links behind one menu button on phones (a sheet with 44px rows), keep the brand and at most one other control in the bar, and give links min-height 44px with 8px gaps where they remain. That also returns about 60px of height to the draft.
- Acceptance: [3, 1]
- Notes: Text widths decide the wrap and are estimates (plus or minus 20 percent), so the 2-row result is a lead for the browser pass.

### SA-08

**A draft in progress and the results screen live only in React state, so a refresh, tab discard or Back swipe loses the run** (S2, Yellow, static-only)

- Evidence: The challenge screen is a useState (src/components/run/PlayScreen.tsx:97) holding the run (src/components/run/PlayScreen.tsx:109). Nothing writes a draft to localStorage, sessionStorage or the URL. The only storage writes in src are finished-run history (src/components/results/ResultsView.tsx:41), panel settings, theme, sound, image style and the last nickname. The results screen, which holds the Daily Submit form, is also component state (src/components/run/PlayScreen.tsx:128), so a reload there loses the token and the chance to submit. The cost of resuming is small, because the whole run is already a compact token of settings, seed and actions (src/components/run/runState.ts:89-96). New run discards the run with no confirmation (src/components/run/PlayScreen.tsx:112-122, src/components/run/DraftBoard.tsx:222), a 32px ghost button in the draft footer. On phones the triggers are common. Chrome Android pull-to-refresh (SA-41), iOS evicting a background tab, an edge swipe back, and the address bar reload. A Daily run can be replayed because the seed is fixed, but the person redraws up to 16 rounds.
- Fix: Write the run token to sessionStorage (or localStorage keyed by seed) after every action and offer Resume on /play, and for the results screen keep the token in the URL or storage until it is submitted. Add a confirm step (or an undo toast) to New run during a draft.
- Acceptance: [1]
- Notes: Product call for Paulo. The engine and tokens are untouched by this proposal, only the client shell stores what runToken already produces.

### SA-09

**Invalid-tap hints and errors render in the top column, off screen when the person is tapping the pitch** (S2, Yellow, needs-browser-proof)

- Evidence: Taps on the pitch call hint() (src/components/run/DraftBoard.tsx:81), for example That slot is taken (src/components/run/DraftBoard.tsx:95) and Choose a player first, then tap a slot (src/components/run/DraftBoard.tsx:109). The message is stored in run.error and shown in a paragraph with role=status inside the side column (src/components/run/DraftBoard.tsx:175-177), above the wheel and the candidates, while the pitch is below them (SA-01). At 390x664 the field top is 818px in the Classic state, so the hint sits near y=330px while the finger is lower down the page. A sighted person sees a tap that does nothing. The hint also stays until the next action (src/components/run/runState.ts:85-87).
- Fix: Show the hint next to the pitch (a toast anchored to the bottom of the viewport or above the field) and keep the role=status live region for screen readers. Clear it after a short timeout.
- Acceptance: [1]
- Notes: The y position is arithmetic from the vertical budget, not measured.

### SA-10

**The Images popover is anchored to its button and can start off screen, where overflow-x: hidden makes it unreachable** (S2, Yellow, needs-browser-proof)

- Evidence: The panel is position: absolute, right: 0, min-width 210px, under a position: relative parent (src/app/globals.css:472-485, src/app/globals.css:444-446). Its left edge is the Images button's right edge minus the panel width, so it depends on where the nav wraps. html and body clip sideways overflow (src/app/globals.css:140-146), so any part left of x=0 cannot be scrolled to. Across 320, 360, 390, 412, 430 and 479px and width factors 1.0 and 1.2 (12 combinations) the estimate puts the left edge below 0 in 7 of 12 (A-contrast.md 9.3 has the table). The select inside inherits 0.9rem (SA-15) and the popover also has no outside-tap or Escape close because it is a native details element (src/components/ImageSettings.tsx:12).
- Fix: Anchor the panel to the viewport on phones (left: 12px, right: 12px, or a sheet) instead of to the button, and close it on outside tap and Escape. Re-measure at 320 to 430px.
- Acceptance: [2, 3]
- Notes: Estimate only. The 12 combinations come from nav-layout.mjs and the answer flips with real text widths.

### SA-11

**Four text styles are under 11px, including the position label on every pitch token** (S2, Yellow, static-only)

- Evidence: Rem sizes times 16 give Pitch slot label (every token on every screen) 10.56px (src/components/pitch/Pitch.module.css:161-170); Picker rating label 9.92px (src/components/builder/Picker.module.css:196-203); Leaderboard column label 10.56px (src/components/leaderboard/Board.module.css:79-87); Records table header 10.88px (src/components/home/SidePanel.module.css:208-215). The brief asks for at least 11px effective for the token name and the position label. The token name is 11.52px (passes) and the rating note 11.2px. The scan of all 109 font-size declarations (work/small-text.mjs) lists 12 under 12px and 4 under 11px. The slot label is white text on a 55 percent black chip (src/components/pitch/Pitch.module.css:161-170), so legibility is helped, but it is small on a phone in sunlight.
- Fix: Raise the four sizes to at least 0.7rem (11.2px), and the slot label to 0.72rem with a little more padding. Check the token label height budget in the dense formations (SA-13) after the change.
- Notes: Text can grow further when the person raises the browser text size, because the sizes are rem (SA-35).

### SA-12

**Inputs and selects are 36 to 40px high, and four controls are under 24px, including Tap to skip** (S2, Yellow, static-only)

- Evidence: Search, generation and nickname inputs have min-height 40px (src/components/builder/Picker.module.css:64-72, src/components/leaderboard/SubmitPanel.module.css:30-42), the Formation select 40px, the Images select 36px (src/app/globals.css:499-506). Four controls are under 24px, the WCAG 2.2 AA minimum. Tap to skip is 20.7px (src/components/wheel/Wheel.module.css:21-32, button at src/components/wheel/Wheel.tsx:144), the Scouting notes summary 19.0px, the Images checkbox row 20.9px and an inline link 20.9px (rows T08, T35, T38, T48 in A-tap-targets.md). Tap to skip is redundant with the whole-wheel skip target while the wheel spins (src/components/wheel/Wheel.tsx:131).
- Fix: Raise inputs and selects to 44px, keeping 16px text. Make Tap to skip a non-interactive hint (the wheel already skips on any tap) or give it a 44px hit area. Give the other three a 44px-high hit area or turn them into full-width rows.
- Acceptance: [3]

### SA-20

**Download image is a blob link click, unproven on iOS, and the Builder's button has no busy or failure state** (S2, Yellow, needs-browser-proof)

- Evidence: downloadCard fetches the PNG, builds an object URL and clicks an a[download] link (src/components/share/download.ts:20-40). On the results page the status text says Image saved right after the click (src/components/results/ShareActions.tsx:34-36), which is shown even where the browser only previews the image or ignores the download attribute (in-app browsers, some iOS versions), so it can overstate. The Builder's Download image button calls it as void downloadCard(...) with no await, try or catch, no busy state and no message (src/components/builder/Builder.tsx:184-186). A failed card request (a 4xx, a 5xx or a dropped mobile connection) is an unhandled promise rejection and the person sees nothing happen. The card render can take a while on a cold function, and a second tap starts a second request.
- Fix: Share the results page's busy and message handling with the Builder, disable the button while busy, and on iOS offer navigator.share with the PNG as a file when canShare allows it, falling back to opening the image in a new tab with a press-and-hold hint.
- Notes: iOS Safari and in-app browser behaviour of a[download] with a blob URL is NOT RUN. The Builder part is settled by the code.

### SA-26

**In the light theme the amber --flood token is used as text and as a UI colour at 1.50 to 2.22:1** (S2, Yellow, needs-browser-proof)

- Evidence: One token, src/app/globals.css:92 (#f2b600), is used for text and boundaries on light surfaces at 1.50 to 2.22:1 against a need of 3 or 4.5, in 21 rows of A-contrast.md section 4.2. It carries the brand word, the rolling label, Tap to skip, round and rank numbers, board and history scores, How to Play numbers, the selected-candidate ring, the switch track, rating bars, the wheel payline and the Picker search focus border (the only focus cue there because the outline is removed, src/components/builder/Picker.module.css:74-78). As a fill under dark text (buttons, tabs) it passes. Totals from the pair table, 195 pairs per theme. Dark has 31 counted failures, light has 74, and most of the light count traces to this one token.
- Fix: Introduce a light-only text token for amber (a dark gold such as the candidates in A-contrast.md 5.1) and use it wherever --flood is text or a boundary on a light surface. Keep #f2b600 for fills.
- Notes: Ratios are computed from parsed tokens, never rendered. The previous QA reports axe color-contrast at 0 violations on the routes it ran (docs/reports/finish-qa.md), which this static result does not reproduce, and the committed axe spec runs the dark scheme only (e2e/a11y.spec.ts, playwright.config.ts colorScheme dark). The difference is unresolved and needs an axe run in the light scheme.

### SA-27

**White labels on 13 of 18 type chips fail 4.5:1, in both themes** (S2, Yellow, static-only)

- Evidence: One rule paints every type chip white (src/app/globals.css:298-311), plus selected Picker filters (src/components/builder/Picker.module.css:99-104). Normal, Flying, Ground, Rock, Bug, Steel, Fire, Water, Grass, Electric, Psychic, Ice and Fairy give 1.50 to 3.15:1 (A-contrast.md section 4, rows TC01 to TC18). The chip colours do not change with the theme, so the numbers are identical in dark and light. The chip appears on the wheel, in candidate and Picker rows, and on results.
- Fix: Choose white or dark ink per chip, whichever gives the higher ratio (A-contrast.md 5.5 has the computed choice for each type), or darken the chip backgrounds.

### SA-28

**--ink-faint is a few hundredths under 4.5:1 on panels in dark, and 3.80 to 4.24:1 in light** (S2, Yellow, static-only)

- Evidence: Dark src/app/globals.css:30 gives 4.77 on the page but 4.39 to 4.45 on --panel and --bg-raised (12 rows). Light src/app/globals.css:88 gives 3.80 on the page and 4.20 to 4.24 on panels (14 rows). It is helper text, table headers, footer text and fit labels (A-contrast.md 4.1 and 4.2).
- Fix: Move the dark token one step lighter and the light token one step darker (A-contrast.md 5.2 has candidates that pass).
- Notes: S2 follows the rubric line for an AA contrast failure, driven by the light theme (3.80 on the page). The dark theme alone is a near miss (4.39 to 4.45) and would be S3.

### SA-29

**White labels on the light-theme grass and the results hero fall between 2.69 and 4.07:1** (S2, Yellow, needs-browser-proof)

- Evidence: Token names are 11.5px bold white on the light grass stripe (src/app/globals.css:89) at 4.07:1 and 3.23:1 on the highlighted band. The results hero kicker, record label and formation pill sit on a gradient that ends in pale green, bracketed between 2.69 and 3.90 (A-contrast.md 4.2, 10 rows, src/components/results/ResultsView.module.css:8-19). Gradient and image backgrounds are listed as not resolvable in section 8.
- Fix: Darken the light grass and hero gradient end, or add a scrim behind the labels. Candidate values are in A-contrast.md 5.4.

### SA-30

**Light --win and --token-weak used as text miss 4.5:1, and --token-weak is never redefined for light** (S2, Yellow, static-only)

- Evidence: Win text is #128a4a at 4.37:1 on the panel (src/app/globals.css:94). The Weak spot tag uses --token-weak, declared once in the dark root (src/app/globals.css:48) and inherited by light at 2.77:1. --loss passes everywhere (4.66 to 5.16). Rows T90, T97, T100 in A-contrast.md.
- Fix: Darken the light --win a step and add a light --token-weak override (A-contrast.md 5.3).

### SA-31

**Input and switch boundaries are 2.0 to 2.5:1, below the 3:1 UI bar, in both themes** (S2, Yellow, static-only)

- Evidence: Inputs, the date field and the off switch track rely on --line-strong over --bg-sunk at 2.32 to 2.48:1 in dark and 2.02 to 2.23:1 in light (src/components/leaderboard/SubmitPanel.module.css:30-42, src/components/builder/Picker.module.css:64-72, src/components/home/SidePanel.module.css:163-172, rows U04, U06, U08). The candidate card edge is 1.70 in light (A-contrast.md 4.1 and 4.2).
- Fix: Strengthen --line-strong for form controls to reach 3:1 against both the page and the panel (A-contrast.md 5.6).
- Notes: The border is the only cue that marks where a field or switch is, which is why this is S2 under the AA contrast line of the rubric.

### SB-06

**A run lives only in React state: reload, a phone browser discarding the tab, or Back mid-draft loses it, and a finished run that was not submitted can never be submitted later** (S2, Yellow, needs-browser-proof)

- Evidence: Run, draft and results state are React useState only (Screen state at src/components/run/PlayScreen.tsx:97). localStorage keeps only settings, theme, history, stats, nickname, image and sound preferences (src/ui/storage.ts); rg finds no pushState, popstate, beforeunload or sessionStorage anywhere in src. So a reload, a swipe-back or a tab discarded by a phone browser returns to the start panel with the draft gone, and 'New run' discards the draft with no confirm (PlayScreen.tsx:112-122; src/components/run/DraftBoard.tsx:219-226). The submit panel renders for the live variant only (src/components/results/ResultsView.tsx:80), while History rows and shared links open /r/<token> as the shared variant (src/components/history/HistoryList.tsx:51; src/components/results/SharedRun.tsx:17), which has no SubmitPanel. A player who finishes a run, closes the tab and returns through History can no longer put it on the leaderboard. The INVALID_BODY copy 'Reload the page and try again' (SubmitPanel.tsx:13) would also destroy the live results screen it is shown on. Hand traced from the source; not exercised in a browser.
- Fix: Persist the in-progress run: after each action write the run token (seed plus actions, the string runToken builds at src/components/run/runState.ts:89-96) to sessionStorage keyed by mode, and offer 'Resume your run' on the start panel, replaying through the existing decode path. Add a confirm (or an undo) to 'New run' while a draft is in progress. Do NOT add a Submit panel to the shared /r/ variant: run tokens are public and the server does not bind a token to a submitter (agent E lead), so anyone with a link could claim someone else's run. Keep submission on the live results screen, resumable from the saved token. Reword INVALID_BODY so it does not tell the player to reload from the results screen, for example 'The leaderboard could not read this submission. Try again in a moment.'
- Notes: Browser proof: start a draft, reload; start a draft, press Back; finish a run, close the tab, reopen via History. On a phone, DevTools 'discard tab' or an app switch with memory pressure. Raise to S1 only if a finished run can be lost before the results screen.

### SC-04

**Light theme --flood fails contrast as text, ring and state colour** (S2, Yellow, static-only)

- Evidence: The file contrast.txt computes these ratios from hex values, not from rendered pixels (rows A1 to A3, F3 and F4 in evidence/static-C/contrast.txt). Light --flood is #f2b600 (src/app/globals.css:92) and the light backgrounds are at :80-86. As text, light --flood scores 1.64 on --bg, 1.82 on --panel and 1.83 on --bg-raised. That fails even the 3 to 1 large-text bar. Dark --flood scores 12.06 to 13.1. Fifteen declarations set text to --flood. The first six are globals.css:383 (brand), src/app/how-to-play/page.module.css:44, src/components/wheel/Wheel.module.css:30 (Tap to skip, 0.72rem), src/components/leaderboard/Board.module.css:49 and :99, and SubmitPanel.module.css:71. The next six are src/components/results/FitReveal.module.css:64 (Out of position, 0.72rem), MatchList.module.css:114 (0.85rem), src/components/run/RoadStrip.module.css:76 (0.8rem), src/components/history/HistoryList.module.css:83, ResultsView.module.css:117 (champion label on the hero gradient, SC-08) and src/components/builder/Picker.module.css:193. The last three are src/components/run/DraftBoard.module.css:89 and :99, and src/components/builder/Builder.module.css:74 (status, 0.85rem). Non-text uses also fall under the 3 to 1 bar in light. The selected candidate border and ring (DraftBoard.module.css:245-251) has no second cue apart from ring thickness. The switch-on track (src/components/home/SidePanel.module.css:185-188) keeps a second cue in the thumb position. The selected leaderboard tab fill (src/components/leaderboard/LeaderboardScreen.module.css:35-38) carries its own text. Fills that use --flood-ink pass in both themes (#1d1600 on #f2b600 is 9.83, fix-candidates.txt).
- Fix: Add a light-theme text variable in src/app/globals.css, for example --flood-text. Set it to var(--flood) in dark and to #7a5600 in both light blocks (:78-103 and :105-132). The value #7a5600 scores 5.96 on --bg, 6.59 on --panel, 6.65 on --bg-raised and 5.46 on --bg-sunk (fix-candidates.txt, from hex values). Move the 15 text declarations above to it and leave --flood for fills. Give the selected candidate a second cue that does not rely on colour, such as a check mark or an ink-colour border. Give its ring a colour that reaches 3 to 1 on the light panel. Pin the pairs in the Vitest contrast test from SC-03.

### SC-05

**--ink-faint text fails 4.5 to 1 contrast on panels in both themes and on the page in light** (S2, Yellow, static-only)

- Evidence: The file contrast.txt computes these ratios from hex values, not from rendered pixels (rows B1 to B3). Dark #6f8577 scores 4.77 on --bg, which passes. It scores 4.44 on --panel and 4.39 on --bg-raised, which fail 4.5. Light #6b8072 scores 3.80 on --bg, 4.20 on --panel and 4.24 on --bg-raised. All three fail. The uses are small text, so the 3 to 1 large-text bar does not apply. The footer (src/app/globals.css:350-357) sits on --bg, so it fails in light only. SidePanel uses the colour for .hint and .fieldLabel at 0.78rem (src/components/home/SidePanel.module.css:66-69, :78-84). It also uses it for .stats thead th at 0.68rem (:208-214) and for the italic .stats .none cell "None yet" (:227-231, SidePanel.tsx:211). SubmitPanel .hint uses it (src/components/leaderboard/SubmitPanel.module.css:44-48). So does Board .label at 0.66rem (Board.module.css:79-87). MatchList uses it for .meterLabel and .below (src/components/results/MatchList.module.css:132-138, :177-181). ResultsView uses it for .pos, .note and .awardEmpty (ResultsView.module.css:259-264, :271-275, :317-320). HistoryList .scoreLabel uses it at 0.7rem (HistoryList.module.css:69-76). Picker .rowFitLabel uses it at 0.62rem (Picker.module.css:196-203). Three of those sizes are under 11px (0.62rem is 9.9px, 0.66rem is 10.6px and 0.68rem is 10.9px). Text size belongs to static-A. Pitch.module.css:232 and RollReveal.module.css:36 use the colour on decorative aria-hidden glyphs, so this list leaves them out.
- Fix: Darken --ink-faint in light and lighten it in dark, so every background it sits on passes 4.5. The file fix-candidates-precise.txt gives computed examples from hex values. Light #5c7164 scores 4.70 on --bg, 5.20 on --panel and 5.25 on --bg-raised. Dark #748a7c scores 5.11 on --bg, 4.75 on --panel and 4.70 on --bg-raised. Edit src/app/globals.css:30, :88 and :116. No selector changes.

### SC-06

**Type chips put white text on 13 type colours that fail 4.5 to 1** (S2, Yellow, static-only)

- Evidence: The file contrast.txt computes these ratios from hex values, not from rendered pixels (section TYPE CHIPS). White #fff on the --type-* fill at 0.75rem bold uppercase (src/app/globals.css:298-311) fails for 13 of 18 types. The failing types are normal 2.48, flying 2.65, ground 1.77, rock 2.58, bug 2.19 and steel 1.97. Seven more fail with fire 2.69, water 3.10, grass 2.08, electric 1.50, psychic 3.15, ice 1.59 and fairy 2.69. The 5 passing types are fighting 5.65, poison 5.58, ghost 5.93, dragon 5.85 and dark 6.69. The text-shadow does not count in the ratio. Both themes use the same fills. Chips render on candidates (src/components/run/DraftBoard.tsx:282-286), picker rows (src/components/builder/Picker.tsx:202-204) and the draft header roll tag (DraftBoard.tsx:138). The pressed picker filter chip repeats the problem (Picker.module.css:99-104, white on the type colour).
- Fix: Give each type an ink variable. The ink #1d1600 reaches at least 5.72 on the 13 failing fills, and psychic is the lowest (fix-candidates.txt). White stays on fighting, poison, ghost, dragon and dark, where #1d1600 would fail. Add --type-ink-<type> beside each --type-<type> in src/app/globals.css. Use it in .type-chip (:298-311) and .typeChip[aria-pressed] (Picker.module.css:99-104). Pin the 18 pairs in a Vitest test.

### SC-07

**Light-theme pitch fails contrast for the focus ring, state rings and names** (S2, Yellow, static-only)

- Evidence: The file contrast.txt computes these ratios from hex values, not from rendered pixels (rows E1 to E7). The light grass stripes are #2f8f4e and #2a8247 (src/app/globals.css:89-90). The global focus ring --focus #0b6bcb scores 1.30 and 1.10 against them, and needs 3 to 1. Pitch.module.css has no :focus-visible rule of its own, and the global rule is globals.css:186-189. So a focused pitch token has no visible ring in light. The drag drop-target ring also uses --focus (Pitch.module.css:135-140), so it scores the same 1.30 and 1.10. The highlight ring and the armed-slot outline in --flood #f2b600 score 2.22 and 2.62 (Pitch.module.css:123-127, src/components/run/DraftBoard.module.css:311-322). The weak-spot ring --token-weak #ff6b5b scores 1.45 on grass-1 in light and 2.97 in dark (Pitch.module.css:129-133). The legend swatch repeats it (src/components/results/ResultsView.module.css:376-377). White pitch token names score 4.07 on grass-1 and 4.79 on grass-2 in light (Pitch.module.css:172-181, color #fff at :79). Names on grass-1 stripes fail 4.5 at 0.72rem bold. The dark text-shadow at Pitch.module.css:180 does not count in the ratio. Dark passes everywhere except the weak ring.
- Fix: Give the pitch its own ring colours. For focus, add a .token:focus-visible .tokenImage rule in src/components/pitch/Pitch.module.css with a two-tone ring. Use a 3px white ring with a 3px #0b1f14 ring outside it. White scores 4.07 and 4.79 on the light stripes and 8.30 and 9.68 on the dark ones. The ink #0b1f14 scores 4.23 and 3.59 on the light stripes (fix-candidates.txt). The dark outer ring separates the white ring from the white chalk lines (--chalk, globals.css:35, drawn by Pitch.module.css:32-42). Use #0b1f14 for the drop ring on light grass. Use #ffe08a for the highlight and armed outline on light grass (3.16 and 3.72). Keep the weak-spot state readable by shape, with a 3px dashed ring, plus the legend and the FitReveal text. The red tones tried (#ff6b5b at 1.45, #7a1a10 at 2.60 and 2.21) stay under 3 to 1 on light grass. For names, put the existing rgba(0,0,0,0.55) pill from .tokenSlot (Pitch.module.css:161-170) behind .tokenName. The other option is to darken light grass-1 to #2b8449 (4.67 with white).

### SC-08

**Results hero sets white text on a gradient that turns pale in light theme** (S2, Yellow, needs-browser-proof)

- Evidence: The rule at src/components/results/ResultsView.module.css:14-19 sets a 160deg gradient from --grass-1 through --grass-2 at 55% to --bg-sunk, with fixed colour #fff (:17). In light, --bg-sunk is #e2ebe4, so the gradient ends pale. The file contrast.txt computes the ratios at the gradient stops from hex values, not from rendered pixels (section HERO). Each light stop lists four values in this order. They are white, the kicker at 0.82 alpha (:46-48), the record label at 0.7 alpha (:89-96) and the --flood champion label (:116-118). Stop 0 gives 4.07, 3.28, 2.80 and 2.22. Stop 30% gives 4.44, 3.55, 3.01 and 2.43. Stop 55% gives 4.79, 3.80, 3.21 and 2.62. Stop 64% gives 3.53, 2.90, 2.54 and 1.93. Stop 100% gives 1.22, 1.17, 1.15 and 1.50. Dark is at least 4.99 everywhere. GUESS. The stop positions rest on an assumed 358 by 230 pixel box (a 390px viewport minus gutters, with a guessed height). So nothing yet shows which stop sits under each text node. The record number is large text (:98-106) and needs only 3 to 1. axe would mark this node incomplete (SC-03), so CI cannot catch it.
- Fix: Use the dark-theme stop colours as literals for the hero in both themes. Replace var(--grass-1), var(--grass-2) 55% and var(--bg-sunk) at ResultsView.module.css:16 with #0f5a32, #0c4f2b at 55% and #050b08. The dark computed minimums on those stops are white 8.30, kicker 6.16, record label 4.99 and --flood 5.75 (contrast.txt, dark HERO rows). All are above 4.5. Confirm with a pixel sample of the real hero at 390 wide in light, before and after.
- Notes: The browser pass should sample the rendered pixels behind the kicker, the record label and the finish label in light at 390 and 320 wide. It should replace the assumed box with the measured hero size.

### SC-10

**Swapping players on the draft screen works only by dragging** (S2, Yellow, static-only)

- Evidence: The code at src/components/pitch/Pitch.tsx:171-211 implements swap with pointer events only. It calls setPointerCapture at :173 and swaps on pointer up at :195-207. A grep finds no onKeyDown, onKeyUp or onKeyPress anywhere in src, and the draft screen has no tap-tap swap. The draft screen tells the player to drag (src/components/run/DraftBoard.tsx:105 and :206) and wires only onSwap to the pitch (:239). Tapping a filled slot shows a hint (:104-107). That fails WCAG 2.5.7 Dragging Movements (AA) and 2.1.1 Keyboard (A) for the swap. Keyboard, switch and voice users have no way to do it. A swap changes the lineup, and the Team Score comes from the lineup, so the swap is a scoring feature, not decoration. The report at docs/reports/finish-qa.md:105 says a whole draft by keyboard alone was not done. The same report says at :84 that no manual drag ran in a real browser. The builder has a non-drag path. Picking a species that is already on the pitch shows a "Swap with SLOT" row (src/components/builder/Picker.tsx:60-66, :207-209). The rule touch-action none sits on the whole .field (Pitch.module.css:29) and on every .token (:81). So a swipe that starts on the pitch cannot scroll the page. Area A owns the scroll check (GATE 4 item 5).
- Fix: Add a tap and keyboard path on the draft screen. When the player activates a filled pitch token without a selected candidate, mark it as the swap source. Set aria-pressed on it and show a status line such as "Pick a second player to swap with GK Pikachu". The next activation of another filled pitch token calls the existing swap action (DraftBoard.tsx:239 already passes onSwap). A second activation of the source clears it. Change the drag-only copy at DraftBoard.tsx:105 and :206 to name both paths. Keep the drag. The engine action stays the same, so the goldens do not change.

### SC-11

**No focus management after screen swaps, rerolls, picks and Try again** (S2, Red, needs-browser-proof)

- Evidence: The only .focus() call in src is the picker search field (src/components/builder/Picker.tsx:56). Everywhere else focus stays with the browser after the focused element unmounts or becomes disabled. Read from code. Start run removes the start screen (src/components/run/PlayScreen.tsx:101-110, :177-198). See results swaps to ResultsView and calls scrollTo (:124-133). New run swaps back (:112-122). The pressed button leaves the page in all three. The new h1 gets no focus and no live announcement. Start run and See results only set state, so Next 16.4 has no route change to announce. The docs describe a route announcer for client-side transitions (node_modules/next/dist/docs/03-architecture/accessibility.md:12-14). New run also calls router.replace when the URL carries a seed (PlayScreen.tsx:116-119). This audit did not read or test the announcer behaviour for a replace that changes only the query string. The reroll buttons set disabled={remaining <= 0 || !revealed} (DraftBoard.tsx:158). So the pressed reroll button turns disabled during the next reveal. Tap to skip unmounts when the wheel settles (src/components/wheel/Wheel.tsx:135-146). In the builder, the cascade disables Randomize, Clear all and Reset (Builder.tsx:167-180). The code at SubmitPanel.tsx:104 disables the Submit button while a submission is in flight. In Position First, a candidate pick removes the candidate list (DraftBoard.tsx:193-202). The flow also runs against DOM order. The player activates a pitch token, which comes last in the DOM. The candidates then render earlier in the DOM, and focus does not move to them. The Board Try again button unmounts on click (src/components/leaderboard/Board.tsx:41-50). The submit form gives way to the success section (SubmitPanel.tsx:60-80). On the home page, Play a friendly cup swaps the whole builder for the results view (Builder.tsx:111-115, src/components/home/HomeScreen.tsx:78-91). The round h1 changes are not live (DraftBoard.tsx:126-128).
- Fix: Add a small focus move at each screen swap. In PlayScreen.tsx, focus the new screen's h1 after Start run, See results and New run (give it tabIndex -1). In DraftBoard.tsx, replace disabled on the reroll buttons with aria-disabled and a guarded handler, so focus stays on the pressed button. Move focus to the round h1 after a Position First pick. In Board.tsx, focus the loading status after Try again. In SubmitPanel.tsx, focus the success text or the View leaderboard link after submit success. Prove each with document.activeElement in the browser pass.
- Notes: INFERRED from the HTML standard and not run. After the focused node leaves the page, the next Tab starts from the nearest remaining position in the document. Other browsers and screen readers were not run. Record document.activeElement and the next Tab target after each action in Chromium and WebKit. Tier is Red because the fix edits Board.tsx and SubmitPanel.tsx under src/components/leaderboard, and the tier list names leaderboard. The change is focus and markup only, with no API, payload or ranking change. The PlayScreen.tsx and DraftBoard.tsx edits alone are Yellow.

### SC-12

**Picker pick and clear unmount an open dialog, which skips the focus return** (S2, Yellow, needs-browser-proof)

- Evidence: The handlers at src/components/builder/Builder.tsx:214-221 handle onPick and onClear by calling onChange and then setPicking(null). That unmounts the Picker (Builder.tsx:208-224) while its native dialog is still open. Only close() restores focus to the opener. INFERRED from the HTML standard and not browser-tested. Removing an open dialog does not run that step. Escape, the Close button and a backdrop click all end in the dialog's own close (src/components/builder/Picker.tsx:97-100, :119). That path returns focus to the opener under the HTML standard. Each pick is one of 16 builder fills, so a keyboard or screen reader user can lose their place up to 16 times per lineup.
- Fix: In src/components/builder/Picker.tsx call ref.current?.close() before onPick and onClear in the row handler (:195) and the Clear slot handler (:112). Let the existing onClose unmount the dialog as it does for Escape. The close() call restores focus to the pitch token for the slot that opened the picker. Assert document.activeElement is that pitch token after a pick, a clear, Escape and Close.

### SC-13

**Live regions are inserted with their text or swapped out, so announcements can drop** (S2, Red, needs-browser-proof)

- Evidence: Live region inventory from grep, 11 sites. None sets aria-atomic or aria-relevant. INFERRED from the ARIA live region rules, with no screen reader run. A region that exists before its text changes announces the change. A region inserted together with its text can stay silent. Two regions mount empty and fill later. They are src/components/builder/Builder.tsx:191 and src/components/results/ShareActions.tsx:59. RollReveal.tsx:74 mounts empty in animated mode, and its line stays empty until the last wheel stage settles (src/components/wheel/RollReveal.tsx:44-45). In reduced-motion mode RollReveal.tsx:74 mounts with text, because instant makes the line non-empty on the first render (:28, :44-45). The whole RollReveal component also remounts for every roll through the key in DraftBoard.tsx:180-187. Four more regions mount with their text or render only while text exists. DraftBoard.tsx:174-178 holds hints and errors in a role status that renders only while text exists. SubmitPanel.tsx:60-80 inserts the success status together with its text and replaces the form that held focus. Board.tsx:33-39 inserts the loading status with its text, then swaps it for the list or an alert. Picker.tsx:175 starts with text, so only later changes announce, one per keystroke while typing. The same hint twice in a row is the same string. That causes no DOM change and stays silent the second time. Three role alert regions follow the standard alert pattern (SubmitPanel.tsx:112-116, Board.tsx:41-50 and gate/page.tsx:54-58). The gate alert comes in the server HTML after a redirect, so it relies on the page read. DraftBoard.tsx:129 sets aria-live off on the round prompt and the roll tags. The report at docs/reports/finish-qa.md:109 reports the same announcement text with and without motion. That compares text. It does not show what a screen reader speaks. The same report says at :111 that the role alert on submit and gate errors was not exercised in a browser.
- Fix: Use one always-mounted, visually hidden role status region per screen, and write short strings into it. On the draft screen, mount it in DraftBoard outside RollReveal. Move the wheel line from RollReveal.tsx:74 and the hints and errors from DraftBoard.tsx:174-178 into it. On results, mount the region once in ResultsView and let SubmitPanel write its success line into it instead of inserting a new status. On the board, mount the loading and count status once in LeaderboardScreen. Write "Loading the board" and then the entry count into it. A repeated identical hint stays silent by design. Vary the text if a repeat must be read. In the browser pass, check that the region node exists before its text changes. Then check by hand with NVDA, JAWS, VoiceOver and TalkBack, because Playwright cannot hear output.
- Notes: Tier is Red because the fix edits SubmitPanel.tsx, Board.tsx and LeaderboardScreen.tsx under src/components/leaderboard, and the tier list names leaderboard. The change is markup only, with no API, payload or ranking change. The DraftBoard and ResultsView parts are Yellow.

### SC-14

**Draft and builder outcomes are silent for screen readers** (S2, Yellow, static-only)

- Evidence: Read from code. On the draft screen the round heading is a plain h1 (src/components/run/DraftBoard.tsx:126-128). The prompt and roll tags sit in aria-live off (:129-149). A pick gives no message. The draft-complete panel (:204-216) and the results screen (src/components/results/ResultsView.tsx:47-77) give none either. Only the wheel line (RollReveal.tsx:74-76) and the hints (DraftBoard.tsx:174-178) reach a screen reader. In the builder, Randomize, Clear all, Reset, a picker pick and the Team Score appearing are silent (src/components/builder/Builder.tsx:90-100, :167-180, :214-221, :136-150). Only Copy link uses the status region (:84-88, :102-109). On the leaderboard, switching tab, mode or date shows a loading status and then replaces the list without saying how many entries arrived (src/components/leaderboard/LeaderboardScreen.tsx:24, Board.tsx:33-39). The only cue a screen reader user gets after a pick is that the pitch token's name changes (src/components/pitch/Pitch.tsx:142). By then the focused element can be gone (SC-11).
- Fix: Feed the single status region from SC-13 with deterministic strings built from existing state and labels. On the draft screen, say "Round 4 of 16" on advance and "Signed Pikachu at ST" on a pick. At the end, say "Draft complete, 16 of 16 signed". Say "Team Score 82, record 6-1-1" when results mount. In the builder, say "Randomized, Team Score 82" and "Cleared all slots". On the board, say "12 entries" or "No entries". Every string comes from state the screen already holds. No new data.

### SC-36

**Light-theme win and weak-spot text fail 4.5 to 1 contrast on panels** (S2, Yellow, static-only)

- Evidence: The file contrast.txt computes these ratios from hex values, not from rendered pixels (rows D1 and D3). Light --token-weak is #ff6b5b, the same value as dark, because the light blocks do not override it (src/app/globals.css:48). It scores 2.77 on --panel. FitReveal sets the Weak spot tag in that colour at 0.72rem bold (src/components/results/FitReveal.module.css:55, :68). Light --win is #128a4a (globals.css:94 and :122). It scores 4.37 on --panel and 3.95 on --bg. Text uses it in two places. FitReveal sets .plus from --win (FitReveal.module.css:95), and the text inherits 0.78rem from .tags (:84). MatchList sets the W outcome through --accent at 0.85rem bold (src/components/results/MatchList.module.css:24, :65-73). Light --loss (5.16) and --draw (5.60) pass on --panel. Dark passes all four colours (rows D1 to D4, from 6.29 to 11.25).
- Fix: Darken --win in both light blocks of src/app/globals.css (:94 and :122) to #0f7a41. It scores 5.37 on --panel and 4.85 on --bg (fix-candidates.txt, from hex values). Add a --token-weak-text variable that equals --token-weak in dark and #c8372a in light (5.16 on --panel, 4.66 on --bg), and use it at FitReveal.module.css:68. Keep --token-weak for rings and fills. The ring fix belongs to SC-07.

### SD-01

**1.33 MB data chunk (243,173 B wire) loads eagerly on interaction-gated routes /, /play and /daily** (S2, Red, needs-browser-proof)

- Evidence: Chunk 39hn4ynhlg-o0.js holds pokedex.json 484,204 B, scouting.json 802,168 B and engine code 40,953 B. It is 55.8% of / first-load wire (435,668 B). Baseline Lighthouse (single run, local, simulated) LCP 2,782 ms against 81 ms observed. Lantern keeps every non-low-priority node (LargestContentfulPaint.js:19,34,44,51-54), and 532,577 B at 1,474.56 kbps is 2.89 s. Without the chunk the sum is a 1.59 s floor (inferred). Module work in Node 22 is 35.8 ms, about 143 ms at 4x (inferred). See D-bundle-map.md sections 4, 6, 7 and D-lcp-hypotheses.md H1, H2.
- Fix: Split in order. A1 (SD-02) first with an import-graph guard. Run H1 and H2. If the gain holds, A2 (move ROLE_LINE and asSpeciesId out of species.ts), then B (lazy engine at the Start, Picker, randomize and ?b= seams with a pending state). Consider C (runtime projection, chunk to about 105,744 B wire, removes browser zod parses) after B. D (tuple form) last. Must keep goldens unchanged, check:client-bundle green, and a pending state so Start and the Picker are never dead taps. Demote to S3 if H1 shows under 300 ms applied gain and H2 under 100 ms at 4x.
- Acceptance: [1, 4]
- Notes: Touches engine and data loading (frozen paths only for A2 and C). Header Link prefetch also lists this chunk for /, /daily and /history (SD-08), so A1 alone does not stop a low priority pull.

### SE-02

**Submit is not idempotent for the same (token, nickname): a retry after a lost response returns an error and spends an hourly attempt** (S2, Red, static-only)

- Evidence: Trace: handlers.ts:113-121 (limiter counts every attempt), :159-164 and store.ts:57-69 (token probe first, then daily-slot probe), :189 conflictError. A retry of an accepted run gets 409 DUPLICATE_TOKEN (sequential) or, for a concurrent daily loser, most likely 409 DAILY_ALREADY_SUBMITTED because daily_nickname_uq was created before token_uq (index order inferred). Neither makes a second row. Client: SubmitPanel.tsx:12-30 copy ('That nickname already has a run on this daily board' for a retry of the player's own run), :51 guard; client.ts:110-138 shows the error and never fetches the saved entry. A mobile connection that drops after the server commits leaves the player with NETWORK or a 409 and no rank.
- Fix: Make the server return the existing entry when the stored row has the same nickname: change store.conflictFor to return the matching row (select all columns by md5(token)), and in handleSubmit return 200 with { entry: toBoardEntry(row, rank) } when row.nickname equals the submitted nickname; apply the same re-select in store.insert on a 23505 race. Different nickname still gets 409. The body shape (SubmitOk) is unchanged and client.ts uses res.ok, so no contract change; document status 200 for a replay. Retries still spend an attempt unless the limiter is moved after the probe.
- Notes: Dispatch contract: a double tap must not create two rows or burn the daily slot by mistake. At the database level it does not (unique indexes), so that part is refuted; the cost is the confusing error and a hidden saved result. A same-device double tap is likely already blocked by React flushing the discrete event, see SE-19 for the browser proof.

### SF-01

**No phone profile, touch input or WebKit exists in any test or CI job, and the GATE 4 mobile spec is absent** (S2, Yellow, static-only)

- Evidence: A grep over `e2e`, `e2e-live`, both Playwright configs and `.github/workflows/ci.yml` at 928e4b1 finds no `hasTouch`, `isMobile`, `touchscreen`, `.tap(`, `webkit`, `iPhone` or `Pixel`. Both configs define one project, `devices['Desktop Chrome']` (`playwright.config.ts:17`, `playwright.live.config.ts:15`). The e2e job installs Chromium only (`.github/workflows/ci.yml:59`). The one narrow-viewport test, `e2e/leaderboard.spec.ts:112-133`, resizes a Desktop Chrome window to 390 px with `setViewportSize` (`:116`), so it has a mouse, DPR 1, no safe area and no on-screen keyboard. `e2e/mobile-acceptance.spec.ts` does not exist at this commit. Static grep, single pass.
- Fix: Add `e2e/mobile-acceptance.spec.ts` with one test per GATE 4 assertion 1 to 7 (mapping in `F-notrun-plan.md` section 4). In `playwright.config.ts` add projects `iphone-14` (WebKit), `iphone-se` (WebKit), `pixel-7` (Chromium) and a landscape iPhone 14 project, each with `testMatch: /mobile-acceptance/`, and give the existing `chromium` project `testIgnore: /mobile-acceptance/` so the 24 existing tests do not run four more times. Change `.github/workflows/ci.yml:59` to `pnpm exec playwright install --with-deps chromium webkit` and cache `~/.cache/ms-playwright`. Run the same spec against production through `playwright.live.config.ts` with a mobile project added there.
- Acceptance: [1, 2, 3, 4, 5, 6, 7]
- Notes: WebKit install time and run time on ubuntu-latest are not measured. Touch drag needs CDP `Input.dispatchTouchEvent` on Chromium and dispatched pointer events on WebKit. Playwright documents that supported permissions differ between browsers (`node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core/types/types.d.ts:10339-10340`), so the clipboard grants in `e2e/challenge.spec.ts:6` and `e2e/images.spec.ts:7` may not work on WebKit. That is unverified, and a WebKit project may need a stubbed `navigator.clipboard` for Copy link. The ci-flake agent's F-flake-report.md reads the same single-project setup.

### SF-02

**Touch drag-swap is tested only in jsdom with faked hit-testing, and a touch drag may leave the next tap swallowed** (S2, Yellow, needs-browser-proof)

- Evidence: The only drag test is `src/components/builder/__tests__/Builder.test.tsx:68-80`. It replaces `document.elementFromPoint` (`:72`, never restored), stubs `setPointerCapture` (`:18`) and shims `PointerEvent` (`:19-28`). Its events carry no `pointerType`, so the touch path is not told apart from the mouse path. `docs/reports/finish-qa.md:84,178` records that no drag, mouse or touch, ran in a real browser. Code lead from a static read of `src/components/pitch/Pitch.tsx`. `onPointerUp` sets `suppressClick.current = true` when the token moved (`:195-198`) and only `onClick` clears it (`:164-170`). A mouse drag still fires a click on the pointer-captured token, which clears the flag. A touch drag that passes the browser tap slop fires no click, so the flag would stay true and swallow the next real tap on any token. That click rule is my inference from the Pointer Events model and nobody observed it here. `touch-action: none` sits on the pitch and on every token (`src/components/pitch/Pitch.module.css:29,81`), so a page scroll cannot start on the pitch.
- Fix: In `e2e/mobile-acceptance.spec.ts` add a Chromium test that drags with CDP `Input.dispatchTouchEvent` (touchStart, touchMove steps past 6 px, touchEnd) between two filled tokens, asserts the two `aria-label`s swapped, then taps an empty slot once and asserts the picker `dialog` is open. Repeat on WebKit with dispatched pointer events and say so in the test title. In `Builder.test.tsx` restore `document.elementFromPoint` in `afterEach`. If the first tap after a drag is swallowed, clear `suppressClick` on `pointercancel` and on a short timer after `pointerup`. That code change belongs to the UI lane, not to this audit.
- Acceptance: [5]
- Notes: A browser-free probe exists. In jsdom `fireEvent.pointerUp` is never followed by a click, which matches the touch-drag case. After the existing drag test, a `fireEvent.click` on an empty slot would show whether the flag swallows it. This lane runs no suites, so the probe is listed in F-notrun-plan.md as NOT RUN. The jsdom result would still need a real touch device to confirm the browser's click rule. In the draft, drag is the only swap path (`src/components/run/DraftBoard.tsx:105,206`). A tap on a filled slot shows a hint or does nothing, and `src/components/pitch/Pitch.tsx` has no key handler, so a failed touch drag leaves a phone player without a way to reorder the squad and a keyboard user has none either. Whether that meets the single-pointer alternative to dragging (WCAG 2.5.7) is a question for the accessibility lane.

### SX-01

**The site footer shifts when the page content streams in: CLS 0.211 on /r/<token> and 0.046 on /daily on production, every run** (S2, Yellow, reproduced)

- Evidence: GitHub-hosted Lighthouse 13.5.0 mobile preset on production 928e4b1 (run 38091674824, branch ci/lh-baseline-928e4b1, 3 runs per route): /r/<token> CLS 0.2114 in 3 of 3 runs, /daily 0.0460 in 3 of 3, the kanto151 start 0.028 in 1 of 3. The layout-shifts audit names one element in each: `body > footer.site-footer`. The same values appear on the local build in the same runner. The local Mac baseline saw the /r/ value as a lead only.
- Fix: Reserve the height of the streamed main content (a min-height on the route's main or the Suspense fallback sized like the content) so the footer does not move, or keep the footer out of the first viewport until content lands. Prove with Lighthouse CLS 0.000 on CI for /r/<token>, /daily and the kanto151 start.
- Acceptance: Lighthouse CLS 0.000 in 3 of 3 CI runs on /r/<token>, /daily and /play?mode=kanto151
- Notes: Added by the lane owner from the CI baseline, after the six area audits.

### SB-01

**How to Play and the results page still say the ladder gets hard from the quarter-final (stale since the engine 3 ladder)** (S2, Yellow, confirmed)

- Evidence: src/app/how-to-play/page.tsx:38 says 'Opponents get stronger every round, and the ladder gets hard from the quarter-final on.' and src/components/results/ResultsView.tsx:192-196 (the 'Season details: how grading works' block shown on every results page) says 'the ladder gets hard from the quarter-final'. Engine 3 (pokedraft-engine-3) climbs 280/300/355/480/605/730/855/980, a steady +125 a round from the Round of 32 (src/engine/coefficients.ts:117-121). The 'cliff before the quarter-final' (360/480/760) was the engine 2 ladder (src/engine/versions/v2/src/engine/coefficients.ts:100-104). STATE.md:26 and docs/calibration.md:143 call the new shape 'an even knockout climb'. The Road to the Final caption was already corrected (src/components/run/RoadStrip.tsx:45-48, pinned by src/components/run/__tests__/RoadStrip.test.tsx:19-23); these two sentences were missed. Confirmed on production: a GET of /how-to-play on 2026-10-10 returned the stale sentence. Claims row C30; terminology T34.
- Fix: Copy only. Reword both places, for example 'Opponents get stronger every round. The group stage is gentle, the climb is steady from the Round of 32, and the Final is the hardest test.' Keep one shared string (or one copy test that fails when either file contains 'hard from the quarter-final') so the two cannot drift again. Do it in the dispatch 7 carryover #1 and #2 Yellow PR, because that PR rewrites the same paragraphs (RoadStrip wiring, card ratings copy). No engine change; goldens unchanged.
- Notes: Test idea: render HowToPlayPage and ResultsView and assert neither text matches /hard from the quarter-final/; RoadStrip.test.tsx:19-23 is the pattern to copy.

### SB-02

**How to Play says Open and Classic are 'tracked separately', but the leaderboard ranks them together** (S2, Yellow, static-only)

- Evidence: src/app/how-to-play/page.tsx:21 ends 'Open is easier than Classic, so they are tracked separately.' That is true only for the local Your records buckets cup8:open and cup8:classic3 (src/ui/runs.ts:12-21). The server board key is the mode, plus the date on the daily board (src/leaderboard/server/store.ts:23-27), ordered by wins, draws, Team Score, earliest submission, id (src/leaderboard/server/store.ts:29), top 50 (src/leaderboard/contract.ts:10). So the all-time 8-0 board mixes Open and Classic runs and only prints the style on each row (src/components/leaderboard/format.ts:14-24, used at src/components/leaderboard/Board.tsx:76). The board caption says only '8-0 Challenge, all-time.' plus the ordering (src/components/leaderboard/LeaderboardScreen.tsx:74-79), so an easier Open 6-1-1 ranks beside a Classic 6-1-1 with no warning. Claims row C17; terminology T16. docs/decisions/dispatch-4.md:63 records the ordering and no decision to split styles.
- Fix: Copy only. Replace the sentence with 'Open is easier than Classic. Your own records keep them apart, but the leaderboard ranks them together and shows the style on each row.' and add 'Open and Classic share this board.' to the all-time caption (LeaderboardScreen.tsx:77). Separate Open and Classic boards would be a Red product change (boardFilter, contract, tabs); it is not proposed here.

### SB-03

**How to Play promises 'any Pokémon', but the builder hides Legendary and Mythical by default and challenge squads cap them at 3** (S2, Yellow, static-only)

- Evidence: src/app/how-to-play/page.tsx:12 says 'with any Pokémon you like' and :21 says 'In Open you can take any Pokémon that matches the roll'. The builder pool is the selected generations (inPool, src/engine/draft.ts:123-125) with no Legendary or Mythical unless settings.legendaries is on (draft.ts:129-133), and the panel default is legendaries off (src/ui/settings.ts:22-29). Challenge modes allow special species only until 3 are on the squad (SPECIAL_CAP = 3, src/engine/types.ts:129; draft.ts:129-133). 94 of 1025 species are special (71 Legendary + 23 Mythical, counted with jq over src/data/pokedex.json). Searching for one in the builder Picker, for example Mewtwo (id 150, Gen 1, Legendary), traces to the bare line 'No matches' (src/components/builder/Picker.tsx:176-177, pool built at :69-82) with no hint that a setting hides it (traced, not run in a browser). Claims rows C06 and C14; Table 2 N01 and N02; terminology T17 and T18.
- Fix: Copy: src/app/how-to-play/page.tsx:12 -> 'with any Pokémon from the generations you switch on. Legendary and Mythical Pokémon stay out until you turn on Legendaries in Settings and records.'; src/app/how-to-play/page.tsx:21 -> add 'A squad can hold at most 3 Legendary or Mythical Pokémon; after the third they stop appearing in rolls.' Picker.tsx:176-181: when the search text matches a species outside the pool, say why ('Hidden by your Generations or Legendaries setting') instead of a bare 'No matches', and add a Picker test. No engine change.

### SB-04

**RATE_LIMITED copy says 'Wait a minute', but the lockout is up to an hour** (S2, Yellow, static-only)

- Evidence: src/components/leaderboard/SubmitPanel.tsx:26 shows 'Too many submissions from here. Wait a minute and try again.' The rule is 10 submissions per rolling 3,600,000 ms (src/leaderboard/server/handlers.ts:27) and the 429 carries retry-after: 3600 with 'Ten submissions per hour. Try again later.' (handlers.ts:114-117). The limiter records only allowed attempts (src/ratelimit/store.ts:13-15), so the window frees up when the oldest of the last 10 allowed attempts is an hour old. A player who retries after a minute is refused again with no hint why. The client reads only the error code, never retry-after (src/components/leaderboard/client.ts:133-137). For agent E: the counter is consumed before the body is parsed (handlers.ts:114 runs before readJson at :125), so submissions that then fail validation (blocked nickname, wrong engine) still burn one of the 10, and everyone behind one NAT shares the 10. STATE.md:18 says 'every attempt counted'; the store counts allowed attempts only. Terminology section 15a.
- Fix: Copy: 'Too many submissions from this network. Try again in about an hour.' If the client should be exact, have submitRun return the retry-after value (src/components/leaderboard/client.ts:133-137) and print 'Try again in N minutes'. Optional, Red, for agent E: consume the budget only after the body validates, or count only requests that reach the replay step, so a typo does not cost one of ten.

### SB-05

**Builder 'Download image' has no busy, success or failure feedback, and a failed download is an unhandled rejection** (S2, Yellow, static-only)

- Evidence: src/components/builder/Builder.tsx:181-187 wires the button to onClick={() => void downloadCard({ b: token }, 'pokedraft-lineup.png')}: no busy state, no status message and no catch. downloadCard throws on a non-OK response or a body that is not a PNG (src/components/share/download.ts:25-28). The card is drawn server-side per request (src/app/card/route.tsx:7-24), so a slow or failed render leaves the player with a button that did nothing, and the rejection is unhandled. The results page has the full pattern: busy ('Preparing image'), 'Image saved' and 'Download failed' in a role=status region (src/components/results/ShareActions.tsx:31-39, 59-61). The builder already has a status paragraph (Builder.tsx:191-193) that Copy link uses (Builder.tsx:102-109). Terminology T27.
- Fix: Reuse the ShareActions pattern in Builder.tsx: write 'Preparing image' to the existing status line while the fetch runs, then 'Image saved' or 'Download failed. Try again.', and disable the button while busy. Extract the busy/saved/failed handling into one small hook shared by Builder.tsx and ShareActions.tsx, and add a component test with a rejected fetch.
- Notes: Lead for the browser and mobile agents (not tested): download.ts:38 revokes the object URL with setTimeout(0) right after the click; WebKit (every iOS browser) and some Firefox versions may need a longer delay, for example 10 seconds.

### SB-07

**How to Play says a region reroll gives 'a new region and a new type'; the type can repeat** (S2, Yellow, static-only)

- Evidence: src/app/how-to-play/page.tsx:22 says 'reroll the region to get a new region and a new type'. A region reroll excludes only the old region (src/engine/draft.ts:203) and draws the type with no exclusion because keep is null (draft.ts:154-157), so the new region is guaranteed different but the type can be the same (for example Water, then Water). A type reroll keeps the region and excludes the old type (draft.ts:195-202). docs/fairness.md:30 words it correctly ('the region (then a fresh type)'); docs/decisions/dispatch-3.md:74 ('so both values change') shares the overstatement. Claims row C20.
- Fix: Copy: 'Reroll the type to keep the region, or reroll the region to get a different region and a fresh type roll.' Fix docs/decisions/dispatch-3.md:74 the next time that file is touched (docs only).
- Notes: Lowest S2: the sentence is wrong only about the type, and the player loses nothing by it. Listed S2 because the brief counts a wrong How to Play sentence as S2.

### SB-26

**Draft-board swap is pointer-only: keyboard and screen-reader users cannot swap players, and tapping a filled slot after the draft does nothing** (S2, Yellow, static-only)

- Evidence: The draft screen tells the player to 'Drag players to swap them before kick-off.' (src/components/run/DraftBoard.tsx:206) and 'Drag one player onto another to swap them.' (DraftBoard.tsx:105). The only swap path is src/components/pitch/Pitch.tsx:195-207, where onSwap fires from onPointerUp after a pointer drag past DRAG_THRESHOLD = 6 (Pitch.tsx:102, 184-194). tapSlot returns silently for a filled slot once the draft is complete (DraftBoard.tsx:99, choosing is null), the slot buttons' click handler only calls onSlotTap (Pitch.tsx:164-170), and rg finds no keydown, onKeyDown or accesskey anywhere in src. So Enter or Space on a token cannot swap. The builder has a keyboard-reachable swap through the Picker's 'Swap with X' rows (src/components/builder/Picker.tsx:207-209), so the capability exists but not on the draft board. A swap changes which player covers which slot and therefore Team Score, so a keyboard-only player is locked out of a step the screen asks them to do. Touch drag works on phones (touch-action: none, Pitch.module.css:81), so this is not phone-specific. Cross-reference agent C.
- Fix: Add a tap-then-tap (or Enter/Space) swap to tapSlot: first activation of a filled slot after the draft selects it ('Swap Pikachu with...'), the second activation on another filled slot calls onSwap, Escape cancels. Update the copy to 'Drag, or tap one player and then another, to swap them.' (DraftBoard.tsx:105, 206) and the pinned hint in src/components/run/__tests__/run.test.tsx:68; add tests for select, swap and cancel. No engine change (the swap action exists).

### SC-01

**CI axe suite runs 1 rule, not the 89 its tags select** (S2, Yellow, confirmed)

- Evidence: The spec at e2e/a11y.spec.ts:22-26 chains .withTags() with five tags and then .withRules(["label-content-name-mismatch"]). In @axe-core/playwright 4.13.0 both methods assign this.option.runOnly. Each JSDoc says not to combine the method with the other (node_modules/@axe-core/playwright/dist/index.js:170-203). MEASURED with no browser. The real builder methods, run against a stub page, leave the option as {"runOnly":{"type":"rule","values":["label-content-name-mismatch"]}}. The script is evidence/static-C/axe-builder-option.cjs and its output is axe-builder-option.txt. axe-core 4.13.0 checks runOnly.type === 'rule' before any tag match (ruleShouldRun, axe.js:20569-20583). So only that one experimental rule runs. INFERRED with no browser. Emulating the axe tag match over the rule metadata gives 89 rules for the five tags (axe-rule-count.txt). The spec adds one experimental rule on top, so it means to run 90. Today 1 runs. The file axe-rules.txt prints 99 because it counts raw tag matches. axe drops 3 deprecated and 7 experimental rules by default (axe-drop-split.txt), which leaves 89. So color-contrast, label, button-name, the aria rules, region, the landmark rules, heading-order, scrollable-region-focusable and nested-interactive never run in CI. The report at docs/reports/finish-qa.md:110 says heading-order is on in this spec, and :113 lists the tag set as running. The same report shows at :77 that the every-rule pass came from a throwaway viewport script, not from this spec.
- Fix: Replace e2e/a11y.spec.ts:22-26 with one .options() call. Set runOnly to type tag with the values wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice. Set rules to enable label-content-name-mismatch. The exact object is the proposed option line in axe-builder-option.txt. axe reads rules[id].enabled before the tag match, so the experimental rule stays on. The wcag22aa tag adds target-size. The same emulation gives 91 rules. Assert that the four result lists (passes, violations, incomplete and inapplicable) together name color-contrast and target-size. Then a later option edit cannot shrink the run unseen. Expect the first run to fail. Triage each rule in the browser pass before the gate goes red in CI.
- Notes: The browser pass should print the passes, violations, incomplete and inapplicable counts for the current spec and for the fixed option. That turns the emulated 1 and 89 into measured numbers. The report at docs/reports/finish-qa.md:118 credits this spec with one defect, label-content-name-mismatch on 16 nodes. That is the one rule that runs.

### SC-09

**Focus ring replaced or weakened on armed slots and picker fields** (S2, Yellow, static-only)

- Evidence: On armed slots, src/components/run/DraftBoard.module.css:311-322 sets a 2px dashed --flood outline, a 2px offset and a pulse. It applies to every empty pitch token while the draft waits for a slot. That selector has specificity (0,4,0). The global focus ring has (0,1,0) (src/app/globals.css:186-189). So a focused empty pitch token shows the same dashed outline as every other armed pitch token. The keyboard user cannot see which armed slot has focus. The outline also pulses to transparent at the midpoint of each 1.4s cycle (DraftBoard.module.css:318-322). On picker fields, src/components/builder/Picker.module.css:74-78 removes the outline on the search input and the gen select. It swaps in a 1px --flood border. The file contrast.txt (rows F3 and F4, from hex values, not rendered pixels) gives light --flood 1.50 on --bg-sunk and 1.83 on --bg-raised. Dark gives 13.75 and 12.06. The search input takes focus when the picker opens (Picker.tsx:56). So in light, the first field a keyboard user lands on has no usable focus cue. The unfocused border (--line-strong over --bg-sunk) scores 2.62 dark and 1.84 light against the field fill (row F5). That is under 3 to 1 for a control boundary. Other bordered controls use the same variable and were not computed.
- Fix: For armed slots, keep the armed marker and give the focused pitch token a different, steady ring. After the armed rule in DraftBoard.module.css add .pitch[data-armed] [data-testid^="slot-"]:focus-visible with outline 3px solid #fff, outline-offset 3px and animation none. White scores 4.07 and 4.79 on the light stripes (fix-candidates.txt). The two-tone ring from SC-07 works here too. For picker fields, delete outline none at Picker.module.css:77 so the global ring applies. The --focus colour scores 4.33 on --bg-sunk and 5.28 on --bg-raised in light, and 10.58 and 9.28 in dark. Keep the --flood border as a second cue. Raise the unfocused border to 3 to 1 against the field fill.

### SE-01

**The same run can be listed more than once: the duplicate guard keys on the exact token string, and the decoder accepts many encodings of one run** (S2, Red, static-only)

- Evidence: drizzle/0000_leaderboard_entries.sql:23 (unique index on md5(token)); handlers.ts:160,181 and store.ts:57-61,73 use the token exactly as posted; engine/token.ts:43-61 (strict base64url), :98 (gens regex allows any order), :118-122 (payload fields z.unknown), :207-213 (lenient JSON.parse), :232-247. Measured with the real engine (E-work/token-variants-node22.txt, identical on Node 24.18.0): one 403-char, 16-action run replays to 1-0-2 score 355 in six encodings with six different md5 prefixes: V0 canonical cccd3847d2dc, V1 JSON spaces 5acab983ac84, V2 gens 213456789 c4ce6833fa4e, V3 species 25.0 4d859d4092f3, V4 two cancelling swaps 243f005f1ed5, V5 one no-op swap 2397041d15b4. V1 to V3 are not canonical; V4 and V5 are canonical encodings of different action lists. engine/replay.ts:19 shows the cup result depends only on (full lineup, seed, mode). Random byte fuzz (40,000 mutations) found none, so this needs a deliberate re-encode.
- Fix: Stage 1, no migration: in handleSubmit after decodeToken, set canonical = encodeToken(run) and use it for conflictFor, insert and storage (or reject non-canonical with TOKEN_MALFORMED). This closes V1 to V3. Stage 2, migration 0003 (E-query-map section 9): nullable run_fingerprint = sha256 of [engineVersion, mode, seed, starters, bench] from replay(run).draft.lineup, partial unique index, map its violation to DUPLICATE_TOKEN, backfill by replaying stored tokens and reporting collisions for db:delete-entry. Do NOT reject cancelling swaps: DraftBoard.tsx:239 emits legitimate swap-and-swap-back runs. No response contract change.
- Notes: By the rubric text 'a duplicate or lost leaderboard row' this is borderline S1. Held at S2 because it needs a hand-built token, the 10 per hour per address limit still applies, and no honest player hits it. Dispatch 4 (dispatch-4.md:61) added the index so one run cannot fill the all-time board under many names. Trade-offs of Stage 2: two independent players with an identical lineup on the same seed collide (same result anyway; earlier row wins), and a legal bench-only swap changes the fingerprint unless the fingerprint ignores bench order. Engine decode leniency is by design and stays untouched, so frozen=false. NOT RUN: the database-level duplicate. E2 proof on Preview: POST V0, V1, V2 under three nicknames and expect 201, 201, 201.

### SE-03

**Server errors are swallowed: five catch blocks return 503 without logging, there is no request id and no instrumentation hook** (S2, Red, static-only)

- Evidence: handlers.ts:119,126,162,194,218 and gate/unlock.ts:44 catch and discard the error; the only console calls are handlers.ts:109 and unlock.ts:36 (a fixed secret message); no instrumentation*.ts exists; grep for x-vercel-id, VERCEL_GIT_COMMIT_SHA, onRequestError in src returned nothing. A database outage, a bad migration or an engine exception shows up only as platform 503 or 500 rows with no cause. drizzle neon-http DrizzleQueryError.message embeds the SQL and parameters (nickname, ip_hash, token), so the message must not be logged.
- Fix: Add src/instrumentation.ts exporting onRequestError that logs one JSON line { requestId from the x-vercel-id header, path, routePath, routeType, error.name, digest } and never the message. In handlers.ts replace each bare catch with a helper logDbError(where, e) that logs { where, requestId, name, sqlstate: e.cause?.code } and nothing else. Return the request id to the client in an x-request-id header on 5xx replies. Test: a throwing store logs one line that contains no nickname, token or IP.
- Notes: Satisfies the dispatch line: server errors logged with a request id and no personal data. Vercel's own request log carries status and path, so outages are visible as 503s, but the failing step (limiter, probe, insert, rank, board) is not recoverable.

### SE-04

**No CSP, nosniff, Referrer-Policy, Permissions-Policy or frame protection on any response; adding a strict CSP would trip a zod eval probe** (S2, Red, confirmed)

- Evidence: Measured 14 HEAD responses on production (evidence/E-prod-headers.txt, single run): content-security-policy, x-content-type-options, referrer-policy, permissions-policy, x-frame-options, cross-origin-opener-policy and cross-origin-resource-policy appear on 0 of 14; HSTS (max-age=63072000; includeSubDomains; preload) on 12 and access-control-allow-origin * on 14 are Vercel's; the app sets only X-Robots-Tag (next.config.ts:15) and the creatures Cache-Control (:18-21). Inline scripts without nonce: / 8, /play 6, /daily 8; 11 style attributes on / (E-work/inline-count.txt). Zod 4.6.5 runs new Function('') at the first object schema (zod/v4/core/util.js:218-232; schemas.js:1166-1168); the probe is in production chunk 2djt_v4ccth_j.js loaded by /, /play and /daily.
- Fix: next.config.ts headers(): add nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=(), microphone=(), geolocation=(), payment=(), usb=() (not clipboard-write), X-Frame-Options DENY, and Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'. In a new src/instrumentation-client.ts call z.config({ jitless: true }) before any schema is built. Verify in a Preview browser run, then rename to the enforcing header. Full values and rollout in E-route-matrix appendix B.
- Notes: Nonce CSP is rejected: it forces dynamic rendering and is incompatible with partial prerendering (next docs content-security-policy.md:385-402). jitless costs nothing measurable: 113.5 ms against 112.7 ms median sum, Node 22, n=15 (E-work/zod-jit-cost-node22.txt). access-control-allow-origin * is Vercel's static default, not the app's. NOT RUN: the policy in a browser, the instrumentation-client ordering, Vercel toolbar sources on previews.

### SE-05

**/card and the share-image route are public, uncached CPU renders with no cap** (S2, Red, static-only)

- Evidence: passcode.ts:9-10 exempts both from the gate; card/route.tsx:7-24 accepts any t or b (no length cap beyond the URL); ImageResponse default header is public, max-age=0, must-revalidate in production (next/dist/server/og/image-response.js:55-65); card-images.ts:14-41 does up to 11 synchronous readFileSync per request and, for a WebP pack, one sharp conversion per picture with no memoisation; both routes share lambda fn-dd995768d0e (24.97 MB) with /api/leaderboard and /gate/unlock (evidence/E-vercel-lambdas.tsv). Hobby allowances are 1,000,000 invocations and 4 CPU-hours (Hobby doc); exceeding usually means waiting 30 days.
- Fix: Return Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800 on /card and the OG image through the options.headers argument of ImageResponse (output depends only on the token, pack and mirror; the CDN cache is per deployment); memoise data URIs per (pack, dexId) in module scope; consider a distinct function for the image routes so they do not share an event loop with the API; optionally a Hobby firewall rate rule if available.
- Notes: Render CPU per request and the cache behaviour on production are NOT RUN (cold-start protection forbade requesting these URLs). Event-loop sharing between image rendering and the API on a 1 vCPU instance is inferred.

### SF-03

**No test drives Position First, a reroll button, the home Start links or the animated Randomize cascade** (S2, Yellow, static-only)

- Evidence: Both challenge specs use `order=squadFirst` (`e2e/challenge.spec.ts:12,24`), as do `e2e/images.spec.ts:31,47` and `e2e/server-html.spec.ts:13`. The three draft tests in `src/components/run/__tests__/run.test.tsx` (`:30,45,60`) and `src/components/run/__tests__/runState.test.ts:5` are Squad First too. Position First therefore reaches only the engine tests, and the `awaitingSlot` branch of `DraftBoard.tsx` (`:94-96`, `:130`, `:189`) is never rendered by a test. No test clicks a reroll button (`DraftBoard.tsx:37-43`, label `:157`, action `:161`). Rerolls reach tests only through `step` for 151 species (`runState.test.ts:35`), the server cap (`handlers.test.ts:150-155`) and wheel stage lists (`wheel.test.tsx:112`). The caps are `REROLLS = { cup8: 3, kanto151: 5 }` (`src/engine/types.ts:130-133`) and both 8-0 buttons share one counter (`DraftBoard.tsx:79,157`). No test clicks `Play 8-0 Challenge`, `Play 151 Challenge` or the Order control (`src/components/home/SidePanel.tsx:99-104,172-177`), so the `playHref` to `parsePlayQuery` round trip (`src/ui/settings.ts:80-102`) has no test. Every Randomize in e2e runs under reduced motion (`e2e/builder.spec.ts:3`, `e2e/images.spec.ts:86`), which returns before the rAF cascade starts (`Builder.tsx:93` against `:94-99`), so `Builder.tsx:57-71` never runs in a test. Static greps and reads, single pass.
- Fix: Add `e2e/draft-modes.spec.ts` with four tests. (1) 'Position First 8-0 asks for a slot before it rolls' opens `/play?mode=cup8&f=4-3-3&order=positionFirst&g=123456789&style=open&seed=e2e-pf`, expects `round-prompt` to read 'Pick a slot for round 1', drafts 16 and replays the share link with a record pinned from the first real run. (2) 'Reroll spends one shared count in 8-0 and five in 151' expects the labels 'Reroll type, 3 left' and 'Reroll region, 3 left', clicks one, expects '2 left' on both, then expects 'Reroll, 5 left' on 151 down to a disabled 'Reroll, 0 left'. (3) 'The home Start links carry the chosen order' clicks the Order control and `Play 151 Challenge` and expects the URL to contain `order=positionFirst`. (4) 'Randomize animates under no-preference' clicks Randomize with `reducedMotion: 'no-preference'` and expects 16 filled slots within the cascade total plus a margin. Add `src/ui/__tests__/settings.test.ts` with literal `playHref` to `parsePlayQuery` round trips for both modes, both orders and both styles.
- Notes: Record values for the new e2e tests must come from a first real run, never from the code under test. The live suite and the engine goldens do not replace these because they never render the UI branches named above.

### SF-04

**Builder first placement, Clear all, Reset, Copy link and Download image have no test, while finish-qa.md reports F2 and F3 as covered** (S2, Yellow, static-only)

- Evidence: A grep of every `*.test.ts(x)` and e2e spec for 'Clear all', 'Reset', 'Copy link', 'copyLink' and 'randomDraft' finds none (single pass). The buttons are `src/components/builder/Builder.tsx:167-190` (Randomize `:167-169`, Clear all `:170-177`, Reset `:178-180`, Download image `:181-187`, Copy link `:188-190`) and `copyLink` is `:102-109`. `docs/reports/finish-qa.md:84` says `Builder.test.tsx` 'covers randomize, clear, tap-to-place and drag swap'. That file has six tests (`Builder.test.tsx:68-137`) covering drag swap, picker swap, picker search, a type filter and the fit display. `docs/reports/finish-qa.md:85` says e2e `shareAndReplay` covers Download image and Copy link for the builder, but that helper runs on a challenge results page (`e2e/helpers.ts:24-36`, called at `e2e/challenge.spec.ts:17,30`). The server half of the builder card is covered (`src/app/card/__tests__/route.test.ts:40-43` for the `b=` card and `src/ui/__tests__/lineup.test.ts:10` for the loader), and the button wiring is not. Randomize has one e2e test that counts 16 filled slots (`e2e/builder.spec.ts:9-10`). No builder test clicks a pick row for an empty slot either. The picker tests at `Builder.test.tsx:96,108,117,127` open the picker for an empty slot and stop at search, filter and fit, and the test at `:82` picks into a filled slot, so first placement through the picker is covered only by the engine reducer (`src/engine/__tests__/draft.test.ts:332,361`).
- Fix: Add to `Builder.test.tsx` five tests with literal assertions. 'Picking a species fills the empty slot and closes the picker' opens `Empty LCB slot`, searches `pika`, clicks `pick-25` and expects the slot label `LCB Pikachu` and no dialog. 'Clear all empties every slot and disables itself' fills two slots, clicks Clear all and expects zero `data-filled='true'` tokens and a disabled button. 'Reset restores the default panel and an empty lineup' changes one panel option, fills a slot, clicks Reset and expects the option back at its literal default (`src/components/home/HomeScreen.tsx:100-104`) and zero filled slots. 'Copy link writes the share URL and says so' stubs `navigator.clipboard.writeText` and expects `${location.origin}/?b=<token>` and the status text 'Link copied', then rejects the stub and expects 'Could not copy the link'. 'Download image requests the builder card' stubs `fetch` with a PNG `Response` and stubs `URL.createObjectURL`, then expects one request whose URL starts with `/card?b=<token>` and an anchor with `download` set to `pokedraft-lineup.png`. Add one e2e test in `e2e/builder.spec.ts` that clicks Download image on `/` after Randomize and checks `pngSize` equals 1200 by 630. Correct `finish-qa.md:84,85` to say what is covered.
- Notes: Randomize, Clear all and Reset each replace a built lineup with no confirm step and no undo. Whether that needs a confirm is a product call for the lane owner, and the tests should pin whichever behavior is chosen. The status text clears after 2400 ms (`Builder.tsx:84-88`), so the Copy link test must assert inside that window or use fake timers. `Builder.tsx:184` discards the download promise with `void`, so a failed builder download (`src/components/share/download.ts:26-28` throws) shows no message, while `src/components/results/ShareActions.tsx:31-39` shows 'Download failed'. A failure-path test would settle that lead.

### SF-05

**No test operates the app by keyboard, and the picker dialog's focus and Escape behavior is stubbed away** (S2, Yellow, static-only)

- Evidence: A grep over `e2e`, `e2e-live` and every `*.test.ts(x)` for `keyboard.`, `.press(`, `userEvent`, `fireEvent.key`, `keyDown`, `activeElement`, `toHaveFocus` and `Escape` finds nothing except the word 'Enter' inside a copy string in `src/__tests__/proxy.test.ts:67` (single pass). `docs/reports/finish-qa.md:105,179` lists the keyboard-only draft as NOT RUN. The picker is a native dialog that calls `showModal()` and focuses the search box on mount (`src/components/builder/Picker.tsx:53-57`). `Builder.test.tsx:11-13` replaces `showModal`, so jsdom never exercises the top layer, the focus trap or Escape close. The axe spec checks static markup only (`e2e/a11y.spec.ts:19-28`).
- Fix: Add `e2e/keyboard.spec.ts`. 'A whole 151 draft by keyboard alone' tabs to `run-start`, presses Enter, then per round tabs to the first `candidate-*` and presses Enter, tabs to the first empty slot and presses Enter, and expects 'Round N of 16' to advance to 'Draft complete' and `see-results` to be reachable. 'The picker traps focus and closes on Escape' opens a slot with Enter, expects `document.activeElement` to be the searchbox, presses Escape, and expects the dialog closed with focus back on the slot token. 'Every stop shows a focus ring' asserts a non-zero outline width or a box-shadow on `:focus-visible` for each tab stop on `/`.
- Notes: GATE 4 assertion 1 is taps only. Keyboard operation is a separate accessibility requirement (A1 in finish-qa.md).

### SF-06

**Double submit has no test at either layer, and the insert-time unique-violation path never runs** (S2, Red, static-only)

- Evidence: Client side, `src/components/leaderboard/SubmitPanel.tsx:51` returns while `status.kind === 'submitting'` and `:100-107` disables the button while submitting. `SubmitPanel.test.tsx:40-71` clicks Submit once and asserts one fetch (`:54`), so neither guard has a test. Server side, every duplicate test is sequential (`src/leaderboard/server/__tests__/handlers.test.ts:237-261`), so the `conflictFor` pre-check (`handlers.ts:160-161`, `src/leaderboard/server/store.ts:56-70`) always answers first and the `insert` catch path (`src/leaderboard/server/store.ts:71-83`, `handlers.ts:174-189`) never runs. No test file calls `store.insert` or `conflictFor`, and a grep of `src` tests for `23505`, `_uq`, `cause` and `Promise.all` finds none (single pass). The race backstop depends on `uniqueViolation` walking `.cause` (`src/leaderboard/server/store.ts:45-52`) and on two driver error shapes. `docs/decisions/dispatch-4.md:77` says PGlite and Neon wrap Postgres errors differently and that the probe was one-off and not committed. `dispatch-4.md:82` lists guard tests for an unknown 23505 constraint, but I found no test that reaches that path. Both unique indexes are defined in `src/db/schema.ts:33-36` and migration 0000 creates the daily-nickname index before the token index (`drizzle/0000_leaderboard_entries.sql:22-23`), so a daily race loser most likely sees DAILY_ALREADY_SUBMITTED rather than DUPLICATE_TOKEN. That last point is inferred from Postgres index order and not run.
- Fix: In `handlers.test.ts` add 'a double submit that slips past the pre-check still gets 409 and one row'. Wrap the real store as `{ ...store, conflictFor: async () => null }`, submit the same token twice, and expect statuses [201, 409] with exactly one row (catches an insert-time conflict that throws and becomes DB_UNAVAILABLE). Add 'an unknown unique constraint maps to DUPLICATE_TOKEN' with a stub whose `insert` rejects `{ code: '23505', constraint: 'unknown_uq' }` and another with the code nested at `cause.cause`. Add a concurrent `Promise.all` variant on a daily board and pin whichever code the loser receives. In `SubmitPanel.test.tsx` add 'a second click while submitting sends no second request' with a never-resolving fetch and two clicks, expecting `fetchMock` once and a disabled button reading 'Submitting'. Extend `scripts/db/smoke.mts` to go through `store.insert` against the Neon preview branch so the driver shape is checked where it differs.
- Notes: The client guard only protects one mounted panel. Two tabs, a retry or a replayed request reach the server backstop, which is why both layers need a test.

### SF-07

**The friends gate has no test for its cookie attributes, route wiring, matcher, error copy or a browser unlock** (S2, Red, static-only)

- Evidence: `src/gate/__tests__/unlock.test.ts:74-79` builds the expected cookie value with `passcodeDigest`, the function under test, and asserts nothing about HttpOnly, SameSite, Path, Max-Age or Secure, which `src/gate/unlock.ts:52-58` sets (`Secure` follows `NODE_ENV`, `:54`). `config.matcher` (`src/proxy.ts:51-53`) is never imported by `src/__tests__/proxy.test.ts`, so a matcher edit that gates `/_next/static` or lets `/api/leaderboard` through would pass while `isPublicPath` and `proxy()` stay green. `src/app/gate/unlock/route.ts:6-13`, which wires `FRIENDS_PASSCODE`, `IP_HASH_SECRET`, `getDb` and the clock, has no test. The three error copies and `role='alert'` (`src/app/gate/page.tsx:30-34,54-58`) have no test. No browser flow exists (`docs/reports/finish-qa.md:95,111,181` list unlock, throttle and the alert as NOT RUN). `safeNext` is well covered (`proxy.test.ts:101-110`). Static reads and greps, single pass.
- Fix: In `unlock.test.ts` add 'sets an HttpOnly, SameSite=Lax, Path=/ cookie that lasts 90 days' and assert the literal `set-cookie` header `pokedraft_pass=<64 hex digest computed once offline and pasted>; Path=/; Max-Age=7776000; HttpOnly; SameSite=lax`, then repeat with `vi.stubEnv('NODE_ENV', 'production')` and expect `; Secure`. In `proxy.test.ts` add 'the matcher skips only static assets' using `unstable_doesProxyMatch` from `next/experimental/testing/server` (documented at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:732-745`) with literal paths that must and must not match. Add `src/app/gate/__tests__/page.test.tsx` rendering the page with `error=limited`, `error=unavailable`, `error=1` and an unknown code, expecting each literal copy inside a `role='alert'`. Add `src/app/gate/unlock/__tests__/route.test.ts` that stubs the env and `getDb` and expects a 303 to `/gate?...&error=unavailable` when `IP_HASH_SECRET` is short. Add a gated browser flow to `e2e-live` only if a gated preview deployment exists.
- Notes: Behavior of `unstable_doesProxyMatch` in this repo and of rendering the async `GateForm` in Vitest is unverified. Both are listed as NOT RUN in F-notrun-plan.md.

### SF-08

**The accessibility spec audits an invalid-link page instead of the builder, and runs axe in dark mode on 7 URLs only** (S2, Yellow, static-only)

- Evidence: `e2e/a11y.spec.ts:10` opens `/play?mode=builder&formation=4-3-3&gens=1`. `parsePlayQuery` needs the `f=` parameter and a mode of `kanto151` or `cup8` (`src/ui/settings.ts:90-91,95-96`), and this URL has neither, so `src/components/run/PlayScreen.tsx:40-50` renders 'That challenge link does not work'. The spec therefore audits the error page that `run.test.tsx:73-78` already covers. `docs/reports/finish-qa.md:113` describes the row as the `/play` builder. The builder is the home page, so `/` (`a11y.spec.ts:9`) audits its default state only. All 7 audits run in dark mode (`playwright.config.ts:15`, no `test.use` in the spec). Light mode had one throwaway pass (`finish-qa.md:108`) and no CI coverage, and `ThemeToggle.tsx` is named by no test file. Not audited at all are `/daily`, `/leaderboard`, `/gate`, a live draft, the results view of a played run, the open picker and the submit panel. `finish-qa.md:108` also notes axe cannot evaluate text over gradients or images (the pitch, the hero). Static reads and greps, single pass.
- Fix: In `e2e/a11y.spec.ts` replace line 10 with a real draft state. Open `/play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed=a11y`, click `run-start`, wait for `round-header`, then scan. Add scans for `/daily` (after `run-start`), `/leaderboard` with a stubbed board (reuse `stubBoard` from `leaderboard.spec.ts`), the open builder picker, the submit panel and a results view. Wrap the route loop in `for (const scheme of ['dark', 'light'])` using `test.use({ colorScheme })` so every URL is scanned in both themes. Keep the garbage-token and 404 routes. Document which pitch and hero regions axe cannot score and keep the manual contrast table for them.
- Notes: Doubling the routes adds about 7 to 12 short tests. The per-test cost today is 0.8 to 1.4 s (ci-flake probe, 5 runs), so the added wall time is small but not measured.

### SF-09

**The wheel test 'settles on the engine roll for 500 seeded rolls' keeps the default 5 s timeout and fails under load** (S2, Yellow, confirmed)

- Evidence: `src/components/wheel/__tests__/wheel.test.tsx:84-98` mounts and unmounts 500 jsdom wheels inside one `it` with no explicit timeout, and `vitest.config.mts:13-17` sets none, so Vitest's 5 s default applies. Measured from the ci-flake probe (run 38077815031, ubuntu-latest, retries off, 5 runs) the test took 2766, 2129, 1724, 2216 and 2754 ms, median 2216 ms and maximum 2766 ms, which is 55% of the budget in the worst run. `docs/decisions/dispatch-6.md:68` records one failure in three local full-suite runs at 6.5 s. CI run 38005324958 (branch feat/engine, head 4f9f566) logged 'Test timed out in 5000ms' for two fairness tests at 5513 and 5343 ms. Those tests now carry `{ timeout: 60_000 }` (`src/engine/__tests__/fairness.test.ts:68`). Because the test body is synchronous, a timer cannot interrupt it, so the reported duration is the full body time. The limiter is inferred to be CPU time in 500 jsdom mount and unmount cycles and was not profiled.
- Fix: In `wheel.test.tsx` pass an explicit timeout as the third `it` argument, for example `30_000`, and add a comment naming the 500-case loop. Better, split the 500 cases into `it.each` chunks of 50 (10 tests) so each stays far from any limit and a failure names the chunk. Do not lower the case count.
- Notes: Rated S2 and not S3 because the repo's own log records a real failure at 6.5 s and a false FAIL costs one of the two review rounds per head (`CLAUDE.md`, risk tiers). CI timing alone looks safe, so the S2 rests on the recorded local failure and the earlier CI precedent. The 2766 ms maximum comes from 5 runs and is a lower bound for a loaded reviewer laptop.

### SA-13

**Filled pitch tokens have overlapping hit boxes on phones in every formation, and the bench gap is under 8px at 390** (S3, Yellow, needs-browser-proof)

- Evidence: Token boxes are 60px wide and 80px high when filled (src/components/pitch/Pitch.module.css:65-84), placed by percentage (src/components/pitch/Pitch.module.css:67-68). With the engine's slot templates (read only) the filled boxes overlap in all 8 formations at every width from 320 to 412 (16 overlapping pairs in total at 390, worst 4-1-4-1 CDM/LCM at -10.3px). With the rating note on (Builder) it is 22 pairs. At 430 7 of 8 formations are clear of overlap, smallest gap 3.0px. The 44px image discs do not overlap (smallest clearance 8.5px at 320). Empty tokens have 0 overlapping pairs at 390. The overlap is mostly the label strips under the discs, and by DOM order the later token wins a tap in the overlap. The bench row of five 62px tokens has 6.8px between tokens at 390 (src/components/pitch/Pitch.module.css:207-210).
- Fix: Fit labels inside the 44px disc area on phones (drop the position strip under the disc and show it on tap or as a small corner badge), or enlarge the field with the viewport. Give the bench 8px or more between tokens, for example by letting it scroll sideways.
- Acceptance: [3]
- Notes: Hit boxes are predicted from CSS, not measured. Which token wins in an overlap needs a real touch.

### SA-14

**The nickname and Picker search inputs lack the mobile keyboard attributes, and the keyboard cover case is unverified** (S3, Yellow, needs-browser-proof)

- Evidence: The nickname input has autoComplete="nickname" and maxLength only (src/components/leaderboard/SubmitPanel.tsx:90-100). There is no autoCapitalize, autoCorrect, spellCheck or enterKeyHint, so iOS may capitalise and autocorrect a handle and shows a plain return key. It is 16px (src/components/leaderboard/SubmitPanel.module.css:30-42), so iOS does not zoom on focus, but only 40px high (SA-12). The Picker search sets inputMode, enterKeyHint, autoComplete="off" and spellCheck=false (src/components/builder/Picker.tsx:131-139) and also lacks autoCapitalize and autoCorrect. No code reacts to the software keyboard. A grep for visualViewport, scrollIntoView and interactiveWidget returns nothing. The submit panel sits right after the hero and the share actions (src/components/results/ResultsView.tsx:79-80), so it is high on the results page and the browser's own scroll-into-view will usually be enough, and the Submit button shares the input's row (src/components/leaderboard/SubmitPanel.tsx:88-107).
- Fix: Add autoCapitalize="off", autoCorrect="off", spellCheck={false} and enterKeyHint="send" to the nickname input, autoCapitalize="off" and autoCorrect="off" to the Picker search. Decide on interactiveWidget (SA-16) and test a focused nickname at 390x664 with the keyboard open on a real iPhone and Android.
- Acceptance: [6]
- Notes: Whether the keyboard covers the field or the Submit button is NOT RUN (needs a device or the Playwright keyboard emulation the later pass has).

### SA-15

**The Image style select is 14.4px, below the 16px at which iOS Safari stops zooming on focus** (S3, Yellow, needs-browser-proof)

- Evidence: The select inherits 0.9rem = 14.4px from its row (src/app/globals.css:487-493, src/app/globals.css:499-506) and the form reset sets font: inherit (src/app/globals.css:179-184). iOS Safari zooms the page when a control under 16px is focused. The other controls are 16px (Picker search and selects, nickname, date) because they inherit the 16px body size.
- Fix: Set font-size: 1rem on .image-settings select (and 1rem on the row) or use 16px for every input and select in a shared rule.

### SA-16

**layout.tsx exports no viewport, so there is no theme colour, color scheme, viewport-fit or interactive-widget setting** (S3, Yellow, static-only)

- Evidence: layout.tsx exports only metadata (src/app/layout.tsx:24-29). In Next 16.4 the viewport meta tag is set automatically and the default is sufficient (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md:124), so pinch zoom works and nothing is broken. What is missing is the optional part. The Viewport type supports themeColor (an array with media queries), colorScheme, viewportFit and interactiveWidget, and the keys map to viewport-fit and interactive-widget (node_modules/next/dist/lib/metadata/types/extra-types.d.ts:52-53, node_modules/next/dist/lib/metadata/constants.js:23-32). Without themeColor the browser bar on Android and the iOS status area do not follow the page, and the page has no viewport-fit=cover, so no safe-area handling exists either (a grep for safe-area-inset over src finds nothing). That is harmless today, because nothing is fixed to a screen edge.
- Fix: Export a Viewport constant named viewport with themeColor [{ media: '(prefers-color-scheme: dark)', color: '#08130e' }, { media: '(prefers-color-scheme: light)', color: '#eef4ef' }], colorScheme 'dark light', and viewportFit 'cover' only together with env(safe-area-inset-*) padding on any new bottom bar. Decide on interactiveWidget 'resizes-content' only after testing the keyboard cases (SA-04, SA-14). Colours are the --bg tokens in globals.css.
- Notes: The theme-colour values come from the dark and light --bg tokens. The app theme toggle can override the OS scheme, which a media-query themeColor cannot follow (see SA-18).

### SA-17

**No web manifest, no 192 or 512 icons and no apple-touch-icon, so Add to Home Screen gives a plain shortcut** (S3, Red, static-only)

- Evidence: src/app has a multi-size favicon.ico only (48x48 and 32x32 among its images), public/ holds only creatures/, and no manifest, icon or apple-icon file exists. Next's file conventions are app/manifest.ts returning MetadataRoute.Manifest (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md:22-47) and an apple-icon file (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md:49-56). The Metadata API also has appleWebApp (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:779). The access gate would block those routes. The proxy matcher skips only _next/static, favicon.ico and robots.txt (src/proxy.ts:52) and the public list does not include a manifest or icon path (src/passcode.ts:8-16). Next adds crossOrigin use-credentials to the manifest link only on Vercel previews (node_modules/next/dist/lib/metadata/metadata-elements.js:140), so on production a gated manifest fetch is anonymous. Whether production runs with FRIENDS_PASSCODE set is not known from the repo.
- Fix: Add app/manifest.ts (name, short_name, start_url, display standalone, background_color and theme_color from the tokens, 192 and 512 icons, one maskable), an apple-icon 180x180, and appleWebApp capable with a status-bar style. Add /manifest.webmanifest and the icon routes to the passcode public list. That edit is access-control code, so it is Red tier and needs an independent review.
- Notes: The gate state in production was not checked (no network was used).

### SA-18

**The stored theme is applied after hydration, so a person whose choice differs from the OS setting sees a flash of the other theme** (S3, Yellow, static-only)

- Evidence: Dark tokens are the default in :root and light tokens come from either :root[data-theme="light"] or a prefers-color-scheme: light block that skips data-theme="dark" (src/app/globals.css:78-103, src/app/globals.css:105-107). The stored choice is read and applied only inside a useEffect in the client component (src/components/ThemeToggle.tsx:23-29). layout.tsx has no inline script in head or body, so no code runs before first paint. CSS-only users are fine. A person who picked Night on a phone set to light first paints the light theme, then switches when React hydrates, a white flash. A person who picked Day on a dark phone sees the reverse. The toggle label also starts at Auto and then changes. The html element carries no suppressHydrationWarning, so an inline fix needs it.
- Fix: Add a small inline script in head that reads localStorage pokedraft:theme and sets data-theme on the html element before paint, add suppressHydrationWarning to html, and keep ThemeToggle as the owner of later changes.

### SA-19

**Copy link and Share rely on navigator.clipboard alone, with no Web Share and no manual fallback** (S3, Yellow, needs-browser-proof)

- Evidence: Share and Copy link call navigator.clipboard.writeText and show Could not copy the link when it throws (src/components/results/ShareActions.tsx:24-29, src/components/builder/Builder.tsx:102-109). The Clipboard API exists only in secure contexts, so a plain-HTTP preview or LAN test shows the failure message. There is no navigator.share call anywhere in src, which is the native route on phones, and no select-and-copy fallback that shows the URL. Production is HTTPS, so the normal path is fine. The weakness is the error path leaving the person with no link, and the missed native share sheet for sending a run to friends.
- Fix: Call navigator.share({ url }) when it exists (progressive enhancement, keep Copy link), and on failure show the URL in a read-only field that is selected for manual copy.

### SA-21

**No touch defaults are set, so long-press callouts, tap highlights and double-tap zoom behave as the browser likes** (S3, Yellow, needs-browser-proof)

- Evidence: Tokens set user-select: none (src/components/pitch/Pitch.module.css:82-83) but nothing in src sets -webkit-touch-callout, -webkit-tap-highlight-color or touch-action: manipulation (greps return no line outside touch-action: none on the field and tokens). Tokens contain images (frozen PlayerImage, read for context), and iOS can offer Save Image or Copy on a long press of an img unless the callout is disabled. Without touch-action: manipulation, closely placed controls such as the reroll buttons and the chips can trigger double-tap zoom on a fast second tap, where Safari still supports it. Native buttons show the default grey tap highlight.
- Fix: Add -webkit-touch-callout: none and -webkit-tap-highlight-color: transparent to .token and the candidate buttons, and touch-action: manipulation on buttons, links, chips and the nav. Keep touch-action: none only where a drag needs it (SA-02).
- Notes: Behaviour on a real iPhone is NOT RUN.

### SA-22

**Pressed feedback exists only on .btn, and hover rules are not gated, so hover can stick after a tap** (S3, Yellow, needs-browser-proof)

- Evidence: The stylesheets have 10 :hover rules, 1 :active rule (src/app/globals.css:245-247) and 0 (hover: hover) queries. Candidate rows and cards, Picker rows, pitch tokens, chips, tabs and segments have no :active state, and 2 :focus-visible rules give keyboard focus a ring (src/app/globals.css:186-189). On touch browsers :hover stays applied after a tap on the element until another tap, so the .btn border change (src/app/globals.css:241-243) and the nav link colour can look stuck. A tapped token is confirmed by a ring only when it is the committed slot (data-highlight, src/components/pitch/Pitch.tsx:154) and by the picker or pick result, otherwise there is no immediate press feedback.
- Fix: Wrap hover styles in @media (hover: hover) and (pointer: fine), add an :active style (scale .97 or a background step) to candidates, rows, tokens and chips, and keep transitions short.

### SA-23

**No haptics today, and adding them behind the existing sound setting would be a small progressive enhancement** (S3, Yellow, static-only)

- Evidence: No call to navigator.vibrate exists in src. Sound is off by default (src/components/wheel/sound.ts:12-15), has a toggle (src/components/wheel/SoundToggle.tsx:12) and ticks from one place per face crossing (src/components/wheel/Wheel.tsx:114, src/components/wheel/sound.ts:53-66). A haptic() helper next to playTick that returns early unless the same setting is on and navigator.vibrate exists would cover pick, reroll and wheel settle in about 10 lines. Support is Android Chrome and Firefox. iOS Safari does not implement the Vibration API, so on iPhone this would do nothing without a different approach.
- Fix: Optional. Add haptic(ms) guarded by the sound setting (or a separate Haptics toggle) and navigator.vibrate, call it on pick, reroll and when the wheel settles. Ship nothing on iOS.
- Notes: Enhancement, not a defect. Yellow tier. NOT RUN on a device.

### SA-24

**The wheel mounts about 38 eager image elements and animates a blur filter every frame, a risk on slow phones** (S3, Yellow, needs-browser-proof)

- Evidence: Per frame the code does two style writes and a counter (src/components/wheel/Wheel.tsx:101-118) with no layout reads, which is cheap, and uses will-change: transform on the reel (src/components/wheel/Wheel.module.css:55-60). The filter blur changes with speed on every frame (up to 2.2px) inside a 3D perspective window (src/components/wheel/Wheel.module.css:34-53), which can force repaints of that layer instead of staying compositor-only. At the start of a spin the reel mounts every face. The species wheel has 12 faces repeated 3 times plus a head and a tail, 38 PlayerImage elements with the eager flag at 32px (src/components/wheel/Wheel.tsx:55, src/components/wheel/Wheel.tsx:42-44), so 38 img elements for 12 distinct pictures are created in one commit (the requests dedupe, the elements and their decodes do not). The region and type wheels mount no images. Whole-wheel and button skip both settle correctly (src/components/wheel/Wheel.tsx:131, src/components/wheel/RollReveal.tsx:68).
- Fix: Cap decoration laps so far fewer images mount, or reuse the same img nodes, and drop the blur or limit it to a pseudo-layer. Profile with a 4x CPU throttle first, the real cost is not known from source.
- Notes: Frame time and long tasks on a 4x CPU slowdown were NOT RUN (no browser).

### SA-25

**Picking or clearing in the Picker unmounts the dialog without close(), so focus does not return to the slot** (S3, Yellow, needs-browser-proof)

- Evidence: Close and Escape call the native close (src/components/builder/Picker.tsx:119), which hands focus back to the element that had it before showModal. Pick and Clear call setPicking(null), which removes the dialog from the tree while it is open (src/components/builder/Builder.tsx:214-223). A dialog removed while open does not run the close steps, so focus is expected to fall to the body rather than the token. Keyboard and screen-reader users lose their place after every pick in the Builder.
- Fix: Call ref.current.close() before the state change in pick and clear, or restore focus to the opener token explicitly.

### SA-32

**Pitch rings and overlays on the light grass are 1.30 to 2.22:1, and the drag drop-target ring is the lowest** (S3, Yellow, needs-browser-proof)

- Evidence: Highlight ring (flood), weak ring (token-weak), drop-target ring (focus), synergy dashes and the open-slot pulse against the light grass give 1.30 to 2.22:1 (src/components/pitch/Pitch.module.css:135-138, A-contrast.md 4.2 rows U17 to U21). During a drag the drop ring is the only cue for the target, at 1.30. In dark one pitch ring also fails.
- Fix: Add a white inner ring or an outline stroke on pitch rings so they clear 3:1 on any grass (A-contrast.md 4.1 and 5).

### SA-33

**No ::placeholder rule exists, so placeholder text uses the engine default, assumed at 1.93:1** (S3, Yellow, needs-browser-proof)

- Evidence: No stylesheet styles ::placeholder (greps over src CSS return nothing), and the Picker search and nickname inputs set placeholders (src/components/builder/Picker.tsx:136, src/components/leaderboard/SubmitPanel.tsx:97). The engine default is assumed at #a9a9a9 on --bg-sunk, 1.93:1. The real value must be read in the browser (A-contrast.md section 8).
- Fix: Add ::placeholder { color: var(--ink-soft); opacity: 1 } for inputs and check it at 4.5:1.
- Notes: The colour is assumed, not measured.

### SA-34

**The faded unplayed match card (opacity .7) drops its text to 2.56 to 3.78:1** (S3, Yellow, static-only)

- Evidence: The whole card, text included, is drawn at 70 percent (src/components/results/MatchList.module.css:33). Bold --ink-faint meter labels give 2.80:1 in dark, and faded --ink-soft and --ink-faint text give 3.78 and 2.56 in light (rows T102, T103, T140).
- Fix: Fade the card background and border instead of the whole element, or keep text at full opacity.

### SA-35

**At 200 percent text several fixed-size parts would clip, collide or truncate, chiefly the pitch tokens, wheel faces and the Picker header** (S3, Yellow, needs-browser-proof)

- Evidence: Most sizes are rem, so a root change propagates, but the wheel has 48px faces and nowrap names (src/components/wheel/Wheel.tsx:27, src/components/wheel/Wheel.module.css:62-76), tokens are 60px wide positioned by percent (src/components/pitch/Pitch.module.css:65-84), the Picker header stack does not scroll (SA-04), and the header would be about three nav rows. A-contrast.md section 9 has the table with estimates (for example 16 overlapping token box pairs at a 358px field today and 26 at 200 percent, the header about 254px tall at 200 percent).
- Fix: Test at 200 percent in a browser with html { font-size: 200% } and fix the worst of the four above first. Prefer min-height and wrapping over fixed heights.
- Notes: Sizes are arithmetic and capsize estimates, not rendered.

### SA-36

**body is pinned to 16px, so inherited text ignores a browser default-size setting while rem text follows it** (S3, Yellow, static-only)

- Evidence: The only px font-size in any stylesheet is body { font-size: 16px } (src/app/globals.css:141-146); html is not pinned (src/app/globals.css:140-146). Paragraphs, table cells and form text inherit 16px, while every rem size follows a changed default size. Pinch zoom is unaffected, nothing blocks it (SA-16).
- Fix: Use body { font-size: 1rem }.

### SA-37

**overflow-x: hidden on both html and body makes body a scroll container, which likely stops position: sticky and masks overflow** (S3, Yellow, needs-browser-proof)

- Evidence: html and body both set overflow-x: hidden and max-width: 100vw (src/app/globals.css:140-146). With a non-visible overflow on html, the body's own overflow no longer propagates to the viewport, and a non-visible overflow-x makes overflow-y compute to auto, so body becomes the nearest scroll container. A sticky element then measures against body, which never scrolls, so it never sticks. The sticky rules in the app are src/components/run/DraftBoard.module.css:22, src/components/home/HomeScreen.module.css:15 and src/components/results/ResultsView.module.css:334, all behind min-width 960 or 1024. The same rule hides any overflow instead of showing a scrollbar, which is why e2e/leaderboard.spec.ts measures every element's right edge (e2e/leaderboard.spec.ts:104). It also constrains the sticky bottom action bar proposed in SA-01.
- Fix: Use overflow-x: clip on body (and not hidden), or remove the rule once the real overflow sources are fixed, then re-test the desktop sticky pitch and any new bottom bar.
- Notes: The desktop sticky pitch may also be inert today (area B). A browser check is needed.

### SA-38

**The e2e suite has no mobile project, no touch and no tap-size check, and its draft helper hides scroll problems** (S3, Yellow, static-only)

- Evidence: Playwright has one project, Desktop Chrome, in the dark scheme (playwright.config.ts:17, playwright.config.ts:15). A grep for devices with isMobile, hasTouch, touchscreen and tap in e2e finds none. The only viewport test sets 390 and 1440 on /daily and /leaderboard (e2e/leaderboard.spec.ts:112), measures overflow on those two routes, and never opens the draft or the Picker. draftSixteen clicks the first candidate and the first empty slot (e2e/helpers.ts:4-15), and Playwright scrolls an element into view before a click, so a pitch that is off screen (SA-01) passes. A unit test pins the drag-only hint copy (src/components/run/__tests__/run.test.tsx:68). The drag test is a unit test with synthetic pointer events (src/components/builder/__tests__/Builder.test.tsx:74). The previous QA lists tap-target size and touch-emulated drag as NOT RUN (docs/reports/finish-qa.md). The axe spec runs dark only.
- Fix: Add a mobile project (iPhone 14 and a 320x568 device) with hasTouch, assert no horizontal overflow on every route, bounding boxes at least 44px for primary actions, the pitch visible when a candidate is selected, and one touch drag. Run axe in both schemes.

### SA-39

**The narrow-width nav override is declared before the base rule and never applies** (S3, Yellow, static-only)

- Evidence: The 479px block sets .site-header nav a { padding: 6px 5px; font-size: .78rem } (src/app/globals.css:393-404), but the base rule .site-header nav a at equal specificity comes later in the file (src/app/globals.css:412-421) and wins. Media queries add no specificity. So the nav links are .85rem with 6px 8px padding at every width. Only the header side padding and the .btn side padding rule (specificity 0,2,1) take effect. This is why the header wraps to two rows at 390 (SA-07).
- Fix: Move the media block after the base rule (or raise its specificity), then re-check the wrap. Better, replace the pattern with the menu button in SA-07.

### SA-40

**After a touch drag the suppressClick flag may stay set, swallowing the next genuine tap on any token** (S3, Yellow, needs-browser-proof)

- Evidence: onPointerUp sets suppressClick.current = true after a moved drag (src/components/pitch/Pitch.tsx:198) and only onClick clears it (src/components/pitch/Pitch.tsx:165-168). The ref is shared by all tokens in the Pitch. On a mouse a click always follows pointerup. On touch, a browser may drop the click after a movement past the tap slop, so the flag can stay true and the next tap on any token is consumed with no effect.
- Fix: Clear the flag on the next pointerdown (and after a short timeout), instead of relying on a click that may never arrive.
- Acceptance: [5]
- Notes: Browser-dependent. NOT RUN with touch emulation or a device.

### SA-41

**No overscroll-behavior on html or body, so pull-to-refresh and bounce can fire mid-draft** (S3, Yellow, needs-browser-proof)

- Evidence: overscroll-behavior appears only on the Picker list and the Open-style candidate rows (src/components/builder/Picker.module.css:120, src/components/run/DraftBoard.module.css:166). html and body have none (src/app/globals.css:140-146). A downward swipe at scroll top on Chrome Android refreshes the page, and combined with SA-08 a refresh drops the run. The pitch itself blocks panning with touch-action: none (SA-02), so the gesture starts from the gutters or the cards.
- Fix: Set overscroll-behavior-y: contain on html (not body, see SA-37). Pair with persistence (SA-08).

### SA-42

**The bench row needs 310px and has 274px at 320, so tokens shrink or overflow** (S3, Yellow, needs-browser-proof)

- Evidence: The bench holds five tokens of 62px with space-around in a row that is 274px wide at 320 (src/components/pitch/Pitch.module.css:212-219, src/components/pitch/Pitch.module.css:207-210), so free space is -36px. At 360 it is 4px and at 390 34px. Flex items shrink only to their automatic minimum size, which depends on the rendered names, so whether the row squeezes, overlaps or overflows at 320 is not provable from source.
- Fix: Use a 5-column grid with minmax(0, 1fr) and shrink the token art and labels on narrow screens, or allow the row to scroll sideways.
- Notes: Widths are computed from declared sizes.

### SA-43

**The Open-style candidate list is a nested scroller capped at 320px, which can trap the swipe in the middle of the page** (S3, Yellow, needs-browser-proof)

- Evidence: .rows has max-height: 320px, overflow-y: auto and overscroll-behavior: contain (src/components/run/DraftBoard.module.css:157-167). In Open style up to 33 rows can be offered (largest region and type set, kanto/poison, computed read only from the data), so the list is a scrollable box of about 346px inside a scrolling page. A swipe that starts on it scrolls the inner list and, at its end, does not chain to the page because of contain, so the page seems stuck until the next swipe starts outside the list. Candidate rows are 60px tall with a 6px gap (SA-06).
- Fix: Let the list grow with the page on phones (no max-height) or give it a clear visual end, and keep contain only on the Picker.
- Acceptance: [1, 5]

### SB-22

**Share-preview wording: generic description, title without challenge or finish, unlabelled record, static alt text, and no og or twitter tags on / and the other routes** (S3, Yellow, static-only)

- Evidence: Resolved from source plus Next's own metadata code (node_modules/next/dist/lib/metadata/metadata-resolution-primitives.js:388-440: twitter fields are filled from openGraph, then a missing title or description is inherited from the root). /r/[token] sets only title, openGraph.title and twitter card and title (src/app/r/[token]/page.tsx:7-11), so og:description and twitter:description are the root's generic 'Draft Pokémon into a soccer formation and play a cup.' (src/app/layout.tsx:27), and the image comes from the file-based opengraph-image. On a phone lock screen or chat preview the title is 'pokedraft run: 5-2-1, Team Score 812' (src/app/r/[token]/title.ts:7-9): the record is unlabelled and the title omits the challenge, Open or Classic and how far the run got, all of which the image carries (src/components/share/card.tsx:293, 372). The image alt is the static 'pokedraft run card' (src/app/r/[token]/opengraph-image.tsx:6). / has no openGraph object: the production HTML of / (audit/evidence/prod-index.html, another agent's capture) carries only charset, viewport, next-size-adjust, description and robots metas, and my GETs of /play, /daily, /history and /how-to-play (2026-10-10) show the same set, so a link to the app itself unfurls as a bare URL with no title card or image. Titles follow four patterns with no title.template (terminology T32). metadataBase falls back to http://localhost:3000 when VERCEL_PROJECT_PRODUCTION_URL is unset (src/app/layout.tsx:22-25); whether the production build sets it is unconfirmed, and a wrong value would put localhost in og:image.
- Fix: In src/app/r/[token]/page.tsx return a run-specific description from generateMetadata (for example '8-0 Challenge, Open, Squad First. Reached the Final. Can you beat it?') and a labelled title ('pokedraft run: record 5-2-1, Team Score 812'). Add an openGraph block (siteName, type, description) to the root metadata in layout.tsx so / and the other routes unfurl with a title card, and add title.template so the four title patterns collapse to one. Do not try to set the preview image from generateMetadata: a file-based opengraph-image overrides it (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:114). Confirm VERCEL_PROJECT_PRODUCTION_URL is set in the production build, or make the localhost fallback fail loudly in a production build. Validate with the Facebook Sharing Debugger, WhatsApp and iMessage on a preview deployment, which this pass could not do.
- Notes: mobileImpact true because the phone chat and lock-screen preview is the main way a shared run is first seen. The rendered og:image absolute URL, size and type on /r/* were not read from production (not allowed); they are derived from source (opengraph-image.tsx:7-8 sets 1200x630 image/png).

### SB-31

**There is no Web Share API: 'Share' only copies a link to the clipboard** (S3, Yellow, static-only)

- Evidence: src/components/results/ShareActions.tsx:21-29 'Share' copies the /r/<token> link with navigator.clipboard.writeText; the builder's 'Copy link' does the same (src/components/builder/Builder.tsx:102-109); rg finds no navigator.share anywhere in src. On a phone the native share sheet (Messages, WhatsApp, AirDrop) is the normal way to send a result; a clipboard copy needs an app switch and a paste, and the label 'Share' promises a share sheet it does not open. Terminology T26.
- Fix: In ShareActions.share feature-detect navigator.share and call it with { title, url } from the click handler, falling back to the clipboard copy and the existing 'Link copied' status; keep 'Copy link' as the explicit label in the builder. Add a component test that stubs navigator.share.

### SC-24

**Builder Download image gives no feedback and can fail without a message** (S3, Yellow, static-only)

- Evidence: The handler at src/components/builder/Builder.tsx:181-187 calls downloadCard with void and no catch. The function downloadCard throws on a non-OK response and on a non-PNG type (src/components/share/download.ts:26, :28), and fetch can reject. So a failure becomes an unhandled promise rejection with no message. There is no busy state while the PNG renders, so a second tap starts a second request. The results screen does this properly. In ShareActions.tsx:31-39 it sets "Preparing image", "Image saved" or "Download failed" in an always-mounted status (:59-61) and disables the button while busy (:46). The builder status also clears itself after 2400 ms (Builder.tsx:84-88). INFERRED and not run. A screen reader announces it once, but a slow reader or a low-vision user can miss the on-screen message.
- Fix: Reuse the ShareActions pattern in Builder.tsx. Wrap the download in try and catch. Report "Preparing image", "Image saved" and "Download failed" through say(), and disable the button while busy. Keep these messages up for 5 seconds or until the next action instead of 2.4 seconds.

### SC-38

**Saved theme applies only after hydration, so a chosen theme flashes the other one first** (S3, Yellow, static-only)

- Evidence: The saved theme reaches the page only through a passive effect in src/components/ThemeToggle.tsx:23-29, which reads localStorage and sets data-theme after mount. The root layout has no theme script in head or body (src/app/layout.tsx:33-48). A grep for data-theme finds only that effect and the CSS. The CSS picks the pre-hydration theme from the OS setting. Dark is the default (src/app/globals.css:17), and light applies when the OS prefers light and data-theme is not dark (:105-106). So a player who chose Night on an OS-light phone sees the light theme in the server HTML and first paint, then dark after hydration. A player who chose Day on an OS-dark device sees the reverse. INFERRED from code and the Next 16.4 guide, not run. The guide says deferring to useEffect introduces a visible flash and that an inline script avoids it (node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md:11-15, :520-524). The flash is one theme change per hard page load, so it stays under the three per second limit (WCAG 2.3.1). It still overrides a choice that light-sensitive players make on purpose. Soft navigations keep the attribute on html and do not repeat it.
- Fix: Follow the Next 16.4 guide for themes (preventing-flash-before-hydration.md:244-294). Add a small inline script to head in src/app/layout.tsx that reads pokedraft:theme and sets data-theme on html when the value is dark or light. Parse the value as JSON, because writeJson stores JSON (src/ui/storage.ts:14-21). Wrap the read in try and catch, as the guide does. Add suppressHydrationWarning to the html element, because the script changes its attributes before React hydrates. Leave the ThemeToggle effect in place as the fallback. The repo sets no Content-Security-Policy in next.config.ts or src/proxy.ts, so the script needs no nonce today. Check that CLS stays 0.000, because the script changes colours only.
- Notes: Browser pass lead. Emulate colorScheme light and store pokedraft:theme as the JSON string "dark" in localStorage. Capture the first paint with the page script delayed or the CPU throttled. Repeat with colorScheme dark and the stored value "light". A first-paint screenshot settles the claim.

### SC-39

**Tap to skip and the Scouting notes summary compute under 24 pixels tall** (S3, Yellow, static-only)

- Evidence: Computed from CSS, not measured. The Tap to skip button (src/components/wheel/Wheel.module.css:21-32) sets font-size 0.72rem and padding 2px 0, with no min-height. The reset at src/app/globals.css:179-184 makes buttons inherit the 1.45 line height from the body (globals.css:159). So the button comes to 11.52px times 1.45 plus 4px, which is 20.70px. The Scouting notes summary (src/components/results/FitReveal.module.css:102-110) sets font-size 0.82rem and no padding. It comes to 13.12px times 1.45, which is 19.02px. Both sit under the 24px minimum of WCAG 2.5.8. Every other control computes at 24px or more (see checked). Tap to skip sits in a row with min-height 24px (Wheel.module.css:18), and the wheel root takes the same tap (src/components/wheel/Wheel.tsx:131). Tap to skip is a secondary control on the draft screen. The summary is a disclosure on results.
- Fix: Give both a 24px floor without moving the layout. Add a min-height of 24px to .skip (Wheel.module.css:21-32). The .top row already has a min-height of 24px (:13-19), so the wheel does not move. Add 4px of padding above and below the .why summary (FitReveal.module.css:102-110), which gives 27.02px. Area A decides whether to go on to 44px.
- Acceptance: [3]
- Notes: Browser pass. Measure both elements with getBoundingClientRect at 390 wide. Then test the WCAG 2.5.8 exceptions. The spacing exception needs a 24px circle on the box centre that touches no other target. The equivalent control exception needs a second control with the same function at 24px or more. The wheel root takes the same tap as Tap to skip, but it has no role and no keyboard path. Decide whether it counts as the equivalent control.

### SD-02

**/history and /leaderboard import the engine barrel for constants and pull the data chunk** (S3, Red, static-only)

- Evidence: Both routes carry the 243,173 B chunk although the first screen needs no species data (D-bundle-map.md section 5). Eight files import from the barrel for constants. /history first-load wire 421,937 B and /leaderboard 423,713 B (estimate) against a 176,988 B floor. Reachability by script, bytes are upper bounds. See import-graph.mjs and bundle map section 7.3.
- Fix: Option A1. Rewrite the eight imports to the specific engine modules. Expected /history 421,937 to about 178,764 B and /leaderboard 423,713 to about 180,540 B wire, plus a lighter /leaderboard function. Add a Vitest import-graph guard (RED first against 928e4b1) so the barrel cannot creep back. Prefetch from header links can still pull the chunk at Low priority (SD-08).
- Notes: Behavior preserving. Goldens unchanged.

### SD-03

**Proxy matcher covers /creatures/** and the proxy carries a 1.64 MB dataset copy** (S3, Red, static-only)

- Evidence: proxy.ts:2 imports decodeToken from the ./engine barrel, so the 856,672 B proxy function (19 regions) carries a dataset copy. The matcher (proxy.ts:51-53) covers 2,052 creature files (13,103,566 B). Probe medians for matched URLs were 20.6 to 29.2 ms above excluded ones (single run, n=6 per URL, 24 GETs in a scripted loop, margin between ranges 0.2 ms, suggestive not proof). A / RSC page segment took 1.376 s on a CDN HIT after 16.5 min idle, against 0.148 s a second later (n=1), so a proxy cold start is a candidate (guess). The gate looks off in production (inferred).
- Fix: Preview A/B first (H12). If confirmed, narrow the matcher to routes that need it and move decodeToken to a data free module (A2). Narrowing changes gate semantics, so it is an owner decision.
- Notes: proxy.ts matcher counts as deploy config, so Red.

### SD-07

**Zod classic (111,559 B raw, 32,828 B wire) ships on every route** (S3, Yellow, static-only)

- Evidence: Importers are ui/runs.ts, engine/token.ts, leaderboard/contract.ts, images/packs.ts, components/leaderboard/client.ts and the data modules (client-chains.out). Removing zod from packs.ts alone saves 32,828 B wire only on the four floor routes. Browser zod parses are about 112 ms of the 143 ms estimate at 4x (inferred).
- Fix: Use zod/mini or option C (runtime projection built by a script). Both touch frozen files, so schedule with SD-01.

### SD-08

**Header Link prefetch pulls other routes' chunks, likely including the data chunk** (S3, Yellow, needs-browser-proof)

- Evidence: Saved production RSC payloads for /, /daily and /history each list 39hn4ynhlg-o0.js. The baseline fetched the /daily page chunk (10,862 B) and the /history page chunk (2,141 B) by prefetch, about 34.5 KB. On /how-to-play the data chunk pull is inferred, unproven (H10).
- Fix: Try prefetch={false} on header links as an A/B (H10). Only B, C, D or this change stop the pull.

### SD-09

**/daily LCP content is client rendered after hydration** (S3, Yellow, needs-browser-proof)

- Evidence: Server HTML has no h1, only the kicker 'Loading the daily challenge'. DailyScreen.tsx:13-30 waits for useToday() (null server snapshot, useToday.ts:13-19) and loadPanel().formation (localStorage, server snapshot null). Simulated LCP is a guess of 3.3 to 3.8 s because hydration lands after the last script. Arithmetic floor 2.92 s (inferred).
- Fix: Follow the /leaderboard pattern with connection() and a serverToday prop, and a default formation as server snapshot. Tradeoff is a lambda resume and cold start in place of hydration. Measure H4. Promote to S2 if baseline LCP is 4 s or more.

### SD-10

**21,510 B (60.8%) of the game CSS is not needed for / first paint** (S3, Yellow, static-only)

- Evidence: Game sheet 35,405 B raw, 8,149 B wire. Of it 7,153 B is unreachable and 14,357 B only matters after a tap (css-attrib.mjs). Lighthouse unused-css-rules is empty because it ignores sheets under 10 KiB (unused-css-rules.js:24,55). Render-blocking insight estimates 260 ms.
- Fix: Split per screen CSS or test experimental.inlineCss (H6). Accept only if observed gain exceeds 100 ms at 4x and CLS stays 0.000.

### SD-11

**Font set can be trimmed (Barlow 600 and preloads) and the Big Shoulders override warning needs a build log** (S3, Yellow, static-only)

- Evidence: 20 @font-face blocks, 18 web, all swap. Four latin woff2 files are preloaded, 83,904 B. Barlow Semi Condensed 400, 600 and 700 are three files of about 15.7 KB. Six font-weight 600 rules at most use 600. Big Shoulders is one variable 36,480 B file. layout.tsx:14 sets adjustFontFallback false. The warning text comes from get-fallback-font-override-metrics.js.
- Fix: Collapse Barlow 600 into 500 or 700 (saves a 15,960 B preload) and test next/font/local. Measure LCP and CLS with H5. Check the build log for the warning.

### SD-12

**Stored theme is applied in useEffect, causing a flash and a possible label width shift** (S3, Yellow, needs-browser-proof)

- Evidence: ThemeToggle.tsx:20-29 starts with 'system' and applies the saved theme in an effect. The label flips from Auto to Day or Night at hydration. Baseline CLS 0 covers only the default.
- Fix: Inline head script that sets the theme attribute before paint. Verify with H8 (seed opposite theme, filmstrip at 4x, CLS).

### SD-13

**Decoded image memory during a full 151 draft is bounded but unmeasured on a phone** (S3, Yellow, needs-browser-proof)

- Evidence: Distinct images in a full draft are 49 (8-0), 29 (Daily) and 136 (151). Pixel packs 1.8, 1.1 and 5.0 MB. Art packs 12.8, 7.6 and 35.7 MB decoded (D-bundle-map.md section 12). Node heap for the data is 8.2 MB. No browser heap measurement.
- Fix: Measure heap and decoded image memory on a mid range phone profile. Any change goes through PlayerImage (frozen).

### SD-15

**PlayScreen code is duplicated in the /play and /daily chunks** (S3, Yellow, static-only)

- Evidence: Route chunk inventory in D-bundle-map.md section 2 shows the PlayScreen module in two route chunks instead of one shared chunk.
- Fix: Check chunk grouping in a throwaway build and share the module if the bundler allows. Low value.

### SD-16

**Share card and OG image use max-age=0 must-revalidate, so each save or unfurl hits the heavy function** (S3, Red, static-only)

- Evidence: ImageResponse defaults to public, max-age=0, must-revalidate (image-response.js:56-63). Neither card/route.tsx:20-23 nor opengraph-image.tsx:33 passes headers. The UI's downloadCard fetches /card?... (components/share/download.ts:13-25), so a phone user waits for the render after the tap. Production responses were not requested (cold-start protection), headers are read from source.
- Fix: Use the ImageResponse headers option with a public s-maxage and stale-while-revalidate for immutable run tokens. Staleness tradeoff and CDN deployment scoping are unverified.

### SD-18

**/play and /leaderboard LCP content waits for a function resume that was 1.38 s on one probably cold sample** (S3, Red, needs-browser-proof)

- Evidence: play/page.tsx:13-16 and leaderboard/page.tsx:13-16 use await connection(), so the LCP content streams from the function. Production /play with a real query took 1,380.5 ms total minus first byte on the first request after about 1.7 h of my idle, and 46.0 ms three seconds later (single GETs, n=1, other clients unknown). Bare /play took 41.0 and 36.6 ms. Neon wake-up is unmeasured.
- Fix: Measure with H11. Shrink the function through A2 and B. Do not add a keep warm cron.

### SE-19

**Submit panel guards double submission with state only, lets any late reply overwrite the saved state, and has no request timeout** (S3, Yellow, needs-browser-proof)

- Evidence: SubmitPanel.tsx:49-56: the guard reads status from the render closure (no ref lock) and setStatus at :55 runs unconditionally after the await, so a second in-flight reply (second tab or a retry) can replace a 'done' state with an error; client.ts:110-138 has no AbortController. React flushes a discrete event synchronously, so a same-device double tap is probably already blocked by the disabled button (:100-107); a browser has not confirmed it.
- Fix: Add a useRef in-flight flag, ignore replies from superseded requests (request counter), and a 15 s AbortSignal.timeout with the NETWORK copy. Playwright test: delay the route 2 s, tap Submit twice, expect one POST.
- Notes: Pairs with SE-02, which makes a repeated POST harmless on the server.

### SF-17

**The only narrow-viewport test is a resized desktop window, and its screenshots are written and never asserted** (S3, Yellow, static-only)

- Evidence: `e2e/leaderboard.spec.ts:112-133` runs on Desktop Chrome with `setViewportSize({ width, height: 900 })` (`:116`) for widths 390 and 1440. A phone has touch, DPR 3, a 664 to 750 px tall visual viewport and safe-area insets, and this test models none of them. The overflow probe `widestRight` (`:104-110`) is sound, but it covers `/daily` start and `/leaderboard` at two widths, while GATE 4 assertion 2 asks for every route at 320, 360, 390 and 430 px. The test writes two full-page screenshots per width (`:127,132`) and asserts nothing about them, and the HTML report uploads only on failure (`ci.yml:62-68`), so nobody sees them. The height of 900 is taller than any phone viewport, so no 'reachable without scrolling' result can come from it. No `toHaveScreenshot` or snapshot matcher exists anywhere in the repo (grep, single pass).
- Fix: Move the overflow check into `e2e/mobile-acceptance.spec.ts` as a loop over every route and the widths 320, 360, 390 and 430 with `expect(await widestRight(page)).toBeLessThanOrEqual(width)`, run under the phone projects from SF-01. Delete the two `page.screenshot` calls or turn them into `toHaveScreenshot` assertions with a reviewed baseline. Rename the desktop-sized test so it no longer reads as phone coverage.
- Acceptance: [2]

### SF-25

**The picker is a full-height native dialog with no swipe or back-button handling and no phone test, while GATE 4 asks for both** (S3, Yellow, needs-browser-proof)

- Evidence: `src/components/builder/Picker.tsx:93-101` renders a native `dialog` that closes through its Close button (`:116-123`), a backdrop click (`:98-100`) and Escape. `:53-57` calls `showModal()` and focuses the search box on mount, which raises the on-screen keyboard on a phone as soon as the sheet opens. `src/components/builder/Picker.module.css:1-11` makes the dialog `100dvh` high below 720 px (`:205-214` turns it into a centered modal above that), so on a phone it is a full-screen page and not a bottom sheet with a drag handle. The list scrolls on its own (`:113-121`, `overflow-y: auto` and `overscroll-behavior: contain`). A grep of non-test `src` for `popstate`, `pushState`, `history.back`, `CloseWatcher`, `onCancel` and touch or pointer handlers finds none in the picker, and the only history call is `replaceState` at `src/components/home/HomeScreen.tsx:67`. `Builder.test.tsx:11-13` replaces `showModal`, and no e2e test opens the picker (a grep of `e2e` and `e2e-live` for `searchbox`, 'Pick for', 'Close picker' and `dialog` finds nothing). GATE 4 assertion 4 asks that the sheet opens, scrolls its own list and closes on swipe and on the back button. What the platform back gesture does to a native modal `dialog` differs by engine and was not checked here.
- Fix: Add the picker cases to `e2e/mobile-acceptance.spec.ts` in the phone projects. 'The picker opens as a sheet and its list scrolls without moving the page' taps an empty slot, expects `dialog[open]`, scrolls the `Species` list and expects `window.scrollY` unchanged. 'The back button closes the picker' calls `page.goBack()` with the dialog open and expects it closed and the URL still on the builder. 'A swipe down closes the picker' dispatches a touch drag from the header downward and expects it closed. Expect the last two to fail on the current build and hand them to the UI lane as findings, with the fix proposed there (a history entry pushed on open and a close on `popstate`). In `Builder.test.tsx` add the case that Escape on the dialog calls the close path.
- Acceptance: [4]
- Notes: This is a lead for the UI lane as much as a test gap. A test written from the GATE 4 text cannot go green without a code change, so the Red-then-Green order of the repo's guard-test rule applies.

### SB-08

**How to Play never states 12 rules a player meets (Daily, leaderboard, extra time and penalties, awards, the 0 to 1000 scale, engine versions)** (S3, Yellow, static-only)

- Evidence: B-howtoplay-claims.md Table 2 lists N01 to N12. The page has sections for the builder, the two challenges, the cup, Team Score, fair rolls and friendlies only (src/app/how-to-play/page.tsx:7-64): no Daily, Leaderboard or Awards section. The leaderboard ordering and top 50 appear only on /leaderboard (src/components/leaderboard/LeaderboardScreen.tsx:74-79). Results show 'a.e.t.' and 'N-N on pens' with no definition (src/components/results/MatchList.tsx:76; src/components/results/format.ts:26-38). The submit panel says 'today's daily board' (src/components/leaderboard/SubmitPanel.tsx:58) without saying the Daily seed switches at New York midnight (src/leaderboard/daily.ts:10) or that the server still accepts yesterday's run (daily.ts:43-51). The dispatch 6 shootout rule (5 kicks, sudden death to 200 pairs, then a seeded coin: src/engine/coefficients.ts:114) is stated nowhere a player reads. Terminology T10 to T13, T28 to T30.
- Fix: Add three short sections to how-to-play/page.tsx: 'The Daily' (one seed a day, switching at midnight New York time, one run per nickname per day), 'Leaderboard' (ranked by wins, draws, then Team Score, earliest first, top 50, nickname rules, 10 submissions an hour) and 'Reading the results' (extra time, penalties, awards, the 0 to 1000 scale). Suggested sentences are in Table 2 of B-howtoplay-claims.md. Hold N07 (fit versus quality) until carryover #2 lands.

### SB-09

**Nickname hint omits the character rule, one sentence covers three rejections, and a 21 to 30 character entry silently disables Submit** (S3, Yellow, static-only)

- Evidence: The hint is '2 to 20 characters. Shown publicly next to your record.' (src/components/leaderboard/SubmitPanel.tsx:109-111). The server also allows only letters, numbers, space, underscore, dot and hyphen (regex at src/leaderboard/nickname.ts:3) and rejects a 12-word blocklist matched as a substring after leet folding (nickname.ts:6-19, 41-45). All three failures return NICKNAME_INVALID, which the player sees as 'That nickname is not allowed. Try a different one.' (SubmitPanel.tsx:14), so a player cannot tell which rule fired. The server computes the reason (nickname.ts:34, handlers.ts:137-138) but the client reads only the code. The input accepts up to 30 characters (maxLength = NICKNAME_MAX + 10, SubmitPanel.tsx:95) while 'valid' is true only for 2 to 20 trimmed characters (SubmitPanel.tsx:47), so at 21 to 30 characters Submit is disabled with no message. Hand traced with a scratch copy of the rules (not repo code, nothing executed against the repo): O'Brien and any emoji fail the character rule, and 5 of the 1025 species names fail it too (the two Nidoran symbols, Farfetch'd, Type: Null, Sirfetch'd). Terminology section 15a.
- Fix: Hint: 'Letters, numbers, spaces, underscore, dot and hyphen. 2 to 20 characters. Shown publicly next to your record.' Show the length state inline (for example '23 of 20') instead of a silently disabled button, and set maxLength to NICKNAME_MAX. Optional (Red, contract change): return the reason with NICKNAME_INVALID so the client can say 'Use letters, numbers, spaces, _ . - only' or 'Pick a different name'. Without a contract change, one sentence that lists the character rule is enough.

### SB-10

**'Leaderboard' names three different things, 'board' and 'leaderboard' are mixed, the board error repeats itself, and the empty-board copy invites 'claim the top spot' on dates no one can submit to** (S3, Yellow, static-only)

- Evidence: aria-label 'Leaderboard' is on the submit form region (src/components/leaderboard/SubmitPanel.tsx:64 and :83) and on the ranked list (src/components/leaderboard/Board.tsx:64), besides the page h1 and the nav link, so a landmark list holds two regions with one name for different content. Visible copy alternates 'board' and 'leaderboard' (SubmitPanel.tsx:25 'already on the leaderboard', :58 'today's daily board' and 'the all-time board', :68 'the daily board'). Board.tsx:44 prints an ERROR_COPY sentence that already says it failed (Board.tsx:10-14) and then adds 'The board could not be loaded.' Board.tsx:55 shows 'No entries yet. Finish a run and submit it to claim the top spot.' for any date, but the date input accepts any past day (src/components/leaderboard/LeaderboardScreen.tsx:63-70, max only) and the server accepts only today's or yesterday's seed (src/leaderboard/daily.ts:43-51); the CTA 'Play the daily' (Board.tsx:56-57) opens today's Daily, not the empty date. Terminology T19, T20.
- Fix: Rename the submit region to 'Submit to the leaderboard' (SubmitPanel.tsx:64, 83) and keep 'Leaderboard' for the list; use 'leaderboard' in sentences and 'board' only for the Daily and All-time lists; drop the duplicate sentence in Board.tsx:44; show 'claim the top spot' only for today's Daily and the all-time boards, and plain 'No entries on this date.' otherwise.

### SB-11

**Board INVALID_QUERY has no copy of its own, and a hand-edited date blames the server** (S3, Yellow, static-only)

- Evidence: src/leaderboard/contract.ts:38-41 defines two board error codes, INVALID_QUERY (400) and DB_UNAVAILABLE (503). src/components/leaderboard/client.ts:89-92 maps everything except DB_UNAVAILABLE and 503 to 'unexpected', and Board.tsx:13 and :44 then print 'The leaderboard sent a reply we could not read. The board could not be loaded.' The client accepts any ####-##-## date (ISO_DATE, src/components/leaderboard/client.ts:21 and :55) while the server validates with toIsoDate (contract.ts:78-90), so /leaderboard?scope=daily&date=2026-13-45 reaches the server, comes back 400, and is described as the server's fault. 'Try again' (Board.tsx:45-47) repeats the same bad request. Terminology section 15b.
- Fix: Give INVALID_QUERY its own sentence ('That date is not valid. Showing today's board instead.') or fall back to today's date; validate with the same strict parse on the client (reuse toIsoDate from the contract); show 'Try again' for the offline and network errors only.

### SB-12

**A blank ?seed= makes 'Start run' do nothing: the empty seed reaches the engine and throws inside the click handler** (S3, Yellow, needs-browser-proof)

- Evidence: parsePlayQuery returns the raw q.get('seed') (src/ui/settings.ts:93), which is the empty string for /play?...&seed= (not null). PlayScreen.start treats any non-null query seed as real (src/components/run/PlayScreen.tsx:103-108) and calls startRun inside the Start run click handler (PlayScreen.tsx:109; button at :192). With Squad First (the default) startRun calls createDraft, whose first round rolls at once (src/engine/draft.ts:231-238, roundPhase :228, freshRoll :217, rollFor :180-182), and deriveSubseed throws RangeError on an empty or whitespace seed (src/engine/rng.ts:75-77). With Position First the throw comes on the first slot choice instead, because step rethrows any non-DraftError (src/components/run/runState.ts:69) and onAction calls step directly (PlayScreen.tsx:170). Either way the exception is uncaught in an event handler: React keeps the tree, the panel stays and the click appears dead. Hand traced from the source, not exercised, so the console and screen behaviour are unconfirmed.
- Fix: In parsePlayQuery (src/ui/settings.ts:93) treat a blank or whitespace-only seed as absent (const raw = q.get('seed'); const seed = raw === null || raw.trim() === '' ? null : raw;) so the page falls back to a fresh random seed, and add unit tests for '?seed=' and '?seed=%20'. Optional: catch non-DraftError exceptions in PlayScreen's start and onAction and show the existing failure line instead of failing silently.
- Notes: Browser repro: open /play?mode=cup8&f=4-3-3&order=squadFirst&g=123456789&style=open&seed= and press Start run; repeat with seed=%20 and with order=positionFirst. Raise to S2 if the browser shows a crash or a stuck panel.

### SB-13

**An undecodable ?b= lineup link is dropped silently** (S3, Yellow, static-only)

- Evidence: src/components/home/HomeScreen.tsx:41-55 restores a lineup from ?b= through draftFromBuilderToken (src/ui/lineup.ts:73-82), which returns null for a malformed token, an unknown version or a token that is not a builder token. A null result falls through to the saved panel and a fresh draft, and the effect at HomeScreen.tsx:61-68 then cleans the address, so a visitor who opened a friend's lineup link sees an empty builder and no explanation. Contrast /r/ links, which say 'Run not found. This run link is broken or from an older version.' (src/components/results/BrokenRun.tsx:7-8). Terminology section 15d.
- Fix: Show a one-line notice in the builder status region (Builder.tsx:191-193) when ?b= was present and did not decode: 'That lineup link could not be opened, so you are starting a fresh XI.' Keep the cleaned address. Test HomeScreen with an invalid b value.

### SB-14

**Builder 'Reset' also resets and saves the challenge settings, next to 'Clear all', with no explanation** (S3, Yellow, static-only)

- Evidence: src/components/builder/Builder.tsx:170-180 puts 'Clear all' (disabled when the lineup is empty) beside 'Reset' (disabled only while animating). Reset calls onReset, which sets the panel to DEFAULT_PANEL, saves it and starts a fresh draft (src/components/home/HomeScreen.tsx:100-104): it silently overwrites the saved formation, generations, draft style, order, legendaries and Show ratings in localStorage, not just the lineup. Neither button says what it resets, and How to Play lists 'start over' without naming a button (src/app/how-to-play/page.tsx:12; claims row C07).
- Fix: Rename Reset to 'Reset settings and lineup' (or add a hint under the toolbar), or make it clear the lineup only and move the settings reset into the panel. If the behaviour stays, print 'Settings and lineup reset' in the status line after the click.

### SB-15

**Terminology is inconsistent across the product (36 entries): rating, fit formats, Synergy versus link, builder/XI/squad, five Daily names, region versus generation, six verbs, seven buttons that go to /** (S3, Yellow, static-only)

- Evidence: B-terminology.md lists every wording with file:line (T01 to T36). Examples: 'rating' means both the per-player fit (src/components/home/SidePanel.tsx:106, 185) and a team strength on the 0 to 1000 scale (src/components/run/RoadStrip.tsx:18, 46; src/components/results/MatchList.tsx:81, 98) (T01); 'Casual sighted mode' reads as an accessibility term (SidePanel.tsx:186, T02); fit prints in three formats (T03); the legend says 'Synergy link between neighbours' (src/components/results/ResultsView.tsx:166-167) while every sentence says 'link' (T06). A hand-built team is builder, Friendly, XI, lineup, squad and side (src/components/builder/Builder.tsx:133-134, T07); the Daily has five names (T10); region and generation are two vocabularies for one switch (T17); the core action has six verbs (T23); seven phrases ('Play a new run', 'Start a run', 'Play a run', 'Start drafting', 'Back home', 'Back to the start', 'Play your own') all go to / (T24); round, game and match interchange (T28, T29); 'neighbours' is the one UK spelling (T31); 'Control desk' (SidePanel.tsx:92, T36); the same string 'Friendly (not ranked)' lives twice (src/ui/runs.ts:20 and src/ui/labels.ts:60, T09).
- Fix: Add a small glossary module (extend src/ui/labels.ts) holding the canonical player-facing names (challenge names, Team Score, fit, opponent score, verbs) and import it where they are printed; pick one noun per concept using the suggestions in B-terminology.md; use 'neighbors' and 'Settings and records' (the name the toggle already uses) instead of 'neighbours' and 'Control desk'; import FRIENDLY_LABEL into runs.ts. Copy only, no engine change.

### SB-16

**The Home panel controls have no inline help and apply unevenly across the Play buttons and the builder** (S3, Yellow, static-only)

- Evidence: src/components/home/SidePanel.tsx:139-189 offers Generations, Draft style, Order, Legendaries and Show ratings for every Play button, but: Draft style reaches only the 8-0 Challenge (playHref adds g and style only for cup8, src/ui/settings.ts:77-80); Generations reach the 8-0 Challenge and the builder pool but not the 151 Challenge (src/ui/settings.ts:61-68 and :78); Order reaches both challenges and not the builder (src/ui/settings.ts:72-76); Legendaries and Show ratings reach only the builder. Only two of the five say so (hint 'Builder pool' at SidePanel.tsx:180 and the label '(builder)' at :185). 'Draft style' and 'Order' have no hint at all (SidePanel.tsx:166-177), and the only explanation of Open, Classic, Squad First and Position First is on How to Play. Terminology T14, T15.
- Fix: Add a one-line hint under Draft style ('8-0 Challenge only. Open lets you take any matching Pokémon, Classic offers 3') and Order ('Squad First shows the roll before you pick a slot'), mark Generations '8-0 Challenge and builder', or group the controls under two headings (Challenge settings, Builder settings). Rename 'Order' to 'Pick order'.

### SB-17

**The W-D-L record is unlabelled on the share card, in the run title and in the history row** (S3, Yellow, static-only)

- Evidence: src/components/share/card.tsx:356-361 prints the record at 96px with no label while Team Score has one (card.tsx:333 'TEAM SCORE'). src/app/r/[token]/title.ts:7 builds 'pokedraft run: 5-2-1, Team Score 812' and src/components/history/HistoryList.tsx:52 shows the bare record. The results page labels it 'Record W-D-L' (src/components/results/ResultsView.tsx:57) and the board labels it 'W-D-L' (Board.tsx:79). A recipient who does not play reads '5-2-1' in a chat preview without a unit. Terminology T21, T22.
- Fix: Add a small caption on the card ('WINS-DRAWS-LOSSES' above or below the record, same font as the Team Score label), use 'pokedraft run: record 5-2-1, Team Score 812' in title.ts, and add the 'W-D-L' caption to the history row as the board does. Copy only; the card stays 1200x630.

### SB-18

**Home hierarchy: four primary buttons compete, the challenge Play links sit in a panel called 'Control desk', and the h1 is the friendly builder with no one-line description of the game** (S3, Yellow, static-only)

- Evidence: Home renders four btn--primary controls: Randomize (src/components/builder/Builder.tsx:167), 'Play a friendly cup' (Builder.tsx:196-206) and the two Play links in the panel (src/components/home/SidePanel.tsx:99-104). The panel is first in the DOM (src/components/home/HomeScreen.tsx:95-96), sticky on desktop (src/components/home/HomeScreen.module.css:14-17) and named 'Control desk' (SidePanel.tsx:92). The h1 is 'Build your XI' under the kicker 'Friendly builder' (Builder.tsx:133-134): the first screen presents the unranked mode as the purpose of the page, while the 8-0 and 151 Challenges and the Daily are two buttons in a settings panel and a header link. No sentence on Home says what the game is; that lives only on /how-to-play. CSS-derived estimate at 1440x900: the builder toolbar and 'Play a friendly cup' end around y 925 to 996, at or below the fold (see SB-21). Terminology T24, T36.
- Fix: Give Home a one-line description under the h1 ('Draft a squad from random region and type rolls, then play a cup.'), make the challenge Play links the single dominant action (or promote them above the settings), demote Randomize to the secondary style, and keep 'Play a friendly cup' primary only once the lineup is full. UI hierarchy only; verify CLS stays 0.000.

### SB-19

**No automated guard for the 'no em dashes in user-facing copy' invariant** (S3, Yellow, static-only)

- Evidence: The repo-wide dash grep (U+2014, U+2013, HTML and escape forms, ' -- ') found no hit in any user-facing string, metadata, aria-label, OG or card text; the saved production bodies of /play, /daily, /history, /how-to-play and /robots.txt (GET 2026-10-10) are clean too. Hits are only CLAUDE.md:108 and :110, AGENTS.md:108 and :110, src/engine/__tests__/recap.test.ts:94, src/components/__tests__/PackCredit.test.tsx:37 and the regex literals in src/scouting/review.ts:49 and its two retained copies (B-terminology.md section 16). The invariant is guarded only in narrow places: the scouting rationale refine (src/scouting/review.ts:49), PackCredit.test.tsx:37 (credit line only), recap.test.ts:94 (recap text) and the review prompts (scripts/data/review-rubric.md:72, scripts/review/glm-review.sh:62). Nothing scans the strings in src/app, src/components and src/ui, the page metadata objects, aria-label values or the card and OG text, so a new string can regress it unnoticed.
- Fix: Add one test (agent F's area) that renders each route and the metadata, runTitle and card text builders and asserts no U+2014 or U+2013 in text content, title and aria-label values, or a cheap script that scans string literals in src/**/*.tsx outside comments. Test only; no copy change.
- Notes: Currently clean, so this is a guard gap and not a defect.

### SB-20

**Results: the sticky pitch column is estimated taller than a 900px viewport, so its bench and legend clip while stuck** (S3, Yellow, needs-browser-proof)

- Evidence: ESTIMATED from CSS, nothing rendered. At 960px or wider .fitGrid is two equal columns of about 616px at 1440 wide (src/components/results/ResultsView.module.css:328-337) and .pitchCol is max 520px, sticky at top 16px (ResultsView.module.css:333-347). At 520px the pitch container is below 640px, so the field stays portrait (src/components/pitch/Pitch.module.css:12 aspect 68/105, landscape only from the 640px container query at :235-237): 520 x 105/68, about 803px tall. With the bench row and the legend the column is an estimated 960 to 1000px, taller than a 900px viewport (868px usable under the 16px sticky offset). A sticky element taller than the viewport pins its top and its bottom stays out of reach until the grid ends, so the bench and legend are cut off while the right column scrolls.
- Fix: CSS only: cap the column (max-height: calc(100dvh - 32px) with overflow: auto) or size the field from the viewport height, or apply the sticky rule only under @media (min-height: 1000px). Measure at 1440x900 and 1280x720 first, and keep CLS 0.000 and Accessibility 100.
- Notes: Measure with the browser agent: getBoundingClientRect().height of .pitchCol at 1440x900. If it is 868px or less, drop this finding.

### SB-21

**Wide-screen use of space: the 900px pitch tier is unreachable on Home, the Home toolbar and 'Play a friendly cup' sit at or below the fold at 900px, and the draft pitch is only about 684px wide** (S3, Yellow, needs-browser-proof)

- Evidence: ESTIMATES from CSS, nothing rendered. .page is max 1280px with a 16px gutter (src/app/globals.css:53, 427-432), so content is 1248px. The Home grid at 1024px or wider is a 340px panel, a 24px gap and an 884px builder column (src/components/home/HomeScreen.module.css:8-17). The Pitch container queries step at 640px and 900px (src/components/pitch/Pitch.module.css:235-291): 884px is below 900px, so the 84px-token tier never applies on Home at any desktop width (it is reached only on the single-column Home at roughly 932 to 1023px viewports). Builder column height estimate: field about 572px (884 x 68/105), bar about 76px, bench about 120px, so the toolbar and 'Play a friendly cup' end around y 925 to 996, below the 900px fold. The draft board at 960px or wider uses columns minmax(0,1.25fr) minmax(360px,1fr) (src/components/run/DraftBoard.module.css:11-25), about 684px for the pitch (443px tall) on a 1440 screen, sticky at top 16px. The 340px Home panel is always open at 1024px or wider and sticky (HomeScreen.module.css:14-17); whether its four sections fit in 868px is unmeasured.
- Fix: Lower the large-token container breakpoint to about 860px (or widen the Home builder column to 940px by narrowing the panel to 300px) so the 84px tier is reachable on Home; move 'Play a friendly cup' into the sticky panel or above the bench on desktop so the main action stays above the fold; consider a taller draft pitch at 1440. Verify each at 1440x900 and 1280x720 with the browser agent and keep CLS 0.000.
- Notes: Measure: .wrap width on Home at 1440 (expect 884px or less), the toolbar bottom edge, the draft pitch box and the panel height.

### SB-23

**On a shared run the only 'play' call to action is a ghost 'Play your own'; the primary button is 'Share'** (S3, Yellow, static-only)

- Evidence: src/components/results/ShareActions.tsx:43-45 makes Share the btn--primary on every variant, and :54-58 renders 'Play your own' as btn--ghost for the shared variant only. A visitor arriving from a friend's link, who is the person most likely to start a first run, sees a primary 'Share' (copy a link they do not need) and a low-emphasis ghost link to / (the builder, not a challenge). Terminology T24, T25.
- Fix: For variant='shared' make 'Play your own' the btn--primary and Share the secondary; consider pointing it at the challenge start (/play?mode=cup8...) instead of the builder. Add a ShareActions test per variant.

### SB-24

**No designed fallback for no-JS or a render crash: /daily and /history serve only 'Loading ...', /play's content sits in a hidden block, and there is no noscript, error.tsx, global-error.tsx or loading.tsx** (S3, Yellow, static-only)

- Evidence: Saved production HTML (GET 2026-10-10): /daily and /history contain only the Suspense fallback text ('Loading the daily challenge', 'Loading your runs') and no content block (src/app/daily/page.tsx:10; src/components/history/HistoryList.tsx:36). /play and /play?mode=... put the real content (the invalid-link section or the Start run panel) inside a hidden div id='S:0' that an inline $RC script swaps in, with 'Loading the challenge' visible until then. find src finds only not-found.tsx and run-not-found/not-found.tsx (no error.tsx, global-error.tsx, loading.tsx or template.tsx), and neither src nor the saved pages contain a noscript. STATE.md:21 says the first response of /play and /leaderboard 'already holds their content': true for crawlers, but only as a hidden block that needs JS to show. So a no-JS visitor, a failed script load or a blocked chunk sees an endless 'Loading ...', and a thrown render error shows the framework's default error page (not exercised).
- Fix: Add src/app/error.tsx and global-error.tsx with a short apology, a 'Try again' (reset) button and a link home; add a noscript line in layout.tsx ('pokedraft needs JavaScript to run the draft'); optionally render the static heading and a one-line description of /daily and /history outside the Suspense boundary so the fallback is not the only content. Copy and structure only.

### SB-25

**Known carryover #2: cards show raw fit while the engine rates role-relative quality, so 'weakest' flags and the Team Score copy can disagree with the numbers on screen** (S3, Yellow, static-only)

- Evidence: dispatch-7.md carryover #2. Team Score's core reads a percentile of fit among all 1025 species at that role (src/engine/team.ts:57-68, src/engine/species.ts:32-56) while the screens print raw fit (src/components/results/FitReveal.tsx:32-33; the builder token note, src/components/builder/Builder.tsx:117-127). The legend flags 'One of the 3 weakest spots' (src/components/results/ResultsView.tsx:170) by that quality, so a flagged row can show a higher fit than an unflagged one (docs/reports/finish-ratings-notes.md items 2 and 3). How to Play C35 (src/app/how-to-play/page.tsx:46, 'It mostly comes from how well each player suits the spot they play') is true in spirit but reads as raw fit. Terminology T04.
- Fix: Fix with carryover #2 in the first Yellow PR: show the role-relative number ('vs other keepers') next to or instead of raw fit and make the weakest highlight use the same quantity, then update how-to-play/page.tsx:46-47, ResultsView.tsx:166-170 and Table 2 N07 in the same change. Hold the How to Play rewrite until then so the copy changes once. Display only; no engine change.

### SB-27

**ARIA roles promise keyboard behaviour that is absent (toolbar, tablist, radiogroup), aria-label sits on a span and a div with no role, and the Sound toggle name flips with aria-pressed** (S3, Yellow, static-only)

- Evidence: role='toolbar' (src/components/builder/Builder.tsx:166), role='tablist' and role='tab' (src/components/leaderboard/LeaderboardScreen.tsx:30, 35) and role='radiogroup' and role='radio' (LeaderboardScreen.tsx:45, 50) imply arrow-key roving focus, but no key handler exists in src (rg: no keydown or onKeyDown), so every item is its own tab stop. aria-label sits on a span with no role (src/components/results/FitReveal.tsx:32) and on a div (src/components/results/MatchList.tsx:81), where it is not reliably announced. The Sound toggle changes its visible label between 'Sound on' and 'Sound off' while also setting aria-pressed (src/components/wheel/SoundToggle.tsx:11-14), so a screen reader says 'Sound on, pressed'. Terminology T35 and the aria table in section 14. Semantic mismatches found by reading the markup; no screen reader was run. Agent C owns the live check.
- Fix: Either implement the arrow-key behaviour (roving tabindex) or drop the roles: plain button groups for the toolbar and the mode radios, links or a real tablist with arrow keys for the board switch; move the aria-label to a role-bearing element or use visually hidden text; give the Sound toggle one stable name ('Sound') and let aria-pressed carry the state. Keep Accessibility 100.

### SB-28

**The header nav has no current-page state** (S3, Yellow, static-only)

- Evidence: src/app/layout.tsx:39-46 renders four plain links (Daily, Leaderboard, How to play, History) plus the image settings and theme toggle; rg finds no aria-current or usePathname in src, and the nav only has a hover rule (src/app/globals.css:423). Nothing marks the current route on /daily, /leaderboard, /how-to-play or /history. Next's own docs warn that usePathname needs a Suspense boundary under cacheComponents (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md:72-77) and can hydrate with a mismatch behind a Proxy or rewrites (use-pathname.md:37); this app's proxy rewrites undecodable /r/ links to /run-not-found (src/proxy.ts:26-30), where no nav item should be current anyway.
- Fix: Extract the nav links into a small client component that reads usePathname inside a Suspense boundary and sets aria-current='page' plus a CSS state on the matching link; keep the rest of the header server-rendered. Add a component test that mocks usePathname.

### SB-29

**.chip, .segment, .tab and .switch controls have no hover state** (S3, Yellow, static-only)

- Evidence: Hover rules exist for .btn (src/app/globals.css:241), .btn--primary (:260), the nav links (:423) and the image-settings summary (:467). .chip (globals.css:274-296), .segment (src/components/home/SidePanel.module.css:121-138), .tab (src/components/leaderboard/LeaderboardScreen.module.css:21-38) and .switch (SidePanel.module.css:140-152) only set cursor: pointer, so the Generations chips, the Formation, Style and Order segments, the leaderboard tabs and the switches give no hover feedback on desktop. Keyboard users are covered by the global :focus-visible ring (globals.css:186). The How to Play table-of-contents links also use .chip (src/app/how-to-play/page.tsx:79).
- Fix: Add a :hover rule (one background step from the existing tokens) behind @media (hover: hover) so touch devices do not get sticky hover; keep sizes unchanged (CLS 0.000) and check contrast in both themes with agent A.

### SB-30

**Run-card image routes set no cache headers of their own (Next default 'public, max-age=0, must-revalidate'), and PNG size, cold render time and platform caching are unmeasured** (S3, Red, needs-browser-proof)

- Evidence: /card (src/app/card/route.tsx:19-23) and /r/[token]/opengraph-image (src/app/r/[token]/opengraph-image.tsx:32-33) call ImageResponse without a headers option. In production Next defaults to 'public, max-age=0, must-revalidate' (node_modules/next/dist/server/og/image-response.js:55-63) and options.headers overrides it (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md:34); the docs cap the bundle at 500KB (image-response.md:51). For a dynamic image route the webpack metadata loader just returns the handler's response (node_modules/next/dist/build/webpack/loaders/next-metadata-route-loader.js:189-199), so that header is what is sent; next.config.ts:18-21 sets Cache-Control only for /creatures. Each render reads up to 11 creature files from disk and, for WebP packs, re-encodes them with sharp before satori draws (src/components/share/card-images.ts:14-41, 50-58). A link-preview bot (WhatsApp, iMessage, Slack, Discord, X) therefore probably triggers a fresh render per unfurl, and /card is public even when the friends gate is on (src/passcode.ts:6-16). The Next docs say generated opengraph-image routes are cached by default unless they use request-time APIs (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md:91-93), and 'max-age=0, must-revalidate' is also what cached output carries, so the header alone does not prove a render per request. NOT measured: those URLs are off limits on production (cold-start protection), so whether the platform caches them (the x-vercel-cache header), the PNG bytes (WhatsApp prefers a small image) and the cold TTFB are unverified. The Turbopack equivalent of the metadata route loader was not read.
- Fix: Pass a headers option to ImageResponse in both routes, for example 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800' (a run token always renders the same card for the same deployment), then confirm on a preview deployment with curl -sI and the x-vercel-cache header, and that a deploy refreshes the cache. Measure PNG bytes and cold TTFB; if /card is hammered, rate-limit it with the existing limiter pattern. Red because it is route, cache and deploy behaviour.
- Notes: Raise to S2 if cold TTFB on a preview deployment is above about 3 seconds or the PNG is large enough that WhatsApp drops the image.

### SB-32

**Several submit errors give no next step or read as accusations (ILLEGAL_ACTION, DAILY_ALREADY_SUBMITTED, DUPLICATE_TOKEN, DAILY_SETTINGS_MISMATCH)** (S3, Yellow, static-only)

- Evidence: src/components/leaderboard/SubmitPanel.tsx:12-30. ILLEGAL_ACTION says 'This run breaks a draft rule, so it cannot be ranked.' (:17); it sounds like cheating and a normal player cannot reach it, since the client replays only engine-legal actions. DAILY_ALREADY_SUBMITTED (:23-24) and DUPLICATE_TOKEN (:25, 'This run is already on the leaderboard.') give no link to the board, and DAILY_SETTINGS_MISMATCH (:19-20) does not say what the daily settings are. The only 'View leaderboard' link appears in the success state (SubmitPanel.tsx:72-77). Terminology section 15a.
- Fix: Put a 'View the leaderboard' link under every conflict error; reword ILLEGAL_ACTION to 'This run could not be verified, so it cannot be ranked. Start a new run.'; make DAILY_SETTINGS_MISMATCH say 'The Daily is the 8-0 Challenge in Open, Squad First, all generations. Start it from the Daily page.' Keep SUBMIT_ERROR_COPY a Record<SubmitFailure, string> so the compiler keeps enforcing coverage.

### SB-33

**The nickname blocklist is a substring match, so ordinary words and one Pokémon name are rejected (hand traced, not run)** (S3, Red, static-only)

- Evidence: src/leaderboard/nickname.ts:5-19 documents 'A light filter for one friend group, not a moderation system.' and lists 12 words, matched as a substring after leet folding and stripping every non-letter (nickname.ts:41-45). Hand traced with a scratch copy of the rules (not repo code): blocked are Cofagrigus (a Pokémon), Mr Ape and Mr. Ape (the space is stripped), Grapes, Trapeze, Scraper, Therapeutic, Niggle, Retardant, Scunthorpe, Nazim, Fagin and Fagus; accepted are Drapion, Kazi and Hitchhiker. Across the 1025 species names exactly 1 is blocked (Cofagrigus) and 5 are rejected for characters (the Nidoran symbols, Farfetch'd, Type: Null, Sirfetch'd). The player sees only 'That nickname is not allowed. Try a different one.' (SubmitPanel.tsx:14), so a blocked Pokémon name is unexplained (SB-09).
- Fix: Product call (leaderboard validation is Red): match whole words after folding, with a small allowlist of known false positives, or keep the substring rule only for the longest terms; add test cases (Scunthorpe, Cofagrigus, Grapes, Therapeutic) to the nickname tests; decide whether the apostrophe should be allowed so Pokémon names like Farfetch'd work. Do not weaken the list without an owner decision.
- Notes: Low priority by the file's own stated intent; listed because this is a Pokémon game and Cofagrigus is a plausible nickname.

### SB-34

**Lead refuted: the friends gate does not block link-preview bots** (S3, Yellow, refuted)

- Evidence: src/passcode.ts:6-16 keeps /card, /r/*/opengraph-image, /gate, /gate/unlock, /robots.txt, /_next/static and /favicon.ico public when the gate is on, and src/app/gate/page.tsx:10-24 re-emits the run's title and the public opengraph-image URL on the gate page that a bot is redirected to (src/proxy.ts:34-48). The gate is off unless a passcode is configured (STATE.md:17, src/proxy.ts:33-34); it is off in production: my GETs of /play, /daily and /how-to-play on 2026-10-10 returned 200 with no redirect to /gate, and STATE.md:7 lists no passcode variable among the production env names. X-Robots-Tag noindex (next.config.ts:15) governs indexing, not unfurling, and robots.txt allows Twitterbot, facebookexternalhit, Discordbot, WhatsApp, Slackbot-LinkExpanding and TelegramBot (src/app/robots.ts:5-20; production /robots.txt matches, GET 2026-10-10).
- Fix: None. Keep the allowlist in sync with PUBLIC in src/passcode.ts when a new image route is added. Real previewers (iMessage in particular) were not tested.

### SB-35

**Lead refuted: bare /play is not a dead end** (S3, Yellow, refuted)

- Evidence: src/components/run/PlayScreen.tsx:37-58 renders an explained invalid-link section ('That challenge link does not work') with a primary 'Back home' link when parsePlayQuery returns null (src/ui/settings.ts:85-102). The saved production response of bare /play contains that text and the link inside the hidden block that the inline script reveals (GET 2026-10-10).
- Fix: None. The only caveat is the no-JS case covered by SB-24.

### SB-36

**Lead refuted: og:description and twitter:description are not missing on /r/ pages** (S3, Yellow, refuted)

- Evidence: Next fills twitter fields from openGraph and inherits a missing title and description from the root metadata (node_modules/next/dist/lib/metadata/metadata-resolution-primitives.js:388-440), so /r/[token] (src/app/r/[token]/page.tsx:7-11) gets the root description (src/app/layout.tsx:27) on og and twitter, and twitter:image inherits the OG images. What is true is that the inherited description is generic, which is SB-22. This could not be confirmed on production (/r/* not allowed); it rests on the framework source.
- Fix: None for the missing-tag claim; see SB-22 for the wording.

### SC-02

**CI axe scan of /play checks the invalid-link page, not the game** (S3, Yellow, static-only)

- Evidence: The spec at e2e/a11y.spec.ts:10 scans /play?mode=builder&formation=4-3-3&gens=1. parsePlayQuery reads the formation from the f parameter, not formation, and accepts only the modes cup8 and kanto151 (src/ui/settings.ts:85-101). It returns null for this URL. So PlayScreen renders the h1 "That challenge link does not work" with a Back home link (src/components/run/PlayScreen.tsx:40-50). The unit test src/components/run/__tests__/run.test.tsx:76 pins that h1. The spec waits only for the footer (a11y.spec.ts:21), so the scan can also run before hydration. The report at docs/reports/finish-qa.md:105 counts 8 tab stops on /play. That equals the 7 header stops plus the one link on the invalid page. It also equals the 7 plus the Start run button on the real start screen. So the count does not say which page the walk covered.
- Fix: Point e2e/a11y.spec.ts:10 at a real challenge URL. The one in e2e/challenge.spec.ts:24 works (/play?mode=cup8&f=4-4-2&order=squadFirst&g=123456789&style=classic3&seed=e2e-80, the shape that playHref builds at src/ui/settings.ts:71-83). Wait for data-testid run-start, then scan. Keep one separate, named test for the invalid-link page. Add the draft states from SC-03.

### SC-03

**CI axe coverage skips light theme, phones, interaction states and every gradient** (S3, Yellow, static-only)

- Evidence: Today the spec covers 7 URLs in one browser project, Desktop Chrome with colorScheme dark (e2e/a11y.spec.ts:8-16, playwright.config.ts:15,17). The URLs are /, the invalid-link /play URL (SC-02), /how-to-play, /history, one valid shared run, one invalid /r/ link and one 404. Each scan waits for the footer only (a11y.spec.ts:21) and asserts violations only (a11y.spec.ts:27), so incomplete results drop out. The spec skips /daily, /leaderboard, /gate and /run-not-found. It skips the light theme, which is the default on OS-light phones. It skips every phone viewport, 200 percent zoom and forced colors. It skips every state reached by interaction. Examples are a filled builder with ratings on, the open picker and the open settings panel. Others are the real draft screens and live results with the submit form and leaderboard rows. The e2e folder has no keyboard test. A grep -i for keyboard, .press(, .focus( and Tab in e2e/*.ts finds only a getByRole("tab") query at e2e/leaderboard.spec.ts:87. The draftSixteen helper clicks only (e2e/helpers.ts:4-15). Static lint adds little. The ESLint config at eslint.config.mjs:57 extends eslint-config-next/core-web-vitals. That config turns on six jsx-a11y rules at warn level (node_modules/eslint-config-next/dist/index.js:176-191) and leaves out the keyboard rules. So the mouse-only click on the wheel div (src/components/wheel/Wheel.tsx:131) passes lint. The lint script at package.json:9 runs eslint with no max-warnings flag. INFERRED from the axe algorithm and not run. color-contrast cannot decide text whose background reaches a gradient or an image. The body has two radial gradients over --bg (src/app/globals.css:148-161). The .panel background is rgba with a backdrop blur (globals.css:313-318). The results hero is a 160deg gradient (src/components/results/ResultsView.module.css:14-19). The pitch is grass stripes (src/components/pitch/Pitch.module.css:15-24, :238-248). Those nodes come back as incomplete, not as violations. INFERRED from the axe rule source. aria-prohibited-attr also returns incomplete for elements that have text. So MatchList.tsx:81 and FitReveal.tsx:32 would not fail either (SC-22). The report at docs/reports/finish-qa.md:108 describes a light-scheme axe pass from a throwaway script with 0 color-contrast violations. It also says axe cannot evaluate text over gradients or images. That pass did not clear the nodes above.
- Fix: Extend e2e/a11y.spec.ts into a matrix. Run the SC-01 option over the states in notes, in both themes, at 390 and 320 wide. Assert on violations. Write the color-contrast incomplete node count to the test output, so growth shows in review. Add a Vitest test over the hex values of the CSS variables in src/app/globals.css. It covers the pairs in SC-04 to SC-07 and SC-36, because axe cannot see them. Add a keyboard-only twin of draftSixteen in e2e/helpers.ts that uses Tab, Enter and Space. In eslint.config.mjs add error-level jsx-a11y rules for click-events-have-key-events, interactive-supports-focus and no-static-element-interactions. The eslint-config-next package already registers the plugin.
- Notes: Process finding. It has no direct player effect, so it rates S3. With the SC-01 fix and a light-theme run, the gate would catch the failures in SC-04 to SC-06 and SC-36 on solid backgrounds. Nodes over gradients stay incomplete. Scan matrix for the browser pass. Use the SC-01 option after a hydration wait. Run light and dark (colorScheme plus the theme toggle, and confirm the computed body background changed). Run at 1280 by 720, 390 by 844 and 320 by 568. Run once at 640 by 360 CSS pixels to stand in for 200 percent zoom, and once with forcedColors active. State 1 is / with the settings panel collapsed and expanded at 390 wide (SidePanel.tsx:107-115). State 2 is / with 16 slots filled and "Show ratings (builder)" on, so pitch token notes render (Builder.tsx:162) and the Team Score shows. State 3 is the builder picker open on an empty slot and on a filled slot (Clear slot visible). In state 3, also press a type filter and show the "Showing N of M" line. State 4 is /play?mode=cup8&f=4-3-3&order=squadFirst&seed=e2e-80. Capture it at six points. They are the start screen, mid-spin, settled with candidates (rows and cards), a candidate selected (armed pitch), a hint shown and the draft complete. Check the reroll buttons here. Their name reads "Label, N left" and their visible text is the label plus the count (DraftBoard.tsx:157-167). State 5 is the same URL with order=positionFirst at the awaiting-slot prompt. State 6 is live results with the submit panel idle, with a 1 character nickname, submitting, each error code and success (local seeded database only). State 7 is /r/ pages for a cup8 run, a kanto151 run and a builder run. State 8 is /leaderboard with rows, empty and error (local database only, never the production /api/leaderboard). State 9 is /history with seeded localStorage rows. State 10 is /daily, /gate, /gate?error=1, /gate?error=limited, /run-not-found and /nope-404. The gate needs the local server's passcode config. State 11 is the theme toggle in all three states and the image settings panel open. Record the color-contrast incomplete count per scan as a baseline and fail on growth. Sample pixels for incomplete nodes (hero, pitch tokens, panel text). Keep the output of the new target-size rule apart from the 44px lane in area A. One exploratory run can switch on the six unused experimental rules through rules (css-orientation-lock, focus-order-semantics, hidden-content, p-as-heading, table-fake-caption, td-has-header, see axe-drop-split.txt).

### SC-15

**Tab, radio and toolbar roles promise arrow keys the page does not provide** (S3, Red, static-only)

- Evidence: The tab list at src/components/leaderboard/LeaderboardScreen.tsx:30-43 uses role tablist and tab with aria-selected, no aria-controls, no tabpanel and no arrow-key handling. The radio group at LeaderboardScreen.tsx:45-58 uses role radiogroup and radio buttons with aria-checked and no arrow keys. The builder toolbar at src/components/builder/Builder.tsx:166 declares role toolbar on a div that holds five buttons and a status paragraph. It has no roving tabindex and no arrow handling. There is no onKeyDown in src, so every tab and radio stays a Tab stop. Screen readers announce these roles with an arrow-key expectation the page does not meet.
- Fix: The simplest fix drops role tablist and tab in favour of a group of aria-pressed buttons (the pattern in src/components/home/SidePanel.tsx:47-76). It drops radiogroup and radio the same way, and removes role toolbar from Builder.tsx:166. If the roles stay, implement the ARIA Authoring Practices patterns of roving tabindex, arrow keys, aria-controls and a tabpanel that wraps Board.
- Notes: Tier is Red because the fix edits LeaderboardScreen.tsx under src/components/leaderboard, and the tier list names leaderboard. The change is roles only. The test at e2e/leaderboard.spec.ts:87 queries getByRole("tab") and needs an update with it.

### SC-16

**Focus rings clip inside overflow containers** (S3, Yellow, needs-browser-proof)

- Evidence: Outlines paint outside the border box, and overflow hidden or auto clips them. Read from CSS, not seen in a browser. The rule at src/components/leaderboard/LeaderboardScreen.module.css:14-19 sets overflow hidden and a radius on .tabs, whose buttons fill it. So the overflow clips the ring from src/app/globals.css:186-189, which is 2px wide with a 2px offset. Every tab loses the top and bottom of its ring, and the first and last tab also lose their outer side. The rule at src/components/run/DraftBoard.module.css:157-167 sets overflow-y auto on .rows with no padding. That clips the left and right ring of the full-width candidate rows. The list at src/components/builder/Picker.module.css:113-121 pads left and right only, so it clips the top ring of the first row (the rows are width 100%, :123-134).
- Fix: Give the scroll containers room for the ring. Add 4px padding to .rows (DraftBoard.module.css:157) and padding-top 4px to the picker .list (Picker.module.css:113). Draw the tab ring inset (outline-offset -2px) in LeaderboardScreen.module.css, so it stays inside the clip. Confirm each in a screenshot with the first and last item focused.

### SC-17

**No skip link, seven Tab stops before the page content, no current-page cue** (S3, Yellow, static-only)

- Evidence: The layout at src/app/layout.tsx:35-48 renders the brand link, four nav links (Daily, Leaderboard, How to play, History), the ImageSettings summary and the ThemeToggle before {children}. That makes seven Tab stops before main on every route. There is no skip link. A grep for skip, #main and id main finds only the Tap to skip button. There is no tabindex, and grep finds no aria-current on the nav links. Landmarks give screen reader users a bypass (banner, nav, main and contentinfo all exist, see checked), so the landmark technique satisfies WCAG 2.4.1. A sighted keyboard user still tabs through seven stops on every page.
- Fix: Add a visually hidden skip link as the first child of body in src/app/layout.tsx. Keep it off-screen until :focus, so layout does not shift and CLS stays 0.000. Point it at an id="main" added to the main element of each page. Add aria-current="page" to the active nav link through a small client wrapper that reads usePathname.

### SC-18

**Home page lists four h2 headings before its h1** (S3, Yellow, static-only)

- Evidence: The prerendered home page lists headings 2,2,2,2,1 (.next/server/app/index.html through evidence/static-C/built-html-facts.txt, a build output INFERRED to match 928e4b1, see notRun). The control panel's h2 headings (Play, Setup, Rules and Your records at src/components/home/SidePanel.tsx:94, :120, :165, :193) come before the builder's h1 "Build your XI" (src/components/builder/Builder.tsx:134). HomeScreen renders SidePanel before Builder (src/components/home/HomeScreen.tsx:93-107). Heading navigation lands on an h2 first, and the page title heading comes fifth.
- Fix: Render a visually hidden h1 before the panel in HomeScreen.tsx (for example the site name and purpose) and make the builder title an h2. Or move the panel headings to h3 under an h2 wrapper. Check role heading queries in the unit and e2e tests before changing levels.

### SC-19

**Page titles and h1s are inconsistent, and the 404 title is the site name** (S3, Yellow, static-only)

- Evidence: Titles come from metadata. The home page and the 404 page inherit the bare site name (src/app/layout.tsx:26, and the _not-found.html title in built-html-facts.txt). The /play, /daily and /leaderboard routes use "Page · pokedraft" (src/app/play/page.tsx:7, daily/page.tsx:5, leaderboard/page.tsx:8). The /history and /how-to-play routes use "pokedraft history" and "How to play pokedraft" (history/page.tsx:5, how-to-play/page.tsx:5). That makes two patterns plus one bare name, and the 404 title does not say the page was not found. The gate page uses the shared run title or the bare name (gate/page.tsx:12-24). Run pages use runTitle, which is descriptive (src/app/r/[token]/title.ts:4-10). Next 16.4 announces client-side route changes by reading document.title first, then the h1, then the pathname (node_modules/next/dist/docs/03-architecture/accessibility.md:12-14). INFERRED from that doc and not run. A client-side move to the 404 page announces only "pokedraft". The in-page screens on /play (start, draft, results) keep one document title and move no focus. The results h1 is the small mode kicker (src/components/results/ResultsView.tsx:51), not the record, so a heading list reads the mode line only.
- Fix: Pick one pattern, "Page · pokedraft". In src/app/layout.tsx set title to an object with default "pokedraft" and template "%s · pokedraft". Next 16.4 applies a layout template to child segments only, not to the page in the same segment (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:241-289). So the home page sets its own full title, for example "Build your XI · pokedraft". The child pages shorten theirs to "History", "How to play" and so on. Export metadata from the root src/app/not-found.tsx with the title "Page not found" (supported per not-found.md:185-195). For the in-page screens, set document.title per screen from PlayScreen.tsx and focus the h1 (SC-11). Make the results h1 name the result, for example the mode line plus the record 6-1-1, built from values the view already holds (ResultsView.tsx:51, :59).

### SC-20

**Species names are read twice in several accessible names, and every Scouting notes summary has the same name** (S3, Yellow, static-only)

- Evidence: Every PlayerImage call site passes alt text equal to the species name. The call sites are src/components/wheel/Wheel.tsx:55, src/components/results/ResultsView.tsx:237, src/components/results/FitReveal.tsx:26, src/components/run/DraftBoard.tsx:279, src/components/builder/Picker.tsx:197 and the pitch token at src/components/pitch/Pitch.tsx:219. The same name sits next to the picture as text at Wheel.tsx:56, ResultsView.tsx:239, FitReveal.tsx:28, DraftBoard.tsx:280 and Picker.tsx:199. The candidate and picker buttons compute a name that holds the species twice. Elsewhere a screen reader reads the picture and then the text. The pitch token is fine because its aria-label replaces the content name (Pitch.tsx:159). The blank fallback is a div with role img and aria-label (src/components/PlayerPicture.tsx, frozen, report only), so passing alt="" is not safe. The FitReveal summaries all read "Scouting notes" with no species (FitReveal.tsx:50), so a list of controls repeats one name.
- Fix: Fix at the call sites, not in PlayerImage (frozen). Wrap the image in a span with aria-hidden="true" where a text name follows (Wheel.tsx:55, ResultsView.tsx:237, FitReveal.tsx:26, DraftBoard.tsx:279, Picker.tsx:197). For the summaries, add visually hidden text so each reads "Scouting notes for {species.name}". PlayerImage stays the only image seam.

### SC-21

**Results and shared pitches expose 16 disabled buttons** (S3, Yellow, static-only)

- Evidence: Pitch sets disabled when the caller passes neither onSlotTap nor onSwap (src/components/pitch/Pitch.tsx:158). ResultsView renders Pitch with no handlers (src/components/results/ResultsView.tsx:157-163). So /r/[token] and the live results screen expose 16 disabled buttons that do nothing. They are 11 starters and 5 bench (Pitch.tsx:251-259). Screen readers list each as a disabled button (INFERRED from the roles, not run). axe skips color-contrast on disabled elements (colorContrastMatches, axe.js:28619-28633). So nothing contrast-checks those names and the pitch token text, even with every rule on. FitReveal already lists the same lineup as text (src/components/results/FitReveal.tsx:12-57).
- Fix: Add a display-only mode to Pitch (src/components/pitch/Pitch.tsx). In that mode the labelled group holds a list, and each pitch token renders as a list item with the same visible text. Pass it from ResultsView.tsx:157. Keep the button markup for the draft and the builder.

### SC-22

**Lists and cards lack names, and two aria-label values sit on generic elements** (S3, Yellow, static-only)

- Evidence: The markup at src/components/results/MatchList.tsx:81 puts aria-label="Ratings for this match" on a plain div. The markup at src/components/results/FitReveal.tsx:32 puts aria-label={Fit n} on a plain span whose visible text is the bare number. A generic element cannot take a name. Screen readers either ignore it or read the number without "Fit". axe reports aria-prohibited-attr as incomplete, not as a violation, when the element has text. So CI would not catch these even with all rules on. Each match is an article with no heading or name (MatchList.tsx:57-129), so heading and landmark navigation cannot jump between matches. The goal lists (MatchList.tsx:104, :109) carry names, and one of the two is empty when only one side scored. The candidate list is an unnamed ul (src/components/run/DraftBoard.tsx:267).
- Fix: In FitReveal.tsx:32 replace the aria-label with visually hidden "Fit " text before the number. In MatchList.tsx:81 use role group with the same label, or drop the label. Give each match article aria-labelledby that points at its round label (MatchList.tsx:59-62). Render the goal lists only when they have items. Add aria-label="Candidates" to the list at DraftBoard.tsx:267.

### SC-23

**Nickname label does not name the field, and errors are not tied to inputs** (S3, Red, static-only)

- Evidence: The nickname field (src/components/leaderboard/SubmitPanel.tsx:83-111) has the label text "Submit to the all-time board" or "Submit to today's daily board" (:85-87). So the field's name never says nickname. The word occurs only in the placeholder (:97), which the label overrides in the accessible name, and in autoComplete (:96). The input points at the range hint through aria-describedby (:98). The role alert error has no link to the input, and the input has no aria-invalid (:89-99, :112-116). The code disables the Submit button while the nickname is out of range (:104), with no stated reason. The maxLength is NICKNAME_MAX + 10 (:95), so the user can type past the limit and meet a silently disabled button. Only the hint paragraph (:109-111) explains the range. On the gate (src/app/gate/page.tsx:41-57), the server renders the error after a redirect, below the input, with no aria-describedby and no aria-invalid. Focus returns to the top of the new page. The error copy itself is clear (SUBMIT_ERROR_COPY, SubmitPanel.tsx:12-30).
- Fix: Name the field "Nickname" and move the "Submit to ..." text into a heading or the hint. Set aria-invalid on the input and extend its aria-describedby to "submit-hint submit-error" while an error shows. Give the error paragraph that id. Give the disabled Submit button aria-describedby="submit-hint", so the range is its stated reason. Or keep the button enabled and report the range error on press. Drop the +10 slack or show a live count. On the gate, add aria-invalid and aria-describedby when ?error is present, and set autoFocus on the passcode input so a reload lands on the field.
- Notes: Tier is Red because the fix edits SubmitPanel.tsx under src/components/leaderboard and the gate page, and the tier list names leaderboard. The change is markup and attributes only, with no API or payload change.

### SC-25

**Sound toggle changes its label and its pressed state together** (S3, Yellow, static-only)

- Evidence: The button at src/components/wheel/SoundToggle.tsx:8-15 sets aria-pressed={on} and swaps the label between "Sound on" and "Sound off". INFERRED from the roles and not run. A screen reader says "Sound off, toggle button, not pressed". That says the state twice and reads as a double negative. Sound is off by default (src/components/wheel/sound.ts:13), so this is not an autoplay problem.
- Fix: Use the Switch pattern already in src/components/home/SidePanel.tsx:29-43 (role switch, aria-checked) with the fixed label "Sound". A fixed label with aria-pressed also works. It keeps the visible text equal to the name, which satisfies WCAG 2.5.3.

### SC-26

**Synergy links exist only as an aria-hidden graphic** (S3, Yellow, static-only)

- Evidence: Synergy links between neighbours are drawn only inside the aria-hidden pitch SVG (src/components/pitch/Pitch.tsx:71-87, :243-250). They come from cup.rating.edges (src/components/results/ResultsView.tsx:160), and the link strength shows only as stroke opacity (Pitch.tsx:83). The legend line explains the picture (ResultsView.tsx:164-172), but no text says which players linked or why. Each edge carries a, b, reasons and value. The reasons are sharedType, evoLine, sameGen and coverage (src/engine/types.ts:211-218). So the page can build a text equivalent without new data. The Season details text explains the rule only (ResultsView.tsx:178-203).
- Fix: In src/components/results/FitReveal.tsx add a line under each slot row, built from rating.edges and the slot labels. An example is "Linked with CB, shares a type and a generation". Map the four reason codes to plain words. Render it as visible text, so sighted players get the same explanation. It only reads existing edges. No engine change.

### SC-27

**Two data tables have no accessible name** (S3, Yellow, static-only)

- Evidence: Two data tables have no name or caption. The group table (src/components/results/ResultsView.tsx:94-128) has correct th scope headers, and the nearest heading names only the section (:91-93). The records table (src/components/home/SidePanel.tsx:194-229) has the same shape. The leaderboard is an ordered list of links, not a table (src/components/leaderboard/Board.tsx:63-90), so it needs no scope or caption. The group table sits in .tableWrap with overflow-x auto (ResultsView.module.css:210-215), and the table is width 100% with no min-width (:217-222). So the wrapper scrolls only if the content is wider than the viewport. The axe rule scrollable-region-focusable fails a scroll region that has no focusable child.
- Fix: Add aria-labelledby="group-h" to the group table (ResultsView.tsx:95) and aria-label="Your records" to the records table (SidePanel.tsx:194), or add visually hidden captions. If the browser pass finds .tableWrap scrolls at 320px or at 400 percent zoom, add tabIndex 0 and an aria-label to the wrapper.
- Notes: Browser lead. Measure .tableWrap scrollWidth against clientWidth at 320 and 360 wide and at 400 percent zoom. The static read cannot say whether it scrolls. The team column does not wrap (ResultsView.module.css:253-257), and club names run up to 21 characters (src/engine/opponents.ts:49, frozen, report only). Measure with the longest names, such as Indigo Plateau United in mode kanto151.

### SC-28

**No error.tsx or global-error.tsx, so a fatal error shows an unthemed page with no lang** (S3, Yellow, static-only)

- Evidence: A find over src finds no error.tsx, global-error.tsx or loading.tsx. Only src/app/not-found.tsx and src/app/run-not-found/not-found.tsx exist. A render error in the root layout falls to the built-in Next error page. Its prerendered HTML has no lang attribute, no main and no nav. It has one h1 and the built-in 500 title (.next/server/app/_global-error.html through evidence/static-C/built-html-facts.txt, a build output INFERRED to match 928e4b1, see notRun). Next 16.4 documents that global-error defines its own html and body (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:161-167). It also documents that the built-in 500 page does not receive the app theme (same lines). The axe rule html-has-lang flags any page without a lang attribute.
- Fix: Add src/app/global-error.tsx per error.md:161-188 with html lang="en", a main, an h1, a short sentence and a retry button. Style it with the same colour values inline, because it cannot import the layout styles. Add a route-level src/app/error.tsx for recoverable errors.

### SC-29

**Base type size is set in pixels on body while components use rem** (S3, Yellow, static-only)

- Evidence: The rule at src/app/globals.css:158 sets body font-size 16px, while component text uses rem (for example src/components/builder/Picker.module.css:109 and src/components/wheel/Wheel.module.css:26). The html element sets no font-size (globals.css:140-146). The rem unit follows the browser's default font size and px does not. So text that inherits from body ignores a larger browser font-size setting while rem text grows. Browser zoom still works, because the viewport allows zoom (see checked).
- Fix: Replace font-size 16px with 1rem at globals.css:158. Check the home page and the draft screen with the browser default font size set to its largest option for overflow before keeping it.

### SC-30

**History dates use the browser locale on an English page** (S3, Yellow, static-only)

- Evidence: The code at src/components/history/HistoryList.tsx:12 formats the run date with toLocaleString(undefined, ...). That uses the browser locale on a page declared lang="en" (src/app/layout.tsx:33). A German browser shows a German date inside English text. INFERRED and not run. A screen reader that follows the page language reads that date with an English voice. The leaderboard date helper pins en-US (src/components/leaderboard/format.ts:29), so the two screens disagree.
- Fix: Pass "en-US" as the locale at HistoryList.tsx:12 to match src/components/leaderboard/format.ts:29.

### SC-31

**Deselecting the last generation chip does nothing and says nothing** (S3, Yellow, static-only)

- Evidence: The function toggleGen at src/components/home/SidePanel.tsx:85-89 returns without a change when the player deselects the only selected generation (:87). The chip keeps aria-pressed true, with no message and no disabled state. A screen reader user hears no change, and a sighted user sees none.
- Fix: Set aria-disabled="true" on the only pressed generation chip while it is the last one (SidePanel.tsx:149-158). Style [aria-disabled] like :disabled, so the refusal is visible and announced.

### SC-32

**Builder pitch tokens show note text that is not in their accessible name** (S3, Yellow, static-only)

- Evidence: With Show ratings on, Pitch renders a visible tokenNote inside each filled pitch token (src/components/pitch/Pitch.tsx:230-235). Builder.tsx:117-127 builds the note, for example a role and its fit number. The button's aria-label is only "SLOT Name" (Pitch.tsx:142, :159). So the visible label holds text the name lacks. That breaks WCAG 2.5.3 Label in Name for speech input users, and it is what axe label-content-name-mismatch tests. The spec runs that rule, but only with an empty builder and ratings off, so it never sees a note (showRatings defaults to false, src/ui/settings.ts:28). The report at docs/reports/finish-qa.md:118 fixed the same kind of defect for the slot label.
- Fix: Build the name from the same pieces as the visible text. In Pitch.tsx:142 compute the note once, for example species !== null && tokenNote ? tokenNote(ref) : null. Then append it to the name in the same order as the markup, which is slot, name, note. Add a Pitch unit test that renders with tokenNote and compares the name to the visible text.

### SC-33

**Forced colors mode drops the rings and fills that carry state** (S3, Yellow, needs-browser-proof)

- Evidence: No forced-colors or prefers-contrast handling exists. A grep for forced-colors, forced-color-adjust, prefers-contrast and -ms-high-contrast in src returns no lines. Read from the CSS Color Adjust rules and not run, forced colors mode drops box-shadow and replaces background and border colours with system colours. The state those carry is lost. The pitch rings (default, highlight, weak, drop) are box-shadow (src/components/pitch/Pitch.module.css:105-107, :123-140). The selected candidate ring is border-color plus box-shadow (src/components/run/DraftBoard.module.css:245-251). Pressed chips are a background fill (src/app/globals.css:291-296), as are the selected leaderboard tab (LeaderboardScreen.module.css:35-38) and the switch track (SidePanel.module.css:185-188). Twenty-two CSS lines mention box-shadow (grep -rn box-shadow src --include='*.css' | wc -l). The focus ring is an outline, which survives.
- Fix: Add one forced colors media block in src/app/globals.css, with the media query for forced colors set to active. Add matching rules in the module files that own each state. Map state to system colours using borders and outlines. For [aria-pressed="true"], [aria-selected="true"] and [aria-checked="true"], use a 3px border in Highlight. For pitch rings, use an outline in Highlight, and dashed for the weak spot. The switch thumb already moves. Prove with Playwright forcedColors "active" screenshots.

### SC-34

**Two looping pulses have no in-page way to stop** (S3, Yellow, static-only)

- Evidence: The SidePanel live dot loops forever (src/components/home/SidePanel.module.css:45, 1.6s, infinite). So does the armed-slot outline (src/components/run/DraftBoard.module.css:315, 1.4s, infinite), which runs for as long as the player takes to choose. Both start on their own, last longer than 5 seconds and run beside other content (WCAG 2.2.2 Pause, Stop, Hide). Both stop under the OS reduced-motion preference through the global block (src/app/globals.css:434-442). Neither flashes more than three times a second. The cycles run at 0.63 and 0.71 per second, from code arithmetic and not measured.
- Fix: Stop the loops after a few cycles instead of forever. Set animation-iteration-count 3 on both (DraftBoard.module.css:315, SidePanel.module.css:45), which ends the motion by 4.2s and 4.8s. The final state is the visible marker, so nothing disappears.

### SC-35

**Draft grid areas put the pitch before the road strip on screen but after it in the DOM** (S3, Yellow, static-only)

- Evidence: The component src/components/run/DraftBoard.tsx renders the side panel (:120), then the road strip (:230-232), then the pitch (:234-243). The grid areas at src/components/run/DraftBoard.module.css:4-7 order the pieces side, pitch, road on narrow screens. From 960px wide, DraftBoard.module.css:14-16 puts the pitch in the left column and the panel and road strip in the right column. On narrow screens only the reading order differs, because the road strip has no focusable content. From 960px wide the pitch sits left of the panel but comes last in the Tab order. So focus jumps from the right column to the left column. Read from CSS and markup, not seen in a browser. Position First already runs against the DOM order (SC-11).
- Fix: Move the pitch section above the road strip in DraftBoard.tsx:230-243, so the DOM order is side, pitch, road and matches the narrow layout. Leave the panel before the pitch in the DOM at 960px and wider, because Squad First picks a candidate before placing it. The browser pass should confirm that the column swap is acceptable to a keyboard user.

### SC-37

**Picker search misses names typed without their apostrophe, accents or punctuation** (S3, Yellow, static-only)

- Evidence: The code at src/components/builder/Picker.tsx:75-78 trims and lowercases the query, then matches it with sp.name.toLowerCase().includes(q). It does no accent, apostrophe, punctuation or hyphen folding. A read-only count over src/data/pokedex.json finds 5 names with non-ASCII characters, 4 with a period or colon and 9 with a hyphen (evidence/static-C/pokedex-names.txt). MEASURED by replaying that expression in node over the 1025 names. The component itself did not run. The queries farfetch'd with a straight apostrophe, sirfetch'd, flabebe, mr mime, type null, porygon z and ho oh return 0 rows. The forms farfetch, flab, mime, type and ho-oh match. The picker then shows "No matches" in its polite count line (Picker.tsx:175-181). A player who types or dictates the common spelling gets an empty list.
- Fix: Fold both sides of the name comparison in Picker.tsx:75-78. Lowercase, strip combining marks with normalize NFD, then delete every character that is not a letter or digit. Fall back to the raw query when the folded query is empty. Leave the dex number comparison on the raw query. Leave the frozen data file src/data/pokedex.json alone. Add a Picker unit test for farfetch'd, flabebe, mr mime, type null and ho oh.

### SD-04

**One 24.97 MB function bundle is shared by api/leaderboard, card, gate/unlock and the OG route** (S3, Red, static-only)

- Evidence: nft sizes show a 24,974,670 B function shared by four handlers (builds.json). The grouping is a guess. The share card save tap waits on this function (components/share/download.ts:13-25). See D-bundle-map.md section 11.
- Fix: Experiment in a Preview deployment with distinct function config per handler and compare cold start. Reduce traced files only if the experiment shows a gain.

### SD-05

**OG outputFileTracingIncludes key yields 0 of 2,052 creature files** (S3, Red, static-only)

- Evidence: next.config.ts include key matched none of the 2,052 creature files in the traced output. Cause unknown. The OG image works today only because the lambda is shared (inferred). See D-bundle-map.md section 11.
- Fix: Run a key experiment (route key versus glob) in a throwaway copy and add a trace test that asserts the files are present for the OG function.

### SD-06

**/r/[token] holds 4 dataset copies and /gate 3 at module load** (S3, Red, static-only)

- Evidence: Module load weight is 6,187,506 B for /r/[token] and 4,711,066 B for /gate (gate/page.tsx:4 and :17). Both resume on a lambda (H11). One probably cold /play resume took 1,380 ms (n=1).
- Fix: Dynamic import of loadRun in gate/page.tsx. Measure cold start before and after with a local restart (H11).

### SD-14

**Goldens and CI run on Node 22 while production runs Node 24** (S3, Red, static-only)

- Evidence: ci.yml:24 and :56 use Node 22. The Vercel project uses node 24.x. Engine output is pinned by goldens.test.ts. Risk is low (inferred).
- Fix: Add a Node 24 golden run to CI or pin the project to 22. Run the goldens once on Node 24 before deciding.

### SD-17

**Premise of about 16,000 creature files is wrong. The count is 2,052 files, 13.10 MB** (S3, Yellow, refuted)

- Evidence: public/creatures holds 2,052 files totalling 13,103,566 B (read, counted). The matcher in proxy.ts:51-53 covers them.
- Fix: None. Correct the premise in any plan that sized work on 16,000 files.

### SE-06

**No health endpoint; nothing reports the deployed build** (S3, Red, confirmed)

- Evidence: HEAD https://pokedraft-woad.vercel.app/api/health returned the platform 404 (E-work/prod-headers-extra.txt, single run). No route reads VERCEL_GIT_COMMIT_SHA (grep of src). autoExposeSystemEnvs is true (vercel-project-sanitized.json), so the variable exists at runtime.
- Fix: Add src/app/api/health/route.ts as designed in E-route-matrix appendix C: sha, env, region, engine and token versions, no-store, dynamic via connection(), no limiter, no database unless ?db=1, exempt from the gate in passcode.ts and proxy.test.ts.
- Notes: Dispatch line: a simple health endpoint that returns the build SHA.

### SE-07

**The proxy matches nearly every request, so even with the gate off each page, API call and creature image passes through a function** (S3, Red, static-only)

- Evidence: proxy.ts:51-53 matcher excludes only _next/static, favicon.ico and robots.txt; deployed as the _middleware function, nodejs24.x, 19 regions (evidence/E-vercel-lambdas.tsv). With the gate off the only work is the /r/<token> decode (proxy.ts:12-30). dispatch-5.md:56 deliberately gates /creatures.
- Fix: Owner decision. Either accept, or exclude /creatures/ and /api/health from the matcher if the pictures may be public. The matcher is static, so it cannot depend on FRIENDS_PASSCODE.
- Notes: Whether middleware invocations count against the 1,000,000 Hobby function invocations is NOT RUN (needs the Usage page). x-vercel-id on cached responses shows one region segment, which does not settle it.

### SE-08

**Migration safety is untested: down files and rollback.mts have no test, and production uses a non-atomic migrator that CI never exercises** (S3, Red, static-only)

- Evidence: node_modules/drizzle-orm/neon-http/migrator.js:21-33 runs statements one request at a time and writes every bookkeeping row at the end; tests use the PGlite migrator, which wraps all of it in one transaction (pg-core/dialect.js:44-72; leaderboard/server/__tests__/fixtures.ts:24-29). grep for rollback, .down.sql and __drizzle_migrations hits only scripts/db/migrate.mts and rollback.mts; ci.yml has no db step. The two down files are one-line DROP TABLE IF EXISTS that undo the ups exactly (drizzle/rollback/*.down.sql), and rollback.mts:24-27 deletes the bookkeeping row inside one sql.transaction. Proven once by hand on a branch (dispatch-4.md:76). rollback.mts:20-23 splits the down file on ';'.
- Fix: Add a PGlite test that applies every up, every down in reverse (assert zero public tables) and every up again; add a journal-tag-to-down-file check to CI; replace the neon-http migrate call with a wrapper that runs each migration and its bookkeeping insert in one sql.transaction. Apply 0002 and 0003 to the preview branch first.
- Notes: A partial failure of db:migrate leaves applied but unrecorded DDL; the rerun then fails on CREATE TABLE.

### SE-09

**leaderboard_entries_ip_recent_idx and the ip_hash column have no reader** (S3, Red, static-only)

- Evidence: schema.ts:29,45; drizzle/0000:14,25. Repo grep for ipHash, ip_hash, ip_recent finds writers only (handlers.ts:112,187, smoke.mts:10). dispatch-5.md:27 kept the index because dropping needs a second migration. About 90 B and one index insertion per accepted row [estimate].
- Fix: Drop the index in migration 0002 (E-query-map section 9) once E2 reads idx_scan = 0 on production; keep the column or drop it by owner choice. The down file recreates the index.
- Notes: Rows from before dispatch 5 hold unkeyed sha256 hashes (dispatch-5.md:29); STATE.md:8 recorded 0 rows then; current row count NOT RUN.

### SE-10

**rate_limit_events is pruned only for the key being served; keys that never return keep up to 10 rows forever** (S3, Red, static-only)

- Evidence: ratelimit/store.ts:25-27 prunes (scope, key_hash) only; no cron (crons.definitions empty, vercel-project-sanitized.json); dispatch-5.md:25 lists the sweep as a follow-up. About 270 B per row incl. 2 indexes; worst case one row per distinct key, about 0.27 GB per 1,000,000 attempts [estimate].
- Fix: Opportunistic global sweep on about 1 in 100 consume calls: DELETE FROM rate_limit_events WHERE created_at < now() - interval '2 hours' (longest window is 1 hour). Add a created_at index only if the table passes about 100,000 rows.
- Notes: Quantified in E-query-map section 6.

### SE-11

**Board queries cannot use the index order, and the all-time board and rank are O(rows in the mode)** (S3, Red, static-only)

- Evidence: store.ts:29 sorts wins, draws, team_score DESC (NULLS FIRST) then created_at, id; drizzle/0000:24 indexes DESC NULLS LAST and has no id. The columns are NOT NULL (schema.ts:24-27), so NULLS LAST changes no result. Q9 and Q7 filter by mode only and the index puts daily_date second, so they scan every row of the mode (daily rows included). Expected plans are inferred (no EXPLAIN run); see E-query-map sections 2, 3, 9.
- Fix: Add NULLS LAST to the five ORDER BY keys; migration 0002 adds (mode, wins DESC NULLS LAST, draws DESC NULLS LAST, team_score DESC NULLS LAST, created_at, id) for the all-time paths. Confirm both with EXPLAIN on about 50,000 synthetic rows first (E-query-map section 10).
- Notes: Irrelevant at today's row count; matters near 10^5 rows. Open product question: daily runs also appear on the all-time board because that filter is mode only.

### SE-12

**The rate-limit key is the exact client address: an IPv6 range gets many independent budgets, and a missing header would put everyone in one bucket** (S3, Red, static-only)

- Evidence: handlers.ts:73-82 hashes x-real-ip, else the first x-forwarded-for hop, else 'unknown'; 10 per hour submit (:27), 10 per 15 minutes unlock (unlock.ts:12). On Vercel x-real-ip is platform set (dispatch-5.md:30; docs saved at evidence/docs/https___vercel.com_docs_headers_request-headers.html), so spoofing is not possible there; off Vercel both headers are spoofable and 'unknown' is a shared bucket (CLAUDE.md Hosting assumptions). Burst overshoot under READ COMMITTED was accepted (dispatch-5.md:23). The limiter fails closed (handlers.ts:108-121).
- Fix: Mask IPv6 to its /64 before hashing (net.isIPv6, expand, zero the low 64 bits) and test it; leave IPv4 as is. Optionally return 503 rather than sharing 'unknown' when no header is present.
- Notes: Limits re-derived and confirmed against code. Not run: a 20-way concurrent burst on Preview, and a spoofed header test (E2).

### SE-13

**POST /gate/unlock returns 500 for any non-form body** (S3, Red, confirmed)

- Evidence: gate/unlock.ts:29 awaits req.formData() with no guard. Real handleUnlock called with JSON, empty and text/plain bodies throws TypeError 'Content-Type was not one of multipart/form-data or application/x-www-form-urlencoded' (E-work/unlock-probe-node22.txt CASE D; identical on Node 24.18.0, unlock-probe-node24.txt, single run each).
- Fix: Wrap formData() in try/catch and answer back(req, '/', '1') or a 400; add a unit test for a JSON body.
- Notes: A hand-made request only; the rendered form always posts a form body. Gate is off in production, and with the gate off the route still reads the body first.

### SE-14

**safeNext returns a protocol-relative path for dot-segment inputs, so a hand-made POST to /gate/unlock redirects off-site** (S3, Red, confirmed)

- Evidence: passcode.ts:41-49 returns url.pathname + search + hash after resolving against a fixed origin; new URL('/.//evil.test', origin).pathname is '//evil.test'. Real handleUnlock: gate off and next='/.//evil.test', '/a/..//evil.test' or '/%2e//evil.test' gives 303 to https://evil.test/; gate on with the right passcode does the same and still sets the cookie (E-work/unlock-probe-node22.txt cases A and C; identical on Node 24.18.0). The rendered /gate form runs safeNext once (gate/page.tsx:38) so it carries '//evil.test', and the POST's second pass returns '/' (E-work/safenext-node22.txt, 'second pass'), so the browser flow is not exploitable. dispatch-4.md:81 fixed the tab case only.
- Fix: After resolving, collapse leading slashes (return '/' + pathname.replace(/^\/+/, '') + search + hash) or reject any result that starts with '//'; add the 18 payloads of E-work/safenext-replica.mjs as a guard test. The proposed form-action 'self' CSP also makes Chrome refuse the redirect.
- Notes: Not S1: needs a crafted cross-site form POST, which lands on a site the attacker already controls.

### SE-15

**Nickname filter both over-blocks real words and is bypassed by lookalike characters** (S3, Red, confirmed)

- Evidence: Real parseNickname (E-work/nickname-probe-node22.txt, identical on 24): Grapes, Scunthorpe, Snigger and Drape are rejected as 'blocked'; Cyrillic lookalikes for 'shit', 'Pаulo' with a Cyrillic a, fullwidth Latin and 'fück' pass; zero-width space and joiner, combining accents, RTL override, emoji and HTML are rejected; BOM, tab and no-break space become a normal space. Length is counted in code points on the server and UTF-16 units in SubmitPanel.tsx:47, which is stricter for astral letters only.
- Fix: Match the blocklist on word-bounded tokens or an allow list for known false positives; fold common confusables (NFKC plus a small Cyrillic and Greek map) before matching; keep the stored nickname as typed. Test the probe cases.
- Notes: No HTML sink renders nicknames unescaped (React text nodes), so no XSS surface was found.

### SE-16

**/gate says 'pokedraft is friends only' and asks for a passcode while the gate is off** (S3, Yellow, static-only)

- Evidence: gate/page.tsx:70-71; FRIENDS_PASSCODE is unset in production (project env names) and unlock.ts:32 redirects without checking anything.
- Fix: When the gate is off, redirect /gate to / (read process.env.FRIENDS_PASSCODE in the page) or change the copy.
- Notes: Reachable only by typing /gate; nothing links to it.

### SE-17

**Validators accept values Postgres cannot store, so crafted inputs return a misleading 503** (S3, Red, static-only)

- Evidence: A seed containing U+0000 or a lone surrogate decodes, replays and re-encodes canonically (E-work/seed-nul-probe-node22.txt, identical on Node 24: 'NUL in the middle' replays 2-0-2). engine/token.ts:120 only requires a non-blank string. Postgres text rejects NUL (SQLSTATE 22021, inferred), and the catch at handlers.ts:194 maps it to 503 DB_UNAVAILABLE after the limiter and both probes have run. The seed is reachable from /play?seed=%00. Separately the board schema accepts date=0000-01-01 and 0000-02-29 (E-work/isodate-probe-node22.txt; engine/rng.ts:126-136), which Postgres date has no year 0 for (inferred), so GET returns 503 instead of 400.
- Fix: In handleSubmit after decode: reject seeds with U+0000 or !seed.isWellFormed() as TOKEN_MALFORMED 422. In boardQuerySchema require year 0001 to 9999 and keep INVALID_QUERY. Optionally strip those characters where the client reads ?seed=. Tests for both.
- Notes: Engine functions involved are frozen; the fix is at the API boundary only. The Postgres behaviour was not run (no database).

### SE-18

**No time bound anywhere between the player and Neon** (S3, Red, static-only)

- Evidence: db/client.ts:7-15 builds neon(url) with no options; no segment config in src/app (functions keep the 300 s default, evidence/E-vercel-lambdas.tsv); no retry. Cold start after the 300 s autosuspend (project settings) is therefore unbounded for the player, who sees 'Submitting' in SubmitPanel (client.ts:110-138 has no AbortSignal). Neon driver supports fetchFunction (@neondatabase/serverless/index.d.ts:671-678) and fetchOptions (:459-463). Vercel and Neon are co-located (iad1 and aws-us-east-1, measured from project JSON and describe_project).
- Fix: Set neonConfig.fetchFunction once in db/client.ts to a wrapper that passes AbortSignal.timeout(8000); export const maxDuration = 20 on api/leaderboard and gate/unlock; map the abort to the existing 503. Consider one retry for the board GET only.
- Notes: Cold-start latency and failure mode are NOT RUN (E2).

### SE-20

**CI runs Node 22 only while production runs Node 24, and has no dependency audit or real-database migration check** (S3, Red, static-only)

- Evidence: .github/workflows/ci.yml uses node-version 22 in both jobs; project nodeVersion is 24.x (vercel-project-sanitized.json); package.json engines >=22, @types/node ^20. No pnpm audit, no format:check, no db:migrate/rollback/smoke job, no test:live. Measured parity on 22.22.3 and 24.18.0 for dates, URL, formData, token codec, nickname, SQL text and fuzz (E-route-matrix appendix D), and no Node 24-only API found.
- Fix: Add a Node 24 entry to the check job matrix, set @types/node to the production major, add pnpm audit --prod to CI, and a nightly job that runs migrate, smoke and rollback against a throwaway Neon branch.
- Notes: Settled by measurement that nothing differs today; this is a process gap.

### SE-21

**pnpm audit: 1 high and 1 moderate, both dev-only and unreachable at runtime** (S3, Red, confirmed)

- Evidence: pnpm audit and pnpm audit --prod, run twice, identical (evidence/pnpm-audit/*). High: braces 3.0.3 (GHSA-vfj7-8cjw-p6xm, stack exhaustion on nested patterns, patched >=3.0.4) via eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch. Moderate: esbuild 0.18.20 (GHSA-67mh-4wv8-2f99, dev server answers any website, patched >=0.24.3) via drizzle-kit > @esbuild-kit/esm-loader > @esbuild-kit/core-utils. --prod: no known vulnerabilities (23 production dependencies). Counts: critical 0, high 1, moderate 1, low 0.
- Fix: Accept: neither package ships in the deployed output and the vulnerable inputs (a hostile glob, a running esbuild dev server) do not occur. Optional cleanup: pnpm.overrides braces >=3.0.4 and esbuild >=0.24.3, then run lint and db:generate.
- Notes: Triage per the brief: dev-only, not reachable, accept with reason.

### SE-22

**POST routes accept any content type, buffer the whole body before the size check, and have no Origin check** (S3, Red, static-only)

- Evidence: handlers.ts:99-103 calls req.text() and measures afterwards; no content-type test; no Origin or Sec-Fetch-Site test; the limiter runs first, so only the 10 admitted attempts per hour read a body, up to the platform 4.5 MB cap. A cross-site form with enctype text/plain can post a JSON-shaped body from a visitor's address and spend that address's hourly budget (and the 15 minute gate budget). Access-control headers on function responses are NOT RUN.
- Fix: Require content-type application/json (415 or INVALID_BODY), reject when content-length exceeds 16 KiB before reading, and compare Origin or Sec-Fetch-Site with the host for POSTs.
- Notes: Impact is low: the data is public and the attacker's own run is all that can be posted.

### SE-23

**The gate cookie value is an unsalted SHA-256 of the passcode** (S3, Red, static-only)

- Evidence: passcode.ts:22-24 sha256('pokedraft-pass:' + passcode); unlock.ts:52 stores it in the cookie. A stolen cookie allows offline guessing of a short passcode. Flags are right (httpOnly, secure in production, sameSite lax, 90 days) and the compare is constant time (passcode.ts:26-35). dispatch-4.md:74 chose this deliberately.
- Fix: Store HMAC-SHA256(IP_HASH_SECRET-style secret, passcode) or a random session id instead; changing it logs everyone out once.
- Notes: Gate is off in production, so no live exposure.

### SE-24

**Environment documentation is incomplete** (S3, Red, static-only)

- Evidence: README.md:24-28 lists three variables; DATABASE_URL_UNPOOLED (scripts/db/connect.mts:4) and VERCEL_PROJECT_PRODUCTION_URL (layout.tsx:22, silent localhost fallback) are documented nowhere; README says Node 22 while production is 24. Full matrix in E-route-matrix appendix A. Production Preview DATABASE_URL is type 'encrypted', not 'sensitive' (vercel-project-sanitized.json).
- Fix: Add the missing rows and the missing-value behaviour to README and CLAUDE.md; consider making Preview DATABASE_URL sensitive.
- Notes: Docs-only part folded into the tier of the fix.

### SE-25

**The rate-limit error tells players to wait a minute, but the window is an hour** (S3, Yellow, static-only)

- Evidence: SubmitPanel.tsx:26 'Wait a minute and try again.'; handlers.ts:115-117 sends 'Ten submissions per hour' and retry-after: 3600, which the client ignores. The window is sliding, so the real wait is until the oldest of 10 attempts ages out.
- Fix: Change the copy to 'You have used the 10 submissions per hour for this network. Try again later.' and read retry-after if shown.
- Notes: Players behind one shared address (a house or a carrier gateway) share the 10 per hour.

### SF-10

**A flaky pass is invisible in CI because retries are on, the report uploads only on failure, and failOnFlakyTests is unused** (S3, Yellow, static-only)

- Evidence: `playwright.config.ts:10` sets `retries: process.env.CI ? 1 : 0`. A test that fails once and passes on its retry leaves the job green, and its only trace is a 'flaky' line in the `list` reporter output (`:11`). The HTML report uploads only when the job fails (`.github/workflows/ci.yml:62-68`, `if: failure()`), so a green flaky run keeps no report. `failOnFlakyTests` exists in the installed types (`node_modules/.pnpm/@playwright+test@1.64.0/node_modules/playwright/types/test.d.ts:1324`) and the repo does not set it. Measured from the ci-flake probe (run 38077815031, ubuntu-latest, retries off, 5 runs of 24 tests) there were 0 failures and 0 flaky tests in 120 executions. My own scan of the logs that `gh run view --log` returned for 24 earlier CI runs (364 e2e executions, with the suite growing from 4 to 24 tests across them) found no 'flaky' line and no '(retry #' line. So retries have masked nothing I can measure, and the risk is structural. A test that fails 10% of the time still passes five runs about 59% of the time (0.9 to the fifth), so these zero counts do not prove the suite is flake free.
- Fix: Add `failOnFlakyTests: !!process.env.CI` to `playwright.config.ts` so a pass on retry turns the job red and names the test. If a red job is too strict, keep `retries: 1`, add a `json` reporter writing `test-results/results.json`, and change the upload step to `if: always()` so green but flaky runs keep their report and traces for seven days. Either way add a step that prints the titles of tests with `status: 'flaky'`.
- Notes: `trace: 'retain-on-failure'` (`playwright.config.ts:14`) already records the failed first attempt, so the fix needs no trace setting change. The unit suite has no retry setting, so a Vitest flake fails the job outright.

### SF-11

**One animated e2e test takes about 79% of the e2e suite time and has only a 2.4x margin to the 120 s timeout** (S3, Yellow, confirmed)

- Evidence: `e2e/images.spec.ts:27-41` sets `reducedMotion: 'no-preference'` (`:28`) and drafts 16 rounds through the real wheel animation. Measured from the ci-flake probe (run 38077815031, 5 runs, retries off) it took 50.05 to 51.13 s with a median of 50.645 s. The suite took 60.7 to 67.6 s with a median of 64.1 s, and every other test took under 6.4 s. The sum of the other 23 test medians is about 31.8 s of test time. The one test is therefore about 79% of the median suite time and sets the critical path, which is inferred from the durations and not profiled. The per-test timeout is 120 s (`playwright.config.ts:7`), so the margin is 2.4x. The roughly 3 s per round figure is inferred from 50.6 s over 16 rounds. In CI run 38073805267 (single run) `pnpm test:e2e` took 64 s of a 127 s `e2e` job.
- Fix: Keep one animated assertion and stop paying for 16 animated rounds. In `e2e/images.spec.ts`, assert the spin and the loaded wheel images in round 1 (`:33-34`), then call `page.emulateMedia({ reducedMotion: 'reduce' })` before `draftSixteen`, and keep the pitch and results checks. The wheel already supports tap to skip (`wheel.test.tsx:140`), which is a second option. A third option is to tag the test and run it in its own CI job so the other 23 tests finish in about half the time.
- Notes: The margin matters most on a loaded laptop or a 4x CPU throttle in the phone projects, where the animated path could approach 120 s. Source for every number is the ci-flake probe and the single CI run named above.

### SF-12

**33 PGlite tests run the full migration in beforeEach, and that cost is about 61% of summed unit test time** (S3, Red, confirmed)

- Evidence: `src/leaderboard/server/__tests__/handlers.test.ts:80-87`, `hardening.test.ts:25-31` and `src/gate/__tests__/unlock.test.ts:17-23` create a PGlite client and run the real `migrate()` before every test (`src/leaderboard/server/__tests__/fixtures.ts:24-29`). That is 24 + 4 + 5 = 33 tests, including two pure-function tests in `hardening.test.ts` (`:42`, `:53`). Measured from the ci-flake probe (5 runs, ubuntu-latest) the 33 tests have per-test medians of 1.40 to 2.90 s (median of medians 1.65 s) and none ran faster than 1.09 s in any run. The two pure tests took 2.65 s and 1.63 s at the median, which shows the per-test duration includes the hook. The three files sum to 56,594 ms of the 93,055 ms sum of per-file median test times (60.8%, a sum across files and not wall time). By median 42 of the 466 tests exceed 1 s and 33 of those are these. Vitest's hook timeout is 10 s by default and the slowest hook-inclusive test took 3.3 s, so the margin is about 3x. Whether the hook or the test body dominates was not isolated, so the split is inferred from the two pure tests.
- Fix: Create the PGlite client and run `migrate()` once per file in `beforeAll`, then reset state in `beforeEach` with `TRUNCATE leaderboard_entries, rate_limit_events RESTART IDENTITY`. Keep one test per file, or one new test, that builds a fresh migrated database so the migration itself stays covered every run. Expected saving is up to about 33 x 1.1 s of summed test time, less on wall clock because Vitest runs files in parallel. The saving is not measured.
- Notes: Red because the files are database tests. The change touches test setup only. It must keep the real migrations (`src/leaderboard/server/__tests__/fixtures.ts:27`) so the real-migrations check in `checked` still holds.

### SF-13

**Neither CI job has a timeout-minutes, Playwright has no globalTimeout, and a second quick merge cancels the first main run** (S3, Yellow, static-only)

- Evidence: `.github/workflows/ci.yml:17-18` and `:49-50` set no `timeout-minutes`, so a hung step, for example a `next start` that never answers, can hold a job for GitHub's default of 360 minutes. `playwright.config.ts` sets no `globalTimeout` (documented at `test.d.ts:1427`), only 120 s per test (`:7`) and 60 s for the `webServer` (`:22`). Run 38073805267 (single run) finished `check` in 142 s and `e2e` in 127 s, so a 15 minute limit leaves a wide margin. `concurrency` uses `group: ci-${{ github.ref }}` with `cancel-in-progress: true` (`ci.yml:12-14`), so two merges to `main` in quick succession cancel the first commit's run, and a failure on that earlier commit could go unseen while the repo's rule is that merge equals ship.
- Fix: Add `timeout-minutes: 15` to both jobs. Add `globalTimeout: 10 * 60_000` to `playwright.config.ts`. Change `cancel-in-progress` to `${{ github.ref != 'refs/heads/main' }}` so runs on `main` always finish.

### SF-14

**CI skips `format:check`, a dependency audit and coverage, caches no Playwright browsers, and builds the app twice** (S3, Yellow, static-only)

- Evidence: `package.json` defines `format:check` and `.github/workflows/ci.yml` never runs it. No job runs `pnpm audit`. Coverage is not configured. `@vitest/coverage-v8` is not a dependency and `vitest.config.mts:13-17` has no `test.coverage` block. Vitest 5.0.3 lists `@vitest/coverage-v8` as an optional peer pinned to exactly 5.0.3 (`node_modules/vitest/package.json`). The `e2e` job downloads Chromium on every run (`ci.yml:59`, 24 s in run 38073805267, single run) and runs its own `pnpm build` (`:60`, 21 s) after the `check` job built the same commit (`:38`, 26 s). The two jobs run in parallel with no `needs`, so e2e does not wait for lint or unit tests. Actions are pinned to major tags and not to commit SHAs (`ci.yml:20-22,28,52-54,64`). `.github/` holds one workflow and no dependency-update config. `knip` ran once by hand to find dead exports (`docs/decisions/dispatch-5.md:76`) and is neither a dependency nor a CI step. On the plus side the permissions are read only (`ci.yml:9-10`).
- Fix: Add `pnpm format:check` to the `check` job before lint. Add `pnpm audit --prod --audit-level high` as a step with `continue-on-error: true`, and make it blocking after a clean month. Cache `~/.cache/ms-playwright` keyed on the Playwright version so the install step costs seconds on a hit. Optionally build once in `check` and hand `.next` to the e2e job as an artifact. Add Node 24 to a matrix on `check` so one job matches production. Add `knip` as a devDependency with a CI step if a standing dead-export check is wanted. For coverage see the notes.
- Notes: Vitest coverage. Adding it takes one devDependency (`@vitest/coverage-v8@5.0.3`), a `test.coverage` block in `vitest.config.mts` (`provider: 'v8'`, `include: ['src/**']`, `exclude` for test files and generated data, reporters `text-summary` and `json-summary`) and a `test:coverage` script. The run cost is not measured. It is worth adding as a report-only local diagnostic. A name scan (`F-static-work/unnamed.mjs`, a heuristic, single pass) found 19 of 79 non-engine source modules whose file name no test mentions, among them `DailyScreen`, `HistoryList`, `LeaderboardScreen`, `ThemeToggle` and `useToday`. Several of the 19 run under a parent's test, so the list is a lead and one coverage table would settle it at a glance. It is not worth a CI percentage gate. Line coverage cannot see that `cup.test.ts:87-91` or `unlock.test.ts:74-79` assert nothing about behavior, and a threshold rewards executing lines more than asserting outcomes. CI runs Node 22 (`ci.yml:24,56`) and `package.json` sets `engines.node` to `>=22`, while the brief says production runs Node 24.x, so no job exercises the production Node major. A two-version matrix on the `check` job costs one more run of it. `src/app/layout.tsx:3` imports `next/font/google`, which Next.js fetches at build time, so both build steps (`ci.yml:38,60`) depend on an outside font host. That is documented Next.js behavior and not an observed failure.

### SF-15

**A stale local server on port 3400 is silently reused, so the e2e suite can run against old code** (S3, Yellow, static-only)

- Evidence: `playwright.config.ts:3` fixes the port at 3400 and `:21` sets `reuseExistingServer: !process.env.CI`. Locally, any process already listening on 3400 is reused without a check. A leftover `next start` from an older build would run the new specs against old code, and they would pass or fail for the wrong reason. Nothing in the suite compares the running build with the checkout. Playwright documents `!process.env.CI` as the usual setting (`test.d.ts:11141-11146`), so this is a local hazard and not a CI one. Static read.
- Fix: Set `reuseExistingServer: false` and accept a startup error on a busy port, or take the port from `process.env.E2E_PORT` and default to a free one. Add a one-line check in a `globalSetup` that fails if `/` was served by a build older than `.next/BUILD_ID`.
- Notes: How the server could expose its build id for the check is not verified. A simpler option is to drop reuse and let Playwright start its own server every local run, which costs a few seconds.

### SF-16

**The draftSixteen helper hides layout problems and hard-codes the engine-3 token prefix in three tests** (S3, Yellow, static-only)

- Evidence: `e2e/helpers.ts:4-15` clicks the first `candidate-*` and then the first enabled empty `slot-*` for 16 rounds. It assumes four things. First, `click()` scrolls the target into view, which hides any element that sits behind a sticky bar or off screen, while GATE 4 assertion 1 requires every primary action to be reachable without scrolling. Second, the candidates exist only after the wheel reveal (`src/components/run/DraftBoard.tsx:193` renders them when `revealed`), so the helper leans on Playwright's actionability wait. Third, the only progress check is the round header text (`:7`), and a pick that silently fails to advance waits for the 120 s test timeout (`playwright.config.ts:7`) instead of failing in seconds. Fourth, it always takes candidate 0 and the first free slot, so it never exercises bench slots first, Position First, rerolls or a candidate that does not fit. `shareAndReplay` (`:24-36`) reads the clipboard (`:27`), which works on Chromium only, right after clicking Share (`:26`) and without waiting for the 'Link copied' status that appears only after the write resolves (`src/components/results/ShareActions.tsx:21-29,59`). The read could in principle run before the write finishes. Nothing observed so far shows that happening (0 failures in 120 probe executions), so it is an ordering risk and not a measured flake. The helper matches `/\/r\/pd3\./` (`:28`). That prefix and `engineVersion: 'pokedraft-engine-3'` and `/^pd3\./` in `e2e/leaderboard.spec.ts:63-64` all break on the next engine bump, which would fail three tests (`e2e/challenge.spec.ts:17,30` and `leaderboard.spec.ts:40`). `pngSize` (`:17-22`) reads the PNG header and is sound.
- Fix: Give `draftSixteen` options for the pick and slot strategy, add `await expect(locator).toBeInViewport()` before each click when it runs in a phone project, and pass `{ timeout: 5000 }` to the round header assertion. In `shareAndReplay` add `await expect(page.getByText('Link copied')).toBeVisible()` between the Share click and the clipboard read. Move the engine-3 literals into one `e2e/constants.ts` with a comment that `goldens.test.ts:75-77` forces a review at each bump. Keep the values as literals and do not import them from `src/engine`, so the expected value is never built by the code under test.

### SF-18

**The down migrations and the rollback script are never run by a test** (S3, Red, static-only)

- Evidence: `drizzle/rollback/0000_leaderboard_entries.down.sql` and `0001_rate_limit_events.down.sql` are single `DROP TABLE IF EXISTS` statements. `scripts/db/rollback.mts:20-27` finds the newest applied migration, reads its paired down file by journal tag, splits it on every semicolon, runs it in a transaction and deletes the bookkeeping row. It runs through the Neon HTTP driver, so it works only against a live database. No test applies a down file, checks that every journal entry has a down file (`drizzle/meta/_journal.json` lists `0000_leaderboard_entries` and `0001_rate_limit_events`), or runs up, down, up on PGlite. `docs/decisions/dispatch-4.md:76` records one manual rollback proof on a Neon branch. A future migration 0002 could ship a wrong or missing down file and CI would stay green. The `split(';')` at `rollback.mts:21` would also break on a down file that contains a semicolon inside a string or a `DO $$` block.
- Fix: Add `scripts/db/__tests__/migrations.test.ts`, which `vitest.config.mts:14` already includes. Test 1 'every journal entry has a paired down file' reads the journal and `drizzle/rollback/`. Test 2 'up, down, up leaves the expected tables' runs `migrate()` on PGlite, lists `pg_tables`, expects ['leaderboard_entries', 'rate_limit_events'], runs the newest down file, expects ['leaderboard_entries'], deletes the bookkeeping row as `rollback.mts:26` does, re-runs `migrate()` and expects both tables again. Move the split into a small exported helper that both the script and the test use.

### SF-19

**The live suite writes one production row per run, cannot be rerun on the same day, and fails without saying how to recover** (S3, Red, static-only)

- Evidence: `e2e-live/live.spec.ts:22-57` submits a real run as `verify-bot` to whatever `LIVE_URL` names (`playwright.live.config.ts:3-6`). The daily nickname index allows one `verify-bot` row per daily board (`src/db/schema.ts:33-35`), so a second same-day run fails with the daily duplicate conflict until someone deletes the row by hand with `pnpm db:delete-entry --nickname verify-bot --date <NY date>` (`docs/decisions/dispatch-5.md:26`). The test has no cleanup step, and its failure message does not mention the command. The submit limit of 10 per IP per hour (`STATE.md` line 18) is shared with any manual check. The config comment says the suite never runs in CI (`playwright.live.config.ts:3`). This suite is also the only test of the real `POST /api/leaderboard` wiring, the real database and the OG route (see SF-06). Static read, not run.
- Fix: In `e2e-live/live.spec.ts` catch a DAILY_ALREADY_SUBMITTED reply and fail with a message that prints the exact `db:delete-entry` command and the NY date. Optionally take the nickname from `process.env.LIVE_NICK ?? 'verify-bot'` so a second run on the same day can use `verify-bot-2` without a manual delete. Keep the `verify-` prefix so rows delete in bulk.
- Notes: Low severity because the delete step is documented in the decision log. The point is that a fresh agent running the suite twice gets a confusing failure.

### SF-20

**The scouting test 'raises KIC only for keepers' cannot fail today, because no species has a positive KIC adjustment** (S3, Red, confirmed)

- Evidence: `src/scouting/__tests__/review-rules.test.ts:22-27` selects species with `adjustments.KIC > 0` that lack GK as a best role and expects none. Measured with jq over `src/data/scouting.json` (single pass, 1025 rows), `jq '[.[] | select((.adjustments.KIC // 0) > 0)] | length'` returns 0. The KIC key exists on 8 rows and every value is between -4 and -6. The filter can match only a positive KIC, so it matches nothing, and nothing proves it would flag a violating row. The 'raises KIC for keepers' half of the title also has no row behind it. The sibling pace rule (`:6-12`) is a real guard, since jq finds 360 pace-weak species, 411 with W or WB as a best role, and an empty intersection.
- Fix: In `review-rules.test.ts` extract the predicate into a named function and add a positive control that runs it on a synthetic row `{ name: 'control', adjustments: { KIC: 3 }, bestRoles: ['ST'] }` and expects it flagged. Then decide whether any keeper should ever get a positive KIC, and if not, rename the test to 'never raises KIC for any species'. Both edits stay inside `src/scouting/__tests__/`. Data and coefficients stay unchanged.
- Notes: Frozen area (`src/scouting/**`), so this is report only. Source is the jq command in the evidence, run once on the 928e4b1 checkout.

### SF-21

**E2E tests click server-rendered buttons straight after goto, so a click before hydration would be lost and a retry would hide it** (S3, Yellow, needs-browser-proof)

- Evidence: The first HTML already holds working-looking controls. `src/app/play/page.tsx:10-16` waits for the request so the server renders the start panel, `src/components/run/PlayScreen.tsx:192` renders `run-start` with `onClick={start}`, and `e2e/server-html.spec.ts:12-16` asserts that panel text is in the first response. The home page is a client component that prerenders its default state (`src/app/page.tsx:3-8`, `src/components/home/HomeScreen.tsx:34-35,93-107`). Specs click these controls right after `page.goto` with no hydration signal. Randomize at `e2e/builder.spec.ts:8-9` and `e2e/images.spec.ts:89-90,121-122`. `run-start` at `e2e/challenge.spec.ts:12-13,23-26` and `e2e/images.spec.ts:31-32,47-48`. Playwright's documented click checks (visible, stable, receives events, enabled) look at the DOM and not at React's event wiring, so a click that lands before hydration meets no handler. A second window sits after hydration. The mount effect at `HomeScreen.tsx:40-59` calls `setDraft(shared ?? freshDraft(next))`, so a Randomize that lands between the hydration commit and that effect could be overwritten (inferred from React's update order, not observed). Measured 0 failures and 0 flaky tests in 120 probe executions (ci-flake run 38077815031, 5 runs of 24 tests) and no 'flaky' or '(retry #' line in 364 older CI executions, so the race is only a lead. `playwright.config.ts:10` would turn one lost click into a silent retry pass.
- Fix: Add a `gotoReady(page, url)` helper in `e2e/helpers.ts` that calls `page.goto` and then waits for hydration, and use it in every spec that clicks right after load. Without an app change, wait for React's own marker with `page.waitForFunction((sel) => { const el = document.querySelector(sel); return el !== null && Object.keys(el).some((k) => k.startsWith('__reactProps$')); }, '[data-testid="run-start"]')`. With a one-line app change, set `document.body.dataset.hydrated = 'true'` from a client effect and wait on that attribute. To prove or refute the lead, run one probe in Chromium that delays `**/_next/static/chunks/**` by 1.5 s with `page.route`, clicks `run-start` as soon as it is visible, and checks whether `round-header` appears.
- Notes: Slow phone CPUs widen the window, so the phone projects from SF-01 should run with CDP `Emulation.setCPUThrottlingRate` and would expose the race first. The same window is a product question, because a real player can tap a server-rendered button before it works. That belongs to the UI lane.

### SF-22

**The no-em-dash rule has three narrow guards and no scan of the shipped copy** (S3, Yellow, static-only)

- Evidence: A grep for U+2014 over `src`, `public`, `e2e`, `e2e-live` and `scripts` (single pass) finds the character only inside detectors. Those are `src/scouting/review.ts:49` (a Zod refine on review rationales, with retained copies under `src/engine/versions/v1` and `v2`), `src/components/__tests__/PackCredit.test.tsx:37` and `src/engine/__tests__/recap.test.ts:94`. So the source is clean today. The guards cover review rationales, the pack credit element and the recap lines. Nothing scans component copy, page metadata, the gate, How to Play, error strings or the OG and card text. `docs/reports/finish-qa.md:143` records check C1 as PASS (0 em dashes in rendered text on 9 routes at 4 widths, and in the `/gate` HTML) from a throwaway viewport script (`:77`), and that script is not in the repo (the only `setViewportSize` call outside the docs is `e2e/leaderboard.spec.ts:116`, and the `scripts` folder holds no viewport script). The card and OG routes draw their text with satori, which no DOM test can read, so only a scan of the source can cover it. `CLAUDE.md` lists the rule under standing invariants.
- Fix: Add `src/__tests__/copy-invariants.test.ts`. It reads every `.ts` and `.tsx` file under `src/app`, `src/components` and `src/ui`, skips `__tests__`, and expects no U+2014. Include a positive control that runs the same scanner on a string holding the character and expects one hit, so the test cannot pass by scanning nothing. Add one e2e test that visits every route in `F-coverage-matrix.md` and expects `document.body.innerText`, `document.title` and the `description` meta content to hold no U+2014. Leave `src/engine/versions/**` out of the scan because it is frozen.

### SF-23

**A handful of tests would pass on a constant or build their expected value from the code under test** (S3, Yellow, static-only)

- Evidence: The repo rule is that a test names the bug it catches and asserts literal values. I read 91 tests across engine, scouting, leaderboard, UI and e2e (appendix A of `F-coverage-matrix.md`). Most are sound. These are not. `src/ui/__tests__/runs-validation.test.ts:72-75` expects `'challengeSettings' in settings` to be false, which holds for any module without that name, so it is vacuous. `src/components/__tests__/PackCredit.test.tsx:21-22` takes the expected author and license from `PACKS`, the data the component renders, so a wrong value in `pack.json` passes (the literal 'Pixel' at `:23` is independent). `src/components/run/__tests__/runState.test.ts:21,25-27` compares two values that are both null when the phase is not `choosing`. The `rollId` assertion at `:24` is the real guard, and `docs/decisions/dispatch-5.md:74` records that the test passed before the fix as well. `src/components/results/__tests__/SharedRun.test.tsx:12,19` sets `current` by hand, so the derivation of that flag is not exercised there (`e2e/old-links.spec.ts:12` exercises it for an engine-1 token). `src/components/leaderboard/__tests__/SubmitPanel.test.tsx:100-110` checks 1, 21 and 2 characters and never asserts that 20 characters enables Submit. `src/app/r/[token]/__tests__/replay-count.test.ts:56-61` reads the React element tree through `props.children.props.children`, so a JSX restructure breaks it with no behavior change. `src/gate/__tests__/unlock.test.ts:74-79` is covered by SF-07. A static scan of 385 `it` and `test` blocks in 53 files (`F-static-work/weakonly.mjs`, a heuristic, an `it.each` counts once) found 9 blocks whose matchers are all weak shapes. I read all nine and each pairs with a presence check or a positive control, so none is vacuous in effect. Engine examples such as `src/engine/__tests__/cup.test.ts:87-91` (two `runCup` calls compared with each other) sit in a frozen area, back onto literal pins at `:93-125` and `goldens.test.ts:79-99`, and appear in the appendix only.
- Fix: In `runs-validation.test.ts` delete the `challengeSettings` test, since a test that proves an export is absent checks no behavior. If a standing dead-export check is wanted, add `knip` as a CI step (SF-14), because it ran once by hand (`docs/decisions/dispatch-5.md:76`) and nothing repeats it. In `PackCredit.test.tsx` assert the literal author and license strings copied from the pixel pack's `pack.json` at review time. In `runState.test.ts` replace the ternaries with `expect(swapped.state.phase.kind).toBe('choosing')` and then compare the two rolls directly. In `SubmitPanel.test.tsx` add a 20 character case that expects Submit enabled. In `SharedRun.test.tsx` add a case that feeds `replayAnyVersion` output unmodified. In `replay-count.test.ts` keep the count assertions and drop the element-tree walk by asserting through a render of the page.

### SF-24

**Several tests pin source text or concatenated markup, and no automated check guards the CLS claim** (S3, Yellow, static-only)

- Evidence: `src/app/__tests__/fonts.test.ts:7-19` reads `src/app/globals.css` as text and matches the numbers 78.13%, 125.94%, 27.26% and 0%. It pins the fallback face and not the layout shift, so 'CLS stays 0.000' has no automated check anywhere. The Lighthouse runs are manual (`docs/reports/finish-qa.md:127-129` records CLS 0 to 0.028). `src/components/leaderboard/__tests__/Board.test.tsx:120-121` pins the whole `textContent` of two rows, for example '1MistyOpen, Squad First, All regionsW-D-L8-0-0Team Score845', so an added separator or a reordered span fails it. `src/components/run/__tests__/RoadStrip.test.tsx:14-22` pins the ladder numbers 280, 730 and 980 and one phrase of copy. `src/components/builder/__tests__/Builder.test.tsx:127-137` pins 'CB fit30' for Pikachu, which couples the test to frozen scouting data, and `src/components/wheel/__tests__/wheel.test.tsx:120` pins 12 species ids and names. The data coupling is deliberate and harmless, but each file must change when the data changes. No `toMatchSnapshot`, `toMatchInlineSnapshot` or `toHaveScreenshot` exists in the repo, and `e2e/leaderboard.spec.ts:127,132` writes screenshots that nothing compares (grep, single pass).
- Fix: Keep `fonts.test.ts` as a tripwire and add the missing behavior check. In a new `e2e/layout-shift.spec.ts` collect `layout-shift` entries with a `PerformanceObserver` (buffered) on `/`, `/play?mode=kanto151&f=4-3-3&order=squadFirst&seed=e2e-151`, `/daily` and `/leaderboard` with a stubbed board, and assert the summed value is at most a ceiling taken from the first real run and written into the test comment. Run it with CDP CPU throttling in the phone project. In `Board.test.tsx` assert per cell with `within(row).getByText`. In `RoadStrip.test.tsx` keep the numbers and drop the copy phrase or move it to one copy test. Do not add snapshot files.
- Notes: The ceiling must come from a measurement. Lighthouse reported CLS 0 to 0.028 locally (`finish-qa.md:127-129`), so the first real run decides whether the ceiling is 0 or a small number.

### SF-26

**Seed expiry and the New York midnight boundary are tested for dailyDate only, not for the submit window** (S3, Red, static-only)

- Evidence: `dailyDate` is tested at both UTC offsets (`src/leaderboard/__tests__/daily-nickname.test.ts:8-11`, instants `03:59Z` and `04:00Z` in October and `04:59Z` and `05:00Z` in December) and `previousDate` across month and year ends (`:15-16`). The submit window itself, `dailyDateForSeed` (`src/leaderboard/daily.ts:45-51`, used at `src/leaderboard/server/handlers.ts:149-155`), has no direct test. The handler tests run at one instant, `NOW = 2026-10-09T16:00:00Z` (`handlers.test.ts:23`), which is noon in New York and far from midnight. They accept today's seed (`:208-224`) and yesterday's (`:226-230`). No test submits a seed from two days ago, which `dailyDateForSeed` answers with null so the run files on the all-time board with `dailyDate` null, and none moves `now` across `04:00:00Z` to see yesterday's seed expire. The two transition days of 2026 (2026-03-08, which is 23 hours long, and 2026-11-01, which is 25 hours long) are not exercised. No test uses a wall clock. Every date in a test is a fixed instant (grep of `Date.now`, `new Date(` and `Math.random` over tests, single pass), so the tests have no midnight time bomb of their own.
- Fix: In `handlers.test.ts` add 'yesterday's seed expires at New York midnight' with two submits of the `2026-10-08` seed under two injected clocks. At `2026-10-10T03:59:59Z` expect 201 with `dailyDate` '2026-10-08'. At `2026-10-10T04:00:00Z` expect the run on the all-time board with `dailyDate` null, or whatever the lane owner confirms the rule should be. Add 'a seed two days old files on the all-time board' for the same case away from the boundary. In `daily-nickname.test.ts` add `dailyDate` literals around the two transition days, worked out by hand from the New York offsets (UTC-5 in winter, UTC-4 in summer). `2026-03-08T04:59:00Z` gives '2026-03-07', `2026-03-08T05:00:00Z` gives '2026-03-08', `2026-03-09T03:59:00Z` gives '2026-03-08' and `2026-03-09T04:00:00Z` gives '2026-03-09'. `2026-11-01T03:59:00Z` gives '2026-10-31', `2026-11-01T04:00:00Z` gives '2026-11-01', `2026-11-02T04:59:00Z` gives '2026-11-01' and `2026-11-02T05:00:00Z` gives '2026-11-02'. The values come from the offsets and not from the code under test. A throwaway Node script over `Intl` (`F-static-work/dst-check.mjs`, single run) matched all 8 and the two October values above, and the repo's own suite did not run.
- Notes: Whether an expired daily seed should land on the all-time board is a product rule the tests should pin once the lane owner confirms it. The current code path is `handlers.ts:149-155` and `:160-161`.

### SF-27

**The Daily page keeps its date until a parent re-renders, and no test controls the browser clock** (S3, Yellow, needs-browser-proof)

- Evidence: `src/components/leaderboard/useToday.ts:7-19` reads the date with `useSyncExternalStore` and a `subscribe` that never fires. `src/components/daily/DailyScreen.tsx:14` calls it and `:25` keys `Challenge` on `${today}|${formation}`, so the date is read again only when `DailyScreen` re-renders. A re-render after New York midnight would change the key, remount `Challenge` and drop an in-progress draft without a message (a hypothesis, no trigger found by reading). Meanwhile `dailyDateForSeed` keeps yesterday's seed valid (`src/leaderboard/daily.ts:43-51`), so a run started before midnight can still be submitted. `src/app/leaderboard/page.tsx:10-12` says a page left open past midnight 'moves on', which holds only at the next render. No e2e test controls the clock (no `page.clock` call in `e2e` or `e2e-live`), and fake timers appear only in `src/components/wheel/__tests__/announce.test.tsx:17,20`. The e2e Daily test (`e2e/leaderboard.spec.ts:40-69`) asserts no date from the clock. The link date comes from the stubbed reply (`:11`, `:65-68`), so it has no midnight race of its own.
- Fix: Add `e2e/daily-midnight.spec.ts` with Playwright's `page.clock`. 'A Daily draft survives New York midnight' calls `page.clock.install({ time: new Date('2026-10-10T03:55:00Z') })`, opens `/daily`, starts the run, makes three picks, runs `page.clock.fastForward('10:00')` past `04:00Z`, then makes a fourth pick and expects `round-header` to read 'Round 5 of 16'. A pass shows that nothing re-renders `DailyScreen` by itself after midnight. A fail names a trigger and goes to the UI lane. Add a jsdom test that renders `DailyScreen` under `vi.setSystemTime('2026-10-10T03:55:00Z')`, moves the system time past `04:00Z`, calls `rerender`, and pins the result (a new key and a fresh `Challenge`), so a later change to the freeze rule is a deliberate edit.
- Notes: Playwright 1.64 includes the `page.clock` API. The first run decides whether this finding stays open.

### SF-28

**The History list and the theme toggle have no behavior test, and axe sees History only when it is empty** (S3, Yellow, static-only)

- Evidence: `src/components/history/HistoryList.tsx:33-69` has three states (loading `:36`, empty `:37-46` with `history-empty`, list `:47-68` with `history-list`) and formats dates with the browser locale (`:9-13`, 'Unknown date' for a bad value). No test file names `HistoryList` and no test uses `history-list` or `history-empty` (grep, single pass). `e2e/a11y.spec.ts:12` loads `/history` with empty storage, so axe sees only the empty state. `docs/reports/finish-qa.md:93` marks F12 as PASS (unit) locally from `runs-validation.test.ts`, which covers the loaders and not the list rendering, and as PASS (renders) on the production baseline, which is not a committed test. `src/components/ThemeToggle.tsx:7-45` cycles system, dark and light, writes `pokedraft:theme` and sets `data-theme` after hydration (`:23-29`), and no test names it. All e2e runs force dark (`playwright.config.ts:15`). `ResultsView.test.tsx:113` covers writing one history record, and no test reads it back through the page.
- Fix: Add `src/components/history/__tests__/HistoryList.test.tsx` (jsdom). 'renders one row per saved run with its record and Team Score' seeds `pokedraft:history:v1` with two literal records and expects two `li` items whose text holds the literal record and score. 'shows the empty state and a Start a run link' expects `history-empty`. 'shows Unknown date for a bad timestamp' seeds one entry with `at: 'nope'`. Add `src/components/__tests__/ThemeToggle.test.tsx` that clicks through the cycle and expects the visible text 'Auto', 'Night', 'Day', the accessible names `Theme: auto. Change theme`, `Theme: night. Change theme` and `Theme: day. Change theme`, the `data-theme` values dark, light and absent, and `localStorage['pokedraft:theme']`. Add `e2e/history.spec.ts` that finishes the seeded 151 run from `e2e/challenge.spec.ts:12-15` and then expects `/history` to list a row reading '3-0-2'.
- Notes: The record literal '3-0-2' comes from the pinned run at `e2e/challenge.spec.ts:17`. Storage keys come from `src/ui/runs.ts:74` and `src/components/ThemeToggle.tsx:13`.

### SF-29

**The queued GK review rule has no test, and 2 of 160 GK-best species (Jigglypuff and Wigglytuff) already break it** (S3, Red, confirmed)

- Evidence: `src/scouting/__tests__/review-rules.test.ts:5-28` holds three rules (pace and W or WB, spe at most 30, KIC) and no GK rule. `docs/reports/scouting-audit-v2.md:122` (follow-up 6) asks for one, 'GK cannot be a best role when its role blend is the species' lowest', and `docs/queue/scouting-carryovers.md:36` queues it as item 10, with the Jigglypuff data fix as item 6 (`:32`). Measured with a throwaway script (`F-static-work/gk-blend2.mts` run through the repo's `tsx`, single run) that reads `src/data/scouting.json` and applies `roleBlend` (`src/scouting/fit.ts:4-14`) over all 10 roles. Of 160 species that list GK as a best role, 2 have GK as the lowest of all 10 blends. They are #39 Jigglypuff (GK blend 32.7) and #40 Wigglytuff (48.8). Wigglytuff appears in no file under `docs/` and not in `STATE.md` (grep). Reading the rule as 'lowest of the species' three best roles' instead flags 79 of 160 (`F-static-work/gk-blend.mts`), so the wording of the rule decides what the test catches.
- Fix: In `review-rules.test.ts` add 'never lists GK as a best role when GK is the species' lowest role blend' using `roleBlend` over `ROLES`, plus a positive control on a synthetic attribute set where GK scores lowest. Per the repo's guard-test rule commit it Red first. It fails on #39 and #40 today. Then the scouting lane fixes the data (audit follow-up 3 proposes Jigglypuff bestRoles CM, DM, WM) and decides Wigglytuff. Do not allowlist the two names, because that hides the defect the test exists for.
- Notes: Frozen area (`src/scouting/**`, `src/data/*.json`), so this is report only. Source for the 2 of 160 and 79 of 160 counts is the two scripts named above, each run once against the 928e4b1 checkout.

### SF-30

**The accessibility scan of an 8-0-0 result page runs while a 600 ms banner animation may still be playing** (S3, Yellow, needs-browser-proof)

- Evidence: `e2e/a11y.spec.ts:13` opens `/r/<token>` for a flawless 8-0-0 run. `src/components/results/ResultsView.tsx:72-76` renders a flawless banner, and `src/components/results/ResultsView.module.css:139,148-157` animates it with `flood-in` over 600 ms from opacity 0. The spec waits only for the footer (`a11y.spec.ts:20-21`) and then runs axe with `color-contrast` on. It runs under the default motion preference, because `playwright.config.ts:15` sets only the color scheme and the spec sets none, so the global reduced-motion rule (`src/app/globals.css:434-442`) does not apply. A scan that lands mid-animation reads blended colors and could report a false violation or pass on the wrong colors. This is a lead. The measured result is 0 axe failures in 5 probe runs (ci-flake run 38077815031) and in the CI runs I read, and I did not observe a mid-animation scan. Infinite animations also exist (`src/components/home/SidePanel.module.css:45` and `src/components/run/DraftBoard.module.css:315`), so a plain wait on `getAnimations()` would hang on those pages.
- Fix: In `e2e/a11y.spec.ts` add a `settle(page)` step before `analyze()`. It awaits `Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished))` inside `page.evaluate`. Keep one extra pass under `test.use({ reducedMotion: 'reduce' })` so the end state is scanned even if a new animation is added. To prove the lead, run axe in a loop that starts at 0, 100, 200, 300 and 400 ms after `load` and compare the contrast results.
- Notes: Whether axe-core blends element opacity mid-animation is not verified here. The settle step is cheap either way and also removes a source of nondeterminism from the scan.

### SF-31

**role="alert" on the gate, submit and board errors is asserted by no test** (S3, Yellow, static-only)

- Evidence: `src/app/gate/page.tsx:55`, `src/components/leaderboard/SubmitPanel.tsx:113` and `src/components/leaderboard/Board.tsx:43` render error text with `role="alert"`. A grep of `src` tests and `e2e` for the word alert finds no match (static grep). `finish-qa.md:111` marks the screen reader announcement check A7 as PARTIAL, so the gap is known and still open.
- Fix: Assert `getByRole("alert")` with the message text in `SubmitPanel.test.tsx:112,139` and `Board.test.tsx:36`, and in the gate page test proposed in SF-07.
