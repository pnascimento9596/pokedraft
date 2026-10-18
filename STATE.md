# STATE

Measured ground truth. Each PR's section cites its reviewed head and the gates run there; the merge
and its squash SHA are recorded in the next PR's STATE update.

## Team readability

Branch `feat/team-readability` off `c33fa17`. Wave 3 row 3d, matchday pitch only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, and `MatchPlayer.tsx` and `Touchline.tsx` are untouched. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Each side's players stand on a ring in their kit. Your kit is the type most of your starting eleven carry; a dual type counts toward both its types, and a tie goes to the type seen first in slot order. The opponent wears its theme's type.
- When the two kits look too alike (closer than 10 in the CVD audit's own metric, in normal, protanopia or deuteranopia vision), the opponent wears white. A club with no theme keeps the old blue unless it clashes too.
- Sprites draw at 44px on phones instead of 38.4px. Wider pitches keep 56 and 72px.
- A move's badge over a player now stays inside the pitch. In the golden group match, 5 to 7 of 13 badges were cut off by up to 65px at 390, 360 and 320; none are now.
- The rings show in Quick and with reduced motion. They add no element and no per-frame write.
- The 2f carryover (sweat pip and stamina arc not sized in px) did not reproduce: both already sit in the unscaled player box at 6 by 8 and 24 by 8 px at 390 and 320. Closed in the decision log.

RED commit: `33a3e60` (3 of 3 unit files failed: the 2 collected tests, and `kit.test.ts` with 7 tests and `badge.test.ts` with 4 tests could not import the missing modules; `team-readability.spec.ts` failed 7 of 7 on a `c33fa17` build).

Gates at `1303a58` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 12 touched code and test files.
- Unit tests: 1,530 passed in 178 files.
- Playwright (`CI=1`, fresh build at `1303a58`): chromium `team-readability`, `pitch-card-containment`, `mobile-pitch-fixes`, `broadcast-frame-loop`, `fatigue`, `callouts-type-effects`, `continuous-ball` and `one-shared-timeline` 34 passed; `mobile-targets` and `mobile-acceptance` 360 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, a frame-loop perf trace and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/team-readability.md`. Browser proof: `docs/reports/team-readability/`.

## Your calls card

Branch `feat/your-calls` off `20e34f6`. Wave 3 row 3h, matchday UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed; the card only calls `runCup`. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- At full time of a match where the player made at least one call, a "Your calls" card shows the assistant's score next to theirs, for example "Assistant 6-1, You 8-2". A shootout reads "0-0 (5-4 pens)".
- The card then names the call whose removal moves the score most ("Biggest swing: your Attack switch at 45'."), or says "No single call changed the score." It checks at most 8 calls and never names one it did not replay.
- It says whether later results changed without this match's calls, and "Later calls depended on this match." when they cannot be replayed without it. If the scores match, it says so.
- The card lives in the full-time footer, which shows only once the match is over. Matches with no call of the player's have no card. It shows scores only, so nothing new appears with ratings off.
- Each replay runs in its own task. In headless chromium at 4x CPU throttle, 8 replays took 254 to 300 ms with no long task; the score line showed after 45 to 59 ms.

RED commit: `cbd24ad` (2 of 2 files failed: the 1 collected test, and `your-calls.test.ts` with 5 tests could not import the missing module).

Gates at `3ac4b9b` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 9 touched files.
- Unit tests: 1,517 passed in 175 files.
- Playwright (`CI=1`, fresh build at `3ac4b9b`): `your-calls`, `manager-mode`, `prematch-merge`, `injury-staging`, `builder-matchday`, `mobile-targets` and `mobile-acceptance`: 382 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite, 360 and 320 proof (no new fixed width) and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/your-calls.md`. Browser proof: `docs/reports/your-calls/`.

## Test flakes and retained replays in CI

Branch `chore/test-flakes-retained-replays` off `bcf5493`. Tests, one build check and the CI workflow only (Green). No product code, and no file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The Quick cut-in unit test no longer steps 16 ms frames from kickoff. It jumps to 28' in 100 ms frames and steps only through the 30' goal. It took 7.7 to 14.1 s on hosted runners against a 15 s limit and timed out once; locally it fell from about 1.3 s to 0.3 s.
- The Builder test that flaked on `main` (run 39080199806) waits for the shared squad before it reads the pitch tokens, the fix #80 used for the same lazy-import race. A probe that delays the lazy import reproduced the CI failure exactly before the fix and passed after.
- `check-retained-replays.mts` now replays the v1 to v5 bundles and the engine-6 golden through the emitted `replayAnyVersion`, requires the emitted bundles to match `RETAINED_TOKEN_VERSIONS`, and requires a golden case for every retained and live version. It runs in the `check` job after `pnpm build` in about 0.7 s.
- `fatigue.spec.ts` encodes its squad for the live engine instead of a literal `pd6.` token. On engine 6 the token is byte-identical.

RED: no RED commit; the changes are tests and a check. The old replay check passed on a build with a tampered or missing v5 bundle, and the new one failed on both, on a tampered live engine and on a wrong expected hash. Output verbatim in the decision log.

Gates at `b941966` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 5 touched files.
- Unit tests: 1,481 passed in 171 files.
- `check-retained-replays.mts` after the build: 10 emitted golden replays passed; 0.64 to 0.65 s over three runs. `measure-retained-json.mjs` exited 0.
- Playwright (`CI=1`, fresh build): `fatigue.spec.ts` 1 of 1 passed.
- Review, hosted CI, the full e2e suite and a loaded full unit suite: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/test-chores.md`. No browser proof: no UI changed.

Merged origin/main after PR #98 (row 3f) at `c28cfd2`; only STATE.md conflicted. Then `callouts-type-effects.spec.ts` waits for a typed badge in one filtered locator (the badge lives only for its phase; PR #98's hosted shard 1 found it, lost it and failed twice with "element(s) not found", run 39157333456). RED for that race is the hosted run; it did not reproduce locally. After the merge and the spec fix, build exited 0, `callouts-type-effects` and `fatigue` passed 5 of 5 locally (`CI=1`, chromium) and `check-retained-replays.mts` passed 10 emitted golden replays. The full gates at the reviewed head are in the review receipt.

PR #100 (test flakes and retained replays, Green) merged as squash `20e34f6`, reviewed head `3432861`, GLM 5.3 Flash APPROVE in round 1 with canary `test-chores-4f9dc4674c3afab8be87f9fcad51dc26` echoed. At `3432861` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,511 unit tests passed in 173 files and Prettier passed on 8 touched files; hosted check and all eight e2e shards green, and the hosted `check` job ran `check-retained-replays.mts` after the build (10 emitted golden replays passed, v1 to v5 bundles and the live engine 6). Production `/api/health?db=1` served `20e34f6` with `db.status` ok, and `fatigue.spec.ts` plus `callouts-type-effects.spec.ts` against production (chromium) passed 5 of 5. No product code changed.

## Pre-match merge

Branch `feat/prematch-merge` off `bcf5493`. Matchday UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In manager mode the pre-match card shows the five tactic pills, labelled "Starting tactic", next to the opponent, style and shape. Sim mode shows no pills.
- The button reads "Kick off" and starts running play at once. The clock no longer stops at 0'. Half time, extra time and injury stops are unchanged.
- Picking a tactic other than the one the side starts in records it at minute 0 through `decide`, the path the old kickoff stop used, so tokens and old replays are unchanged. Keeping Balanced records nothing, so the assistant stays on.
- The touchline and the pre-match card share one `TacticPills` component. Every pill is at least 58 px tall at 390, 360 and 320 px.
- The brief's "weakest line and key player" on the pre-match card and a Team Score in the match header do not exist in the code; both are recorded as Wave 4 carryovers, not invented.

RED commit: `995c229` (8 of 23 failed).

Gates at `eb2af7b` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 20 touched files.
- Unit tests: 1,486 passed in 172 files.
- Playwright (`CI=1`, fresh build at `eb2af7b`): `prematch-merge` and `manager-mode` 19 passed; `builder-matchday`, `quick-not-broadcast`, `mobile-pitch-fixes`, `injury-staging` and `watch-live` 10 passed; `mobile-targets` and `mobile-acceptance` 360 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/prematch-merge.md`. Browser proof: `docs/reports/prematch-merge/`.

Merged origin/main after PR #99 (row 3-0, motion bounds) at `3ed16b8`; only STATE.md conflicted. After the merge typecheck and build exited 0, and `prematch-merge`, `manager-mode`, `continuous-ball` and `injury-staging` passed 22 of 22 locally (`CI=1`, fresh build). The full gates at the reviewed head are in the review receipt.

PR #98 (row 3f, prematch merge) merged as squash `b08c68c`, reviewed head `8789a50`, GLM 5.3 Flash APPROVE in round 1 with canary `prematch-merge-2a6e531b18d95c9875727ef78ceb72f7` echoed. At `8789a50` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,511 unit tests passed in 173 files and Prettier passed on 22 touched files. Hosted check and e2e shards 2 to 8 green; shard 1 failed `callouts-type-effects.spec.ts` at 320px twice (the typed badge was visible, then gone before its text was read: "element(s) not found"). It passed 3 of 3 locally at the same head, and `gh run rerun 39157333456 --failed` passed with no commit, so the receipt stood. The spec race is fixed in the test chore. Production `/api/health?db=1` served `b08c68c` with `db.status` ok, and `prematch-merge.spec.ts` plus `manager-mode.spec.ts` against production (chromium) passed 12 of 12. NOT RUN: physical phone check (owner action).

## Motion bounds

Branch `fix/motion-bounds` off `bcf5493`. Wave 3 row 3-0, pure staging in `src/ui/matchday/timeline.ts` (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- After a save, players the shot pulled upfield ease back into play over 600 ms instead of 300 ms, the same as after a goal. The keeper's parry now carries the ball half way back toward play and the settle carries the rest, so the ball no longer crosses the whole pitch in a third of a second.
- When a player wins the ball in a duel and passes, the pass leaves from where they won it. Before, the ball rode along with the winner as they sprinted away.
- At 2x everything still moves twice as far per frame (the bound is 4% of the pitch per frame at 1x and 8% at 2x), but no single frame goes past it any more.
- Golden cup, largest one-frame move at 1x: ball 3.61% (was 3.88%), player 3.53% (was 4.94%). At 2x: ball 6.77% (was 8.84%), player 6.26% (was 9.85%). Over the 20 sweep seeds the ball's worst 1x frame is 3.97% (was 4.41%), with no view at 4% (was 6 of 120).
- Measured first: both golden 2x maxima come from the one 59' save in match 0 (the player from the settle, the ball from the parry), not from duel turnovers. The sweep's 4.41% comes from the duel's pass after the tackle (0.33 to 0.44 of the phase), not from the 0.24 tackle window.

RED commit: `e847c38` (8 of 22 failed). Contract pin, not a RED guard: `364b537` (painter and `stageFrame` parity). It passed before the fix and fails 3 of 3 when the painter paints the rendered props instead of the feed's frame.

Gates at `d758f67` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 4 touched code files.
- Unit tests: 1,506 passed in 172 files.
- Playwright at `2e7d125` (`d758f67` changes only the unit guard; port 3611, `CI=1`, fresh build): `callouts-type-effects`, `set-pieces`, `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `fatigue`, `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `injury-staging`, `speed-aware-staging`, `score-lands-with-ball`, `watch-live`, `quick-not-broadcast`: 384 passed, 54 skipped by their own project gates. The new 2x case read 5.67% per frame (bound 8); a build with `bcf5493`'s staging read 7.91%.
- Review, hosted CI, the full e2e suite, 360 and 320 proof (no layout change) and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/motion-bounds.md`. Browser proof: `docs/reports/motion-bounds/`.

PR #99 (row 3-0, motion bounds) merged as squash `39a3a6a`, reviewed head `d86e58b`, GLM 5.3 Flash APPROVE in round 1 with canary `motion-bounds-73120b16774a27fbf0825311cbd44022` echoed. At `d86e58b` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,506 unit tests passed in 172 files and Prettier passed on 6 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `39a3a6a` with `db.status` ok, and `continuous-ball.spec.ts` plus `smooth-movement.spec.ts` against production (chromium) passed 4 of 4, the 2x case reading 5.67% per frame (bound 8%) and the 1x case 2.23%. NOT RUN: physical phone check (owner action).

## Wave 2 summary

Branch `docs/wave2-summary` off `87e7d51`. Docs only (Green). Appends the Wave 2 entry to `docs/reports/audits-2026-10-17/program-log.md`: every PR with its squash and reviewed head, the production checks, the measurements that moved, brief-vs-code notes and open carryovers. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #96 (row 2f, fatigue on the pitch) merged as squash `87e7d51`, reviewed head `2d67b2e`, GLM 5.3 Flash APPROVE in round 1 with canary `fatigue-b84b3eb34bb7cb7683a5940fd3f3ecb2` echoed. At `2d67b2e` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,481 unit tests passed in 171 files and Prettier passed on 11 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `87e7d51` with `db.status` ok, and `fatigue.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: physical phone check (owner action); a per-frame guard at 2x.

PR #97 (Wave 2 summary, Green) merged as squash `bcf5493`, reviewed head `4b55aef`, GLM 5.3 Flash APPROVE in round 1 with canary `wave2-summary-5326c9df154f05e6123128adc28d221e` echoed. At `4b55aef` lint, typecheck and build exited 0 and 1,481 unit tests passed in 171 files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `bcf5493` with `db.status` ok. No runtime change.

## Fatigue on the pitch

Branch `feat/fatigue` off `origin/feat/smooth-movement` at `0588297` (row 2c, PR #94), with `origin/feat/smooth-movement` merged in again at `5744f20` (carrying `origin/main` with PR #93). Pure staging plus `Broadcast.tsx` and CSS (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The pitch reads each user player's energy from the latest window snapshot at or before the clock, and only when that window recorded the same player in the slot. The opponent, a substitute before their first window, and runs with no windows show no energy.
- Below 65 a player covers 0.85 of each phase's move (on row 2c's spline, through shortened waypoints), strides 1.18 times slower and shows a sweat pip. Below 55 a stamina arc shows under the sprite.
- The pip and the arc render at about 10 Hz as children of the player element the frame loop moves. Quick and reduced motion keep players on their spots.
- With every slot at 50 energy, the ball's largest one-frame move over the golden cup is 3.73% (bound 4%); the largest player move is row 2c's save settle, 5.19% (4.94% fresh).

RED commit: `1c38ae4` (7 of 9 failed).

Gates at `ef2b4a9` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. Prettier passed on the touched files. `check:theme-colors`, `check:theme-contrast`, `check:theme-cvd`, `check:image-seam` and `check:client-bundle` exited 0.
- Unit tests: 1,481 passed in 171 files.
- Playwright (port 3528, `CI=1`, fresh build): `fatigue`, `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `set-pieces`, `mobile-targets`, `mobile-acceptance`, `quick-not-broadcast`, `injury-staging`, `shootout-suspense`, `watch-live`: 377 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/fatigue.md`. Browser proof: `docs/reports/fatigue/`.

PR #94 (row 2c, smooth movement) merged as squash `ebb04f0`, reviewed head `daeb1c3`, GLM 5.3 Flash APPROVE in round 1 with canary `smooth-movement-2308817edaf550b7f5821536ab84261a` echoed. At `daeb1c3` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,472 unit tests passed in 169 files and Prettier passed on touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `ebb04f0` with `db.status` ok, and `smooth-movement`, `continuous-ball` and `set-pieces` against production (chromium) passed 7 of 7, the ball's fastest 100 ms speed reading 2.69% per frame. NOT RUN: physical phone check (owner action); a per-frame guard at 2x. Carryovers: at 2x a player can still move 9.85% in one frame; over 20 extra seeds the ball's worst frame is 4.41% (duel turnovers, as row 2b recorded); #91's frame-loop pins were re-pinned from this row's staging.

Merged origin/main after PR #94 (the squash of the branch this row started from) and PR #95. Conflicts were only this row's own additions against the squashed copy (`windows` on `StageInput` and `FrameView`, the tired waypoints, `energy` on staged players) and STATE; the code equals `ef2b4a9`'s plus #95's tooling. After the merge: lint, typecheck and build exited 0, 168 matchday unit tests passed in 27 files, and `fatigue`, `smooth-movement`, `continuous-ball`, `set-pieces` and `broadcast-frame-loop` passed 11 of 11 locally, the ball's fastest 100 ms speed reading 2.69% per frame.

## Smooth movement

Branch `feat/smooth-movement` off `458c56e`, with `origin/main` merged in, last at `e3d0e95` (PRs #92 and #91). Pure staging plus a thin `Broadcast.tsx` change (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Players glide through each phase on a Catmull-Rom spline instead of stopping dead at every waypoint.
- Facing and pose follow how a player moves now, not where they started the phase.
- Teammates no longer stack on one spot: one push-apart pass keeps same-side players about 4% apart, and the kickoff shape no longer puts two central players on one spot.
- A red-carded or substituted player walks to the near touchline over 1.8 s (0.9 s at 2x) instead of vanishing; the substitute walks on from the bench. An injured player stays down where the injury found them.
- Quick and reduced motion stay still (decision 1).
- After the frame loop (#91), a walker going off reads their spot from the leaving list, not their old slot, and a walk starting or ending asks for a render. The #91 unit pins moved to this row's staged spots.
- The largest one-frame move of any player at 1x over the golden cup fell from 35.08% to 4.94% of the pitch length; the ball stays under 4%.

RED commits: `9b8a0ca` (6 of 7 failed), `8fa9c1f` (2 of 9 failed), `a846a3f` (1 of 10 failed), `eb746df` (browser, 1 of 2 failed).

Gates at `491e0ee` (code identical at the docs commit that updates this section):

- Lint, typecheck and build exited 0.
- Unit tests: 1,463 passed in 167 files.
- Playwright (port 3526, `CI=1`, fresh build): `smooth-movement`, `continuous-ball`, `broadcast-frame-loop`, `injury-staging`, `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `quick-not-broadcast`: 374 passed, 54 skipped by their own project gates.
- Review, hosted CI, the full e2e suite and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/smooth-movement.md`.

Merged origin/main after PR #93 (set pieces). Row 2d moved goal staging into `stageGoal`, so this row's eased keeper (dive from the strike over REACT) and eased open-play assist moved into it. Poses combine both rows: speed-based run and sprint, the walk-on run, the wall's run then idle, and the beaten defender's press. A wall keeps its side's facing; everyone else faces by velocity. After the merge: lint, typecheck and build exited 0, 159 matchday unit tests passed in 25 files (the set-pieces and smooth-movement guards included), and `smooth-movement`, `set-pieces`, `continuous-ball`, `broadcast-frame-loop`, `score-lands-with-ball`, `shootout-suspense` and `injury-staging` passed 13 of 13 locally, the ball's fastest 100 ms speed reading 2.70% per frame.

PR #95 (review verdict line, Green) merged as squash `2b2bb0f`, reviewed head `18f25af`, GLM 5.3 Flash APPROVE in round 1 with canary `verdict-line-1d059dc9254aafe1e1ecbe42fbf77377` echoed; that reply was the first built with the new preamble and its verdict line parsed. At `18f25af` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,462 unit tests passed in 168 files and Prettier passed on 3 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `2b2bb0f` with `db.status` ok. No runtime change, so no live spec.

## Review verdict line

Branch `chore/review-verdict-line` off `20fe868`. Review tooling only (Green). No runtime change.

The review packet's preamble (`tools/review/review-packet.py`) now asks GLM to put the verdict alone on its own line. `strip-verdict.py` counts a reply only when a line holds nothing but the verdict, and three GLM replies that read APPROVE did not count because the verdict shared its line with other text: PR #89 (`60dc61d`), PR #92 (`5b2229a`) and PR #93 (`fc9bae8`). Each needed a rerun at the same head. The parser is unchanged, so a reply that still breaks the rule still does not count. `tools/review/README.md` records why.

Gates: Prettier on the touched files, and `python3 -I tools/review/review-packet.py --help` exited 0. Lint, typecheck, unit tests and build run in hosted CI. Effect on GLM replies is measured on the next reviews, not here.

PR #93 (row 2d, set pieces from `goalKind`) merged as squash `20fe868`, reviewed head `fc9bae8`. At `fc9bae8` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,462 unit tests passed in 168 files and Prettier passed on 7 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash: the first reply (canary `set-pieces-fdd94a834a80b70d1e8168971ba9fcc1`) read APPROVE with no blockers but put the verdict on a heading line with other text, so it was not counted; the rerun at the same head with canary `set-pieces-b-900e7ce5e2601c4636cc2a19708608ac` approved. Production `/api/health?db=1` served `20fe868` with `db.status` ok, and `set-pieces.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 5 of 5. NOT RUN: physical phone check (owner action); a continuity guard at 2x.

## Set pieces

Branch `feat/set-pieces` off `458c56e`, with `origin/main` merged in at `85b292e` (PR #92). Matchday staging only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed, so goal kinds and outcomes are untouched and the goldens pass. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, a goal now plays out by the kind the engine recorded (`Beat.goalKind`). A penalty freezes the shape: the ball rolls to the spot, the taker steps up, pauses and kicks. A free kick lines three defenders up in a wall and curls the shot around it. A header comes off a cross from the wing and is met at loft 0.85. A solo goal dribbles a chain of touches past the defender who steps in. Every kind starts from the live ball and still puts the ball over the line, and the score on the board, at `GOAL_LANDS` (0.6). Quick and reduced motion stay still. Open play is unchanged.

RED commit: `77a9454` (4 of 7 guards failed; the landing, still-motion and free-kick continuity guards pin kept behaviour and passed), after the no-behaviour prefactor `4540e14`. GREEN: `39c3c07`.

Gates at `2cbb5f1` (the merge of `origin/main` at `85b292e`):

- Lint, typecheck, build and `check:mirrors` exited 0. Unit tests: 1,452 passed in 166 files. Prettier passed on every touched file.
- Playwright on a fresh build, port 3527: `set-pieces`, `continuous-ball`, `shootout-suspense`, `score-lands-with-ball`, `speed-aware-staging`, `watch-live`, `callouts-type-effects`, `quick-not-broadcast`, `one-shared-timeline`, `mobile-targets` and `mobile-acceptance`: 377 passed, 54 skipped by their own project gates. The continuous-ball scene sampled 2,249 frames with a fastest ball speed of 2.68% of the pitch length per frame.
- Every goal kind is reached by a pinned replay at 390x844 with touch: cup8 G1 49' solo, cup8 R32 9' header and 84' penalty, kanto151 R32 17' free kick.
- NOT RUN: the full local Playwright suite, a continuity guard at 2x, browser proof at 360 and 320 (no layout change), the review and the physical phone check.

Measurements and decisions are in `docs/decisions/set-pieces.md`. Screenshots are in `docs/reports/set-pieces/`.

PR #91 (row 2a, broadcast frame loop) merged as squash `e3d0e95`, reviewed head `b420c85`, GLM 5.3 Flash APPROVE in round 1 with canary `frame-loop-4779394b5c662377c3cb98465e2d752e` echoed. At `b420c85` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,453 unit tests passed in 166 files and Prettier passed on 13 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `e3d0e95` with `db.status` ok, and `broadcast-frame-loop`, `continuous-ball`, `shootout-suspense` and `callouts-type-effects` against production (chromium) passed 9 of 9, the ball's fastest 100 ms speed reading 2.68% per frame. NOT RUN: physical phone check (owner action); the perf harness after the #92 merge. Carryover: style recalc rose (257 to 484 ms per 10 s at 4x throttle) while total main-thread time fell; pose and facing update at the 10 Hz render floor.

Merged origin/main after PR #91. Row 2a moved the trail drawing into `trailPath` in `Broadcast.tsx`, so the free kick's curl (`trail.via`) now bends that helper's control point; `trailPath` is exported and `Broadcast.trailPath.test.ts` pins both the curled and the plain path (it fails with `via` ignored: `Q 87.50 29.76` instead of `Q 80.75 27.52`). After the merge: lint, typecheck and build exited 0, 149 matchday unit tests passed in 24 files, and `set-pieces`, `continuous-ball`, `broadcast-frame-loop`, `score-lands-with-ball`, `shootout-suspense` and `callouts-type-effects` passed 14 of 14 locally.

## Broadcast frame loop

Branch `perf/broadcast-frame-loop` off `fe6d183`, with `origin/main` merged in, last at `85b292e`
(PRs #89, #90 and #92). UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting`
changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, a live match looks the same and does less work per frame. Before, React re-rendered
the whole match screen on every animation frame (62 commits in 62 frames). Now the clock,
scoreboard, ticker and touchline render about every 100 ms (12 commits in the same 62 frames). They
also render at once on a new minute, a fired beat, a landed goal, or a frame whose pitch shows a new
cut-in, trail, play badge or carrier. A frame loop moves the 22 players and the ball with
`translate3d` transforms from row 2b's `stageFrame`. Quick and reduced motion stay still. The score
lands at goal progress 0.6, and 1x/2x staging, manager stops, injury staging and row 2g's cut-ins
keep their timings. Row 2e's penalty moves per frame at that frame's `kickProgress`. The
sudden-death banner, the kick dots, the shootout score and the kick sounds render on the frame that
reaches them.

RED commits: `3129582`, `6c06799` (5 of 5 guard tests fail on `origin/main` code). The cut-in timing
guard fails when the painter is forced never to ask for a render (mutation proof on the merged
code). `continuous-ball` now reads the transform and still fails on an `ae8ee22` build (9.00).

Measured at 390x844 with a 4x CPU throttle in headless Chromium, 2 batches of 5 alternated runs per
side, before `458c56e` and after `6e9d509` (medians, batch 1 then batch 2):

- p50 frame interval was 16.7 ms on both sides in both batches.
- p95 was 16.7/16.7 ms before and 16.8/16.7 ms after. Across the 10 runs per side, 3 before and
  4 after read 16.8. That is one tick of the 0.1 ms timer.
- Every run on both sides had 0 dropped frames, 0 long tasks and a 16.8 ms largest gap.
- DOM mutations fell from about 2207 to 1164 per second.
- Main-thread task time fell from 3022/4167 to 2824/3764 ms per 10 s.
- Style recalc rose from 257/397 to 484/676 ms.

Headless numbers do not include GPU raster. Details are in `docs/decisions/broadcast-frame-loop.md`.

Gates at `f0f73b9` (after the #92 merge):

- Lint, typecheck and build exited 0.
- Unit tests: 1453 passed in 166 files.
- `check:mirrors`, `image-seam`, `image-packs`, `theme-contrast`, `theme-colors`, `theme-cvd` and
  `client-bundle` exited 0.
- Playwright (`broadcast-frame-loop`, `continuous-ball`, `callouts-type-effects`, `audio-polish`,
  `score-lands-with-ball`, `speed-aware-staging`, `mobile-pitch-fixes`, `injury-staging`,
  `one-shared-timeline`, `quick-not-broadcast`, `shootout-suspense`) gave 20 passed and 0 failed.
- NOT RUN: physical phone check, full local Playwright suite, review, hosted CI, and a perf rerun
  at `f0f73b9`. The numbers above are from `6e9d509`, before #92.

PR #92 (row 2e, shootout with suspense) merged as squash `85b292e`, reviewed head `5b2229a`. At `5b2229a` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,445 unit tests passed in 165 files and Prettier passed on 12 touched files. GLM 5.3 Flash: the first reply (canary `shootout-2449282c14c0d19c6b0cf507e6718bb0`) read APPROVE but put the verdict on a line with other text, so it was not counted; the full rerun at the same head with canary `shootout-b-186b4fc0bd2aa36934fd3fe7f08420d2` approved. Hosted `check` first failed on a timeout in `MatchPlayer.quick.test.tsx` ("Quick shows no cut-in through the 30' goal", over 15 s), a row 2g test that takes about 1.9 s locally both on `main` at `458c56e` and on `5b2229a` (3 runs each); the failed job was rerun with no commit and passed, and all eight e2e shards were green. Production `/api/health?db=1` served `85b292e` with `db.status` ok, and `shootout-suspense.spec.ts` plus `continuous-ball.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: physical phone check and on-device sound (owner action). Carryover: that Quick test is the heaviest matchday unit test and has hit the 15 s limit once on a hosted runner.

## Shootout with suspense

Branch `feat/shootout-suspense` off `e7f2012`, with `origin/main` merged in at `ae8ee22` (PR #89). UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Each live shootout kick now plays out: the taker runs up (0 to 0.35 of the kick), the ball flies with a trail (0.35 to 0.60), then the keeper reacts. A save dives the ball's way; a goal beats a keeper who went the wrong way or too late.
- Waiting players stand on a two-row arc either side of halfway instead of a stacked column.
- Each live kick sounds a whistle, the strike and a crowd roar or the glove. Quick and reduced motion stay still and hear only the outcome (goal horn or glove).
- A "Sudden death" banner shows from kick 11 (the engine takes five regulation kicks a side).
- The kick dot and pens score land when the keeper reacts, not after.

RED commit: `b6005f1` (11 tests failed in 3 files; `shootout.test.ts` failed to import `../shootout`).

Gates at `0d17adc` (code identical at the docs commit that adds this section):

- Lint, typecheck and build exited 0. Prettier passed on every touched file.
- Unit tests: 1,441 passed in 164 files.
- Playwright (port 3525, `CI=1`): `shootout-suspense`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `audio-polish`, `one-shared-timeline`, `speed-aware-staging`, `quick-not-broadcast`, `mobile-pitch-fixes`, `engine-v4`, `manager-mode`, `callouts-type-effects`: 394 passed, 54 skipped by their own project gates.
- Review, hosted CI and a physical phone: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/shootout-suspense.md`.

PR #90 (row 2b, continuous ball) merged as squash `458c56e`, reviewed head `18c0fb0`. The first reviewed head `d70c71a` (GLM APPROVE, canary `continuous-ball-1eb739e91836294d83ee5654d3381587`) failed hosted e2e shard 1 on the one-frame ball bound under runner load; the browser spec moved to a 100 ms windowed speed with a bound of 6 (fails on `main` at 9.00, 2 of 2), and the 4% choreography bound stays in the unit test. At `18c0fb0` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,425 unit tests passed in 162 files and Prettier passed on 10 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash APPROVE in round 2 with canary `continuous-ball-r2-c9805a76e9cd4934cc9e15b35b1dc030` echoed. Production `/api/health?db=1` served `458c56e` with `db.status` ok, and `continuous-ball.spec.ts` plus `callouts-type-effects.spec.ts` against production (chromium) passed 5 of 5, the ball's fastest 100 ms speed reading 2.68% per frame. NOT RUN: physical phone check (owner action).

Merged origin/main after PR #90 with no textual conflict. Row 2b routes the broadcast through `stageFrame` in `player.ts`, so `FrameView` gained the optional `kickProgress` and passes it to `stagePitch`; without it typecheck failed on `Broadcast.tsx`. After the merge: typecheck and build exited 0, 132 matchday unit tests passed in 21 files, and the shootout, continuous-ball, callouts and audio specs passed 8 of 8 locally.

## Continuous ball

Branch `feat/continuous-ball` off `fe6d183`. Matchday staging only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

For the player, the broadcast ball no longer teleports. A tackle carries the ball to the defender who won it. Goals and saves start from where the ball is. Penalties are taken from the spot. After a goal both teams walk back to kickoff shape and the side that conceded kicks off from the centre. On the golden cup, the largest one-frame ball move at 1x falls from 78.0% to 3.87% of the pitch length. Each save now holds the live clock for 1,100 ms instead of 900.

RED commit: `e7b7ece` (4 of 4 guards failed), after the prefactor `a4e7e66` that adds the `stageFrame` seam with no behaviour change. GREEN: `0ea0c23`.

Gates at `c52a10a` (the merge of `origin/main` at `e7f2012`, PR #88):

- Lint, typecheck and build exited 0. Unit tests: 1,414 passed in 160 files (1,391 in 156 at `0ea0c23` before the merge).
- Prettier passed on every touched file.
- Playwright on a fresh build, port 3532 (3522 was held by another dispatch's server). `continuous-ball`, `audio-polish`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `one-shared-timeline`, `recorded-saves`, `score-lands-with-ball`, `injury-staging`, `speed-aware-staging`, `quick-not-broadcast` and `manager-mode`: 388 passed, 54 skipped by their own project gates. The continuous-ball scene sampled 2,251 frames with a largest rendered ball move of 2.68% of the pitch length.
- NOT RUN: the full local Playwright suite, the review, and browser proof at 360 and 320 (no layout change).

Measurements and decisions are in `docs/decisions/continuous-ball.md`. Screenshots are in `docs/reports/continuous-ball/`.

PR #89 (row 2g, callouts and type effects) merged as squash `ae8ee22`, reviewed head `60dc61d`. Hosted round 1 at the first head failed `check:theme-colors` (literal `#fff` in the new effect rules); fixed with the `--fx-core-tint` token. At `60dc61d` lint, typecheck, build and all seven `check:*` scripts exited 0, 1,421 unit tests passed in 161 files and Prettier passed on 17 touched files; hosted check and all eight e2e shards green. GLM 5.3 Flash: the first reply at `60dc61d` (canary `callouts-r2-378b2d07768df3439caca08ceb327f9d`) read APPROVE but lacked the verdict line, so it was not counted; the rerun at the same head with canary `callouts-r2b-697879c7024d00953bc76e53ceb5f15c` approved. Production `/api/health?db=1` served `ae8ee22` with `db.status` ok, and `e2e/callouts-type-effects.spec.ts` against production (chromium) passed 4 of 4. NOT RUN: physical phone check (owner action).

Merged origin/main after PR #89. Conflicts in `timeline.ts` (kept both `kickoff` and `moment` on `PlayPhase`, one `OPP_SHAPE`, the callout gap on this branch's `slots`), `Broadcast.tsx` (`stageFrame` plus the cut-ins) and STATE. The turnover rule changes which player acts in the phase at minute 5.5 of the cut-in fixture, so `Broadcast.cutin.test.tsx` now expects Kabutops used Absorb! for the ordinary callout that shows no cut-in. After the merge: typecheck and lint exited 0, 127 matchday unit tests passed in 22 files, and the continuous-ball, callouts, audio, score-lands, speed-aware and mobile-pitch specs passed 13 of 13 locally.

Hosted CI at `d70c71a` failed e2e shard 1: `continuous-ball.spec.ts` measured 9.82% and then 7.90% (retry) against its one-frame bound of 4, where local runs read 2.70 to 3.87. Reproduced under CDP CPU throttle: 5.36% at 4x, 5.91% at 6x. The samples around the 4x peak show a render that missed a frame (2.04 over 34 ms) and then caught up (3.92 over 16 ms), which together match the carried ball's steady 2% a frame, so the step is render lateness, not a teleport. The spec now takes the fastest speed over any window of at least 100 ms, scaled to one 60 Hz frame, with a bound of 6. Measured with it: 2.68 at 1x, 2.68 at 6x, 3.44 to 4.23 at 8x and 10x. Against a build of `main` at `ae8ee22` the same spec reads 9.00 (from a 53% single-frame jump) and fails, 2 of 2. The 4% bound on the choreography itself stays in `continuous-ball.test.ts`, sampled at an exact 60 Hz clock.

## Callouts and type effects

Branch `feat/callouts-type-effects` off `fe6d183`, with `origin/main` merged in at `e7f2012` (PR #88). UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A live match calls a move only on big moments: final-third through balls, crosses into the box, key duels that win the ball for a goal or a save, and 15% of build-up, at least 5 minutes apart (key duels exempt). Real cups average 13.81 open-play callouts a match, down from 54.83 (84 matches of 90 minutes).
- Every one of the 18 types draws its own effect colour (the twelve without a tuned effect take `TYPE_PALETTE`) and sounds in one of ten synthesized families.
- Goals, saves and key duels get a lower-third card with the sprite, the move and a type badge. Quick shows no card and no per-phase sound. Reduced motion shows the card without animation.

RED commit: `e6401fe` (9 of 62 failed in the five touched test files; the pinned seed gave 60 callouts).

Gates at `f755466`:

- Lint, typecheck and build exited 0. Prettier passed on every touched file.
- Unit tests: 1,421 passed in 161 files.
- Playwright (`PLAYWRIGHT_PORT=3523 CI=1`): `callouts-type-effects`, `one-shared-timeline`, `score-lands-with-ball`, `speed-aware-staging`, `manager-mode`, `audio-polish`, `mobile-targets` and `mobile-acceptance`: 383 passed, 54 skipped, 0 failed.
- Pinned seed (`a1`, 4-2-3-1, match 1): 12 open-play callouts (was 60).
- Full local Playwright suite, physical phone check and review: NOT RUN.

Browser proof: `docs/reports/callouts-type-effects/` (goal cut-in and callout badge at 390, 360 and 320, and the reduced-motion goal card at 390). Measurements and decisions are in `docs/decisions/callouts-type-effects.md`.

PR #88 (row 2h, audio polish) merged as squash `e7f2012`, reviewed head `f46ef6c`, GLM 5.3 Flash APPROVE in round 1 with canary `audio-polish-dcd1218ec61c1a8e038774952dbb605e` echoed. At `f46ef6c` lint, typecheck and build exited 0, 1,410 unit tests passed in 159 files and Prettier passed on 14 touched files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `e7f2012` with `db.status` ok, and `e2e/audio-polish.spec.ts` against production (chromium) passed 2 of 2. NOT RUN: iOS Safari audio on a real device (owner action).

Hosted CI round 1 on `4b79214` (GLM APPROVE, canary `callouts-344a4b0b787bd0aea50929c2fa8d5bb1`) failed `pnpm check:theme-colors`: the twelve palette-type rules mixed toward a literal `#fff`. The colour now comes from a new `--fx-core-tint` token in `src/design/stadium.css` (same `#ffffff`, no visual change). `check:theme-colors`, `check:theme-contrast`, `check:theme-cvd`, `check:mirrors` and `check:image-seam` exit 0.

## Audio polish

Branch `feat/audio-polish` off `fe6d183`. UI and synthesized audio only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- With sound on, tapping Watch live or Go to the match unlocks audio, so the autostarted broadcast is no longer silent until Pause and Resume.
- A live broadcast has a synthesized crowd (band-passed seeded noise, no assets) that swells as the ball nears either box and roars when a goal lands: 2250 ms for a normal goal, 4950 ms for an equaliser at 80' or later, halved at 2x.
- The crowd stops on pause, manager stops, full time, Sound off, closing Watch live and leaving the matchday. Quick has no crowd, no roar and no kick thud.
- The kick thud never sounds twice in any three phases.

RED commit: `da0bcc8` (11 tests failed in 4 files and `crowd.test.ts` failed to import `../crowd`).

Gates at `b8b8d14` (code identical at `41a7fe1`, which adds the spec and docs):

- Lint, typecheck and build exited 0 (lint, typecheck and Prettier on touched files re-run at `41a7fe1`, exit 0).
- Unit tests: 1,410 passed in 159 files.
- Playwright (port 3524, `CI=1`): `audio-polish`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `one-shared-timeline`, `manager-mode`, `builder-matchday`, `mobile-pitch-fixes`, `honest-momentum`, `injury-staging`: 387 passed, 54 skipped by their own project gates.
- iOS Safari audio on a device, review and hosted CI: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/audio-polish.md`.

PR #87 (Wave 1 summary) merged as squash `fe6d183`, reviewed head `b7823f4`, GLM 5.3 Flash APPROVE in round 2 with canary `wave1-summary-r2-e85818455aaf26363677ab2a4eaef30d` echoed. Round 1 (`10cf2f7`) was REQUEST_CHANGES: the section misstated its gates and called 2,891,853 bytes a saving (the saving is 2,892,556). At `b7823f4` lint, typecheck and build exited 0, 1,387 unit tests passed in 155 files and Prettier passed on the three changed files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `fe6d183` with `db.status` ok (docs only, no route to check). Wave 1's live checks are recorded in `docs/reports/audits-2026-10-17/program-log.md`.

## Wave 1 summary

Branch `docs/wave1-summary` off `4173b94`. Docs only (Green). Appends the Wave 1 entry to `docs/reports/audits-2026-10-17/program-log.md`: every PR with its squash and reviewed head, the production checks, the measurements that moved, brief-vs-code notes and open carryovers. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

PR #86 (row 1l, retained JSON dedupe) merged as squash `4173b94`, reviewed head `0054190`, GLM 5.3 Flash APPROVE in round 1 with canary `retained-json-5b9cb3e1965e74be6b4dd2ed18269158` echoed. Hosted check (its new measure step read 4 copies, 2,891,853 bytes) and all eight e2e shards green on that head. Production `/api/health?db=1` served `4173b94` with `db.status` ok, and `e2e/old-links.spec.ts` plus `e2e/engine-v4.spec.ts` against production (chromium) passed 4 of 4.

Gates at `10cf2f7` (the coordinator's review run): lint, typecheck and build exited 0, 1,387 unit tests passed in 155 files, and Prettier passed on all three changed files (`STATE.md`, the decision log and `program-log.md`); hosted check and all eight e2e shards green. Review round 1 asked for this gate record and a corrected 1l saving (2,892,556 bytes). No runtime change.

## Retained JSON dedupe

Branch `fix/retained-json-dedupe` off `f4489cb`, with `origin/main` merged in, last at `badda9f` (PR #85). Build and CI only (Red, deploy/build). No file under `src/engine` or `src/data` changed. Players see no change. Old share links replay as before, and the server build carries one copy of each retained data file instead of eight.

- The Turbopack retained-JSON rule in `next.config.ts` matches every `v<n>` bundle, v5 included.
- `scripts/build/retained-json-loader.cjs` re-exports the live file or the earliest byte-identical retained copy. Before, v2 to v5 each inlined the same 803 KB `scouting.json` once the live file changed.
- CI runs `node scripts/build/measure-retained-json.mjs .next/server/chunks`, which asserts 4 payloads, after `pnpm build`.

RED commit: `098a694` (measure script fails `8 !== 4` on a fresh build of `f4489cb`; 2 of 7 loader tests fail).

Gates at `a980db9`:

- Lint, typecheck, build, client bundle check and format check on touched files exited 0.
- Unit tests: 1,316 passed in 144 files.
- Measure script: 4 payloads, 2,891,853 bytes (was 8 and 5,784,409).
- Emitted retained replays: 7 of 7 passed; an uncommitted v5 extension passed 9 of 9.
- Playwright `e2e/old-links.spec.ts` and `e2e/engine-v4.spec.ts`: 4 passed.
- On a fresh build of the `origin/main` merge (`badda9f`): measure script 4 copies, 2,891,853 bytes, exit 0.
- Full local Playwright suite, review and hosted CI: NOT RUN at the time of writing.

Measurements and decisions are in `docs/decisions/retained-json-dedupe.md`.

PR #85 (row 1j, builder matchday) merged as squash `badda9f`, reviewed head `d66ba81`, GLM 5.3 Flash APPROVE in round 2 with canary `builder-matchday-r2-4e7070784c306535f9bf51e33317ed79` echoed. Round 1 (`4577309`) was APPROVE but hosted e2e shard 7 failed `settings-confirm.spec.ts` twice: the home page's new `MatchdaySettings` dropped a formation picked during hydration on a slow phone. Fix `d66ba81` after RED `1136ad8`. Hosted check and all eight e2e shards green on `d66ba81`. Production `/api/health?db=1` served `badda9f` with `db.status` ok, and `builder-matchday`, `settings-confirm` and `quick-not-broadcast` against production (chromium) passed 15 of 15.

## Builder matchday

Branch `feat/builder-matchday` off `f4489cb`, with `origin/main` merged in, last at `63c9d36` (PR #84). UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A friendly cup from the home builder now follows Manager mode and Live match. With either on it opens the matchday, and Manager mode reaches the touchline. With both off it goes straight to the results, as before.
- The Matchday toggles sit above Play a friendly cup and stay in step with the side panel's Matchday switches.
- A reload during a friendly matchday comes back to the same match from the builder run slot. Friendly results still do not survive a reload.
- Friendlies stay unranked. The results show no submit panel, and the server rejects a coached builder token as `BUILDER_NOT_RANKED`.
- The `PlayScreen` and `LiveRun` builder gates are gone, but `/play` never runs a builder cup, so the player path was the home friendly in `HomeScreen`.
- With PR #78's rule merged in, Manager mode plays a friendly live too: `MatchdayFlow` applies `matchdayView`, and the builder's toggles disable Quick with the same hint. The merge made `SidePanel.test.tsx` find two Quick sim buttons (the desk's and the builder's). Its two manager-mode guards now read the Control desk's copy and also assert the builder copy is disabled under Manager mode and pressed after it goes off. Forcing Quick enabled in `MatchdaySettings` fails the new assertion (`expected false to be true`). `e2e/quick-not-broadcast.spec.ts` hit the same two copies (strict mode, 2 elements) and now reads the desk's copy and checks the builder's Quick is disabled; on a fresh build of the merge it passed 1 of 1, and `builder-matchday` plus `manager-mode` passed 8 of 8 (chromium).

RED commit: `aff6f7a` (5 failing tests in `builder-matchday.test.tsx`).

Gates at `06d3755` (later commits change only STATE.md):

- Lint, typecheck, format check, build, client bundle and image seam exited 0.
- Unit tests: 1,321 passed in 146 files.
- Playwright on a fresh build, 13 specs (`builder-matchday`, `builder`, `manager-mode`, `mobile-targets`, `mobile-acceptance`, `data-split`, `layout-shift`, `theme-builder`, `builder-ratings-layout`, `a11y`, `run-persist`, `settings-confirm`, `contrast`): 478 passed, 0 failed, 57 skipped.
- NOT RUN: the full Playwright suite locally, hosted CI, the GLM review, a physical phone check.

Hosted CI round 1 on `4577309` (GLM APPROVE, canary `builder-matchday-1beacf9854e8996ac05950ad9b355a14`) failed e2e shard 7: `settings-confirm.spec.ts` lost a 4-4-2 pick on iphone-14. Cause: the home page's new `MatchdaySettings` read the stored panel through `useSyncExternalStore` (server `null`, client stored), so React redid the render after hydration and reset the select before the queued pick replayed. Under an 8x CPU throttle the pick was lost 6 of 6 on this branch and 0 of 6 on `main`. A controlled `MatchdaySettings` no longer reads the store. RED `1136ad8` (new slow-phone guard, 3 of 3 failed); with the fix the guard passed 5 of 5 and `settings-confirm` 23 passed, 3 skipped (chromium, iphone-14).

Decisions and the RED output are in `docs/decisions/builder-matchday.md`. Screenshots at 390x844 are in `docs/reports/builder-matchday/`.

PR #84 (row 1i, draft safety) merged as squash `63c9d36`, reviewed head `7d9c485`, GLM 5.3 Flash APPROVE in round 2 with canary `draft-safety-r2-e0e51731aa6c1ac38eca1adff08d9674` echoed. Round 1 (`904951a`, canary `draft-safety-76b0e65314925f378432c265b5d26dcf`) was REQUEST_CHANGES: it could not see the inert-while-dragging backdrop rule, which predates the PR (`DraftBoard.module.css` line 399). `7d9c485` makes the candidate drag test assert the picker is open (3 of 3 phone projects passed, 3 of 3 failed with the rule removed) and corrects the overflow wording (body only). Hosted check and all eight e2e shards green on `7d9c485`. Production `/api/health?db=1` served `63c9d36` with `db.status` ok, and `e2e/draft-safety.spec.ts` against production (chromium) passed 9 of 9.

## Draft safety (Wave 1, 1i)

Branch `fix/draft-safety` off `f4489cb` (PR #69), with `origin/main` merged in, last at `b7f28d6` (PR #83). Only STATE.md conflicted. UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- New run with any player signed asks "Start over? The N players you signed will be lost." with Start over and Keep drafting, focus on Keep drafting. With nothing signed, one tap still starts over.
- Keys 1 to 3 and the draft's Escape do nothing while the scouting dossier, any open dialog or the New run question is open.
- body clips sideways overflow (`overflow-x: clip`) instead of hiding it, so `position: sticky` sticks. Home Control desk measured at `top: 16` after a 1000px scroll once its main column is taller than it.
- Pitch cards default to `touch-action: pan-y` (`none` only while dragging), so a vertical swipe on a card scrolls the page. A touch drag that starts vertically now scrolls instead of swapping; the two-tap swap stays.
- The open picker is modal: a tap on its dimmed backdrop closes it, and a swipe down on its top bar closes it. Taps no longer pass through to the pitch or hub around it.
- A dragged starter's vertical move is stretched by 1/cos(26deg) so it stays under the pointer on the tilted field.

RED commits: `8660698`, `e8ef69d` and `b3faa46` (harness fix for the sticky and backdrop guards; all six Playwright guards and the drift unit guard fail on `f4489cb` code).

Gates at `681cd5e` (later commits change only docs):

- Lint, typecheck, build and Prettier on changed files exited 0.
- Unit tests: 1,314 passed in 144 files.
- Playwright on a fresh build, full suite: 823 passed, 0 failed, 61 skipped.
- Browser proof at 390x844, 360 and 320: `docs/reports/draft-safety/`.
- Review round 1 (GLM, `904951a`) asked for proof that a drag from the open picker still lands, since the backdrop now takes taps. The inert-while-dragging rule predates this PR (`DraftBoard.module.css` line 399). `e2e/mobile-draft.spec.ts` now asserts the picker is open before its candidate drag: 3 of 3 passed on the phone projects, and 3 of 3 failed with that rule's `pointer-events: none` removed.
- After the `origin/main` merge the coordinator reruns lint, typecheck, unit tests, build and the format check on the reviewed head; the counts are in the PR's review comment and the next STATE update. Hosted CI runs the full Playwright suite.
- Physical phone check, real touch on WebKit and the GLM review: NOT RUN.

Decisions and RED output are in `docs/decisions/draft-safety.md`.

PR #83 (row 1k, security and integrity quick fixes) merged as squash `b7f28d6`, reviewed head `8307dbe`, GLM 5.3 Flash APPROVE with canary `security-fixes-r2-7b878c9c50de4aa8db1f8d37ffdff8f3` echoed. The first reply on the same head also approved but mistyped its canary, so the checker did not count it and the review ran again. At `8307dbe` lint, typecheck, build and the format check exited 0 and 1,375 unit tests passed in 153 files; hosted check and all eight e2e shards green. Production `/api/health?db=1` served `b7f28d6` with `db.status` ok. On production a JSON and a text POST to `/gate/unlock` each answered 303 to `/gate?next=%2F&error=1`, `/gate?next=/..//evil.com` rendered `next` as `/`, `/api/leaderboard?mode=cup8&scope=all&coach=uncoached` answered 200, and `e2e/leaderboard.spec.ts` tests at lines 103 and 134 (stubbed board) passed 2 of 2 (chromium). NOT RUN: a real IPv6 client and a real hung Neon query.

## Security and integrity quick fixes (W1k)

Branch `fix/security-integrity-quick-fixes`, off `f4489cb`, with `origin/main` (`754d838`, PR #82) merged in. Tier Red (gate, rate limits, database client, leaderboard). Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- A gate link such as `/gate?next=/..//evil.com` now unlocks to `/`, not to another site.
- One IPv6 client shares one rate-limit bucket across its /64, for gate attempts and leaderboard submissions. IPv4 is unchanged.
- A Neon query that hangs fails after 4 seconds into the existing "leaderboard is offline" reply, instead of holding the function to its limit.
- A JSON or text POST to `/gate/unlock` goes back to the gate with an error, not a 500.
- A submitted run's rank is counted among runs like it (uncoached or coached). The uncoached leader reads #1, the success line names the view, and View leaderboard opens it.
- The board's coach view lives in the URL (`/leaderboard?mode=cup8&scope=all&coach=uncoached`), so friends can link a filtered board.

RED commit: `209c429` (15 failing guard tests).

Gates at `5b7ca8d` (later commits change only docs):

- Lint, typecheck, build and format check exited 0.
- Unit tests: 1,331 passed in 147 files.
- Playwright on a fresh build (leaderboard, leaderboard-cls, leaderboard-date, mobile-targets, mobile-acceptance): 375 passed, 54 skipped, 0 failed.
- At the merge of `origin/main` (`0145412`) the coordinator reruns lint, typecheck, unit tests, build and the format check on the reviewed head; the counts are in the PR's review comment and the next STATE update.
- Full Playwright suite, independent review, a physical phone check and the post-merge production check: NOT RUN.

Scope, RED output and decisions are in `docs/decisions/security-integrity-quick-fixes.md`. Screenshot: `docs/reports/security-integrity-quick-fixes/leaderboard-coach-url-390x844.png`.

PR #82 (side fix, CI e2e shards) merged as squash `754d838`, reviewed head `ac0c6d3`, GLM 5.3 Flash APPROVE with canary `ci-shard-r3-1c82513b2110db5a53eb92acc7b4bc89` echoed (the earlier four-shard head `a380010` was approved; the review of `c4e6113` was stopped when the PR moved to eight shards). On `ac0c6d3` the eight shards took 4.5, 5.7, 3.0, 5.6, 5.5, 8.4, 6.5 and 3.1 min, all green. Shard 6 ran 110 tests in 6.5 min with no retry: Playwright splits by test count, not time, so the slowest shard is 8.4 min against 9.1 min with four. Production `/api/health?db=1` served `754d838` with `db.status` ok (CI-only change, no route to check). PR #81 (row 1h) is recorded in the CI e2e shards section below.

## CI e2e shards

Branch `ci/shard-e2e`, off `9d37864`, with `origin/main` (`68f37c9`, PR #81) merged in. CI only (Green), an out-of-band side fix outside Wave 1. Only `.github/workflows/ci.yml` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Nothing changes for the player. The hosted `e2e` job now runs as eight parallel shards (`--shard=N/8`), each uploading its own report on failure.
- Before: PR #80's `pnpm test:e2e` step took 28.6 min for 824 passed and 61 skipped, the whole critical path of every merge. On this PR's first run (head `a380010`) the four shards took 6.7, 6.9, 7.4 and 9.1 min end to end, all green, so the job finishes in about 9 min instead of about 31. This head moves to eight shards; its time is read from this PR's run.
- Observed, not fixed here: `main` push run 39080199806 on `90aba39` failed `Builder.test.tsx` once (`expected 'DF  LCB + Tap to Draft!' to be 'DF  LCB  Bulbasaur Grass Poison '`, line 275), a lazy-import race like the one PR #80 fixed in `announce-builder.test.tsx`. Carried over.

Gates: no test or source change. Hosted CI on this PR is the proof. Local Playwright: NOT RUN.

Measurements and the rejected options are in `docs/decisions/ci-shard-e2e.md`.

PR #81 (row 1h, highlights honesty) merged as squash `68f37c9`, reviewed head `b1f6f8e`, GLM 5.3 Flash APPROVE in round 1 with canary `highlights-honesty-ea975c4a469b2015a2e21c90fcf7b4d3` echoed (the first gate run on `464ec6e` failed prettier on the new spec, fixed in `b1f6f8e` before review); hosted check and e2e green on that head. Production `/api/health?db=1` served `68f37c9` with `db.status` ok, and `e2e/highlights-honesty.spec.ts` against production (chromium) passed 1 of 1.

## Highlights honesty

Branch `fix/highlights-honesty`, off `f4489cb`, with `origin/main` (`9d37864`, PR #80) merged in. Wave 1 row 1h. Display only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The highlights type icon and stage tint show the star's own primary type. Arcanine reads Fire, not the Dark of its ability Intimidate.
- The ability box says "Ability", not "Activated Ability", and the strike announcement no longer claims the ability fired.
- Clean Sheet Hero and Squad Anchor go to the first player, keeper first, who held a starting slot for the whole match. An absent, subbed, injured or sent-off keeper is skipped. A 0-0 lost on penalties is not a clean sheet.
- The MVP pill reads L for a losing record (0W-0D-3L) and D for a level one (1W-1D-1L).
- Highlight, motion, strike, goal and broadcast glyphs sit in `aria-hidden` spans, so screen readers read "Clean Sheet Hero", not "gloves Clean Sheet Hero".
- A zero weak-spot drag reads 0, not -0.

RED commit: `fc9efaf` (12 failing guards in `starCalculation`, `MatchHighlights` and `ResultsView` tests).

Gates at `dfe9f5f` (later commits change only docs):

- Lint, typecheck, format check on touched files and build exited 0.
- Unit tests: 1,327 passed in 144 files.
- Playwright on a fresh build: 429 passed, 0 failed, 54 skipped across the highlights scene, results interactions, Silph Stadium, recorded saves, a11y, contrast, mobile targets and mobile acceptance. Hosted CI runs the full suite.
- At the merge of `origin/main` (`b01ecf9`): lint, typecheck and build exited 0, and `pnpm test --maxWorkers=4` passed 1,357 tests in 150 files.
- Browser proof at 390x844: `docs/reports/highlights-honesty/`.
- NOT RUN: the new scene against a `main` build, 360 and 320 screenshots, a physical phone check, GLM review.

Decisions are in `docs/decisions/highlights-honesty.md`.

PR #80 (side fix, unit flakes) merged as squash `9d37864`, reviewed head `ba6fe52`, GLM 5.3 Flash APPROVE in round 1 with canary `unit-flakes-b94884707ea8ce649921d79f318b1156` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `9d37864` with `db.status` ok (test-only change, no route to check).

## Unit flakes

Branch `test/unit-flakes`, off `e449555`, with `origin/main` (`c87509f`, PR #78) merged in. Test only (Green), an out-of-band side fix outside Wave 1. Only `announce-builder.test.tsx` and `run.test.tsx` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Nothing changes for the player. Two unit tests that flaked on loaded four-worker runs now wait for what they depend on.
- `announce-builder.test.tsx` waited 1 s for a `?b=` link to load the builder engine with `import()`. Under load that wait measured up to 2.7 s (hosted run 39073776203 failed it). The open helper now waits once with the 10 s budget `Builder.test.tsx` already uses. With the two files alone under 36 CPU burners, it failed 20 of 20 runs before the fix and passed 20 of 20 after.
- `run.test.tsx` "saves a new unseeded run before its first pick" read storage before `LiveRun`'s save effect could run. Under load the save was missing in 1 of 200 starts. The test now waits for the save. React flushes the effect before any pick, so this is not a product bug.
- Mutating each product path (`Builder.tsx` Randomize score, `HomeScreen.tsx` ignoring `?b=`, `LiveRun.tsx` dropping the new-run save) still fails the matching test.

RED commit: none, because no new guard was added. The loaded repro counts are the RED evidence.

Gates at `598f824` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on both touched tests passed.
- Unit tests, `pnpm test --maxWorkers=4`: 1,332 passed in 8 of 8 unloaded runs and 2 of 2 runs under 24 CPU burners.
- At the merge of `origin/main` (`545b598`): lint, typecheck and build exited 0, and `pnpm test --maxWorkers=4` passed 1,341 tests in 150 files in 3 of 3 runs.
- Hosted CI, Playwright (no UI change) and the GLM review: NOT RUN at the time of writing.

Scope, repro counts, measurements and the mutation output are in `docs/decisions/unit-flakes.md`.

PR #79 (row 1g, mobile pitch fixes) merged as squash `90aba39`, reviewed head `5cac7ce`, GLM 5.3 Flash APPROVE in round 2 with canary `mobile-pitch-r2-3d50fc7ebb70a24bfcd9025660bea576` echoed. Round 1 (`3398f4b`) was APPROVE but hosted e2e failed `speed-aware-staging.spec.ts` twice on a 2x goal flash the visibility poll missed (also failing 3 of 4 on `main` under a 6x CPU throttle); `5cac7ce` reads the flash from the page mutation log. Hosted check and e2e green on `5cac7ce`. Production `/api/health?db=1` served `90aba39` with `db.status` ok, and `e2e/mobile-pitch-fixes.spec.ts` against production (chromium) passed 4 of 4.

## Mobile pitch fixes

Branch `fix/mobile-pitch-fixes`, built on row 1f (`fix/quick-not-broadcast`). UI only (Yellow), Wave 1 row 1g (bundle). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- On phones (below 420px) the match HUD now uses two rows, so the momentum figures no longer run into the shot counts.
- The ball carrier's nameplate and the yellow card pip keep their full size (11px text, a 9 by 13px pip) instead of shrinking with the sprites. Names over 10 characters are cut to 9 and an ellipsis.
- Every sprite on the pitch is drawn at kickoff: the pre-match card now loads both elevens.
- Pass and shot trails keep their shape on the pitch, so the trail's start ring is round, and a penalty taker stands on the drawn penalty spot.
- Measured in a 390, 360 and 320px replay of the golden cup8 run's G1, and at a managed kickoff stop with 400 ms of added latency: 22 of 22 sprites drawn (17 before).

RED commit: `925bdb5` (3 failing unit tests in `Broadcast.test.tsx` and `timeline.test.ts`, and 4 failing scenes in `e2e/mobile-pitch-fixes.spec.ts`).

Gates at `554c42d` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed. `pnpm check:image-seam` clean.
- Unit tests: 1,343 passed in 150 files.
- Playwright on a fresh build of the fix code (`677f01a`; `554c42d` adds only the spec's rounding and the screenshots): `mobile-pitch-fixes`, `mobile-targets`, `mobile-acceptance`, `manager-mode`, `quick-not-broadcast`, `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `injury-staging` and `results-interactions` gave 393 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/mobile-pitch-fixes/390-live-pitch.png`, `360-live-pitch.png`, `320-live-pitch.png`, `390-kickoff-stop.png` and `390-live-pitch-before.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/mobile-pitch-fixes.md`.

PR #78 (row 1f, manager mode plays live, Quick is not a broadcast) merged as squash `c87509f`, reviewed head `27659c6`, GLM 5.3 Flash APPROVE in round 2 with canary `quick-live-r2-c379bd30b4dedd41803af83f7e1b89d4` echoed. Round 1 (`17d5290`) was also APPROVE but hosted CI failed its unit job on a flaky PR #72 guard, fixed in `27659c6`. On `27659c6` the unit job failed once on `announce-builder.test.tsx` (an unrelated known flake) and passed on a rerun of the failed job with no new commit; e2e green. Production `/api/health?db=1` served `c87509f` with `db.status` ok, and `e2e/quick-not-broadcast.spec.ts` against production (chromium) passed 1 of 1.

Hosted e2e on `3398f4b` (run 39075805190) failed `e2e/speed-aware-staging.spec.ts` (PR #77) on both attempts: `toBeVisible` on `goal-flash` timed out at 60 s while the replay reached full time at 1 - 0 with the 49' goal in the ticker. At 2x the flash lives about half a second, and a busy runner's visibility poll can miss it. Under a 6x CDP CPU throttle the unchanged spec failed 2 of 4 on this branch's build and 3 of 4 on a `main` build (`c87509f`), so this row did not cause it. The spec now waits on its own MutationObserver log for a frame that drew the flash, then for the callout to go. Under the same throttle it passed 6 of 6, with the callout on screen 977 to 985 ms. `e2e/score-lands-with-ball.spec.ts` polls the flash the same way at 1x (about twice as long on screen) and is left as a watch item.

## Quick is not a broadcast

Branch `fix/quick-not-broadcast`, built on row 1e (`fix/speed-aware-staging`). UI only (Yellow), Wave 1 row 1f. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- With manager mode on, every match now plays at the live pace, even when Quick sim is the saved choice. Before, a managed match with the default Quick view was over in about 5 s.
- While manager mode is on, the Match view selector on the home panel and on the challenge and daily start screens shows Live match, disables Quick sim and says "Manager mode plays live". Turning manager mode off brings the saved Quick choice back.
- A Quick match draws a still pitch with no move badges and plays only the beat sounds (whistles, goals, saves, cards, subs), not a sound for every phase.

RED commit: `d31e4d1` (7 failing tests in `MatchPlayer.quick.test.tsx`, `MatchdayFlow.pace.test.tsx`, `MatchdaySettings.test.tsx` and `SidePanel.test.tsx`).

Gates at `8fe6174` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed. `pnpm check:image-seam` clean.
- Unit tests: 1,341 passed in 150 files.
- Playwright on a fresh build of `8fe6174`: `quick-not-broadcast`, `manager-mode`, `mobile-targets` and `mobile-acceptance` gave 375 passed, 0 failed, 54 skipped. `watch-live`, `speed-aware-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum` and `injury-staging` gave 8 passed.
- Browser proof: `docs/reports/quick-not-broadcast/390-home-manager-plays-live.png`, `390-start-manager-plays-live.png` and `390-managed-match-live-pace.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/quick-not-broadcast.md`.

PR #77 (row 1e, speed-aware staging) merged as squash `e449555`, reviewed head `0a91bd9`, GLM 5.3 Flash APPROVE in round 1 with canary `speed-aware-fd842687f017bab0a83f941ce9ec86f7` echoed (a first reply put APPROVE on a line with other text, which the checker does not count, so the review ran again on the same packet); hosted check and e2e green on that head. Production `/api/health?db=1` served `e449555` with `db.status` ok, and `e2e/speed-aware-staging.spec.ts` against production (chromium) passed 1 of 1.

Hosted CI on `17d5290` (run 39071048139) failed the unit job on `MatchPlayer.movesets.test.tsx` "holds the clock at kickoff until the movesets resolve" (`expected 0 to be greater than 0`), a guard from PR #72 that waited a fixed 300 ms of fake time after the movesets gate opened. The real movesets module can still be loading under a four-worker run. Locally the unchanged test failed 1 of 8 full `pnpm test --maxWorkers=4` runs. The guard now keeps flushing the import while the fake clock runs (up to 100 steps of 48 ms) and still asserts minute 0 and "KO" for the first 1000 ms. With the hold removed from `MatchPlayer` it fails (`expected 20 to be +0`); with the fix it passed 10 of 10 full runs.

## Speed-aware staging

Branch `fix/speed-aware-staging`, built on row 1d (`fix/injury-staging`). UI only (Yellow), Wave 1 row 1e. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- At 2x speed every beat on the pitch now stages in half the time, so a goal's staging ends when the clock's hold ends instead of running on into play.
- The score, the ticker and the goal horn still land with the ball at 2x, at 0.6 of the shorter staging.
- Measured in a live 390px replay of the golden cup8 run's G1 at 2x. The goal's move callout stayed on screen for 1967 ms before and 983 ms after (975 ms expected).

RED commit: `a8795fd` (2 failing tests in `MatchPlayer.speed.test.tsx`).

Gates at `24ed4eb` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,332 passed in 148 files.
- Playwright on a fresh build of the fix code (`4ad326e`; `24ed4eb` adds only the spec and its screenshot): `speed-aware-staging`, `injury-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `manager-mode`, `watch-live`, `mobile-targets` and `mobile-acceptance` gave 382 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/speed-aware-staging/390-2x-goal-landed.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/speed-aware-staging.md`.

PR #76 (side fix, wheel skip flake) merged as squash `cd6c50e`, reviewed head `8e60bb2`, GLM 5.3 Flash APPROVE in round 1 with canary `wheel-flake-a047a6eeec8c4612f84233b893511419` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `cd6c50e` with `db.status` ok (test-only change, no route to check).

## Wheel skip flake

Branch `test/wheel-skip-flake`, off `b8e5c2c`. Test only (Green), an out-of-band side fix outside Wave 1. Only `e2e/wheel-results.spec.ts` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- Hosted CI failed `[webkit-wheel]` "wheel results at 1440px › skip results stay in the windows until the next pick and spin" in runs 39052173584 and 39062736785, both attempts, at 120 s on the `Tap to skip` click.
- Cause, measured per frame in local WebKit: the skip button is not remounted per frame and does not move. It lives only while each reel spins (1.7 s, then 2.1 s). On a slow runner the click's actionability checks outlasted both spins, and then no skip button ever existed again.
- Fix: the skip variant installs Playwright's clock, pauses it, advances it inside the poll until the reel has moved, clicks, then resumes. Players see no change.

RED commit: none. Plain local WebKit never reproduced it (60 of 60 passed with `--repeat-each 10`). A throwaway harness that busy-waits each animation frame reproduced the CI call log: the old spec failed 10 of 10 at 250 ms and 500 ms per frame; the new one passed 10 of 10 at both.

Gates at `b56ff55`: lint and typecheck exited 0, unit tests 1,327 passed in 146 files, Prettier check passed on the touched files. `e2e/wheel-results.spec.ts` passed 60 of 60 on webkit-wheel (`--repeat-each 10`) and 30 of 30 on chromium (`--repeat-each 5`) against a build of `b8e5c2c`. Hosted CI and the full local e2e suite: NOT RUN at the time of writing.

Scope, the per-frame probe, the harness table and NOT RUN are in `docs/decisions/wheel-skip-flake.md`.

PR #75 (row 1d, injury staging) merged as squash `09fcdae`, reviewed head `aa007c4`, GLM 5.3 Flash APPROVE in round 1 with canary `injury-staging-204fa02bad0d89b0341621bfe6cf0236` echoed. Hosted e2e failed once on this flake (run 39062736785, 817 passed, 1 failed) and passed on a rerun of the failed job with no new commit. Production `/api/health?db=1` served `09fcdae` with `db.status` ok, and `e2e/injury-staging.spec.ts` against production (chromium) passed 1 of 1.

## Injury staging

Branch `fix/injury-staging`, built on row 1c (`fix/score-lands-with-ball`). UI only (Yellow), Wave 1 row 1d. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- When one of your players is injured, that player now lies down in their slot with the medic banner. The replacement walks on from the touchline after that, with the sub board.
- In manager mode the replacement stays off the pitch until you answer the injury prompt, so the pitch no longer shows the assistant's pick while you choose.
- Measured on the golden cup8 quarter-final at 42'. Before, Kommo-o walked straight on and Roselia never lay down. After, Roselia lies down, then Kommo-o walks on.

RED commit: `519cd93` (3 failing tests in `Broadcast.injury.test.tsx`).

Gates at `ace149f` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,330 passed in 147 files.
- Playwright on a fresh build of the fix code (`3130f82`; `ace149f` adds only the spec and its screenshots): `injury-staging`, `score-lands-with-ball`, `one-shared-timeline`, `honest-momentum`, `manager-mode`, `mobile-targets` and `mobile-acceptance` gave 378 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/injury-staging/390-roselia-down.png` and `docs/reports/injury-staging/390-kommo-o-walks-on.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/injury-staging.md`.

PR #74 (row 1c, score lands with the ball) merged as squash `b8e5c2c`, reviewed head `8395f24`, GLM 5.3 Flash APPROVE in round 1 with canary `score-lands-58be11cd6bfb1ffa49b4a5043d2470ff` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b8e5c2c` with `db.status` ok, and `e2e/score-lands-with-ball.spec.ts` against production (chromium) passed 1 of 1.

## Score lands with the ball

Branch `fix/score-lands-with-ball`, built on row 1b (`fix/honest-momentum`, itself on row 1a). UI only (Yellow), Wave 1 row 1c. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- In a live match the score, the shots-on-target counts, the ticker line, the screen reader line and the goal horn now wait until the ball crosses the line, at 0.6 of the goal staging. Before, they called the goal about 1.56 s early.
- Under reduced motion and in Quick view nothing is staged, so the goal counts at once.
- The score is a status region. The live region announces whole event lines, at most 3 at a time and at most once every 1.5 s.
- Measured in a live 390px replay of the golden cup8 run's G1 (first goal 49'). Before, the score read `1 - 0` before the move callout appeared. After, it read `0 - 0` in flight and `1 - 0` at the GOAL flash.

RED commit: `60f05e7` (3 failing tests in `MatchPlayer.score.test.tsx`; `e2e/score-lands-with-ball.spec.ts` also failed on the RED build).

Gates at `362d187` (later commits change only docs):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,327 passed in 146 files on the last full run. Two earlier full runs at this head each failed 1 test in `src/components/builder/__tests__/announce-builder.test.tsx` ("Randomize says the Team Score the screen shows"), which this PR does not touch and which imports no matchday code. Isolated, it failed 2 of 3 runs, then passed 12 runs in a row. Flaky, recorded here.
- Playwright on a fresh build of the fix code (`ed2dec8`; `362d187` adds only the spec and its screenshots): `score-lands-with-ball`, `mobile-targets`, `mobile-acceptance`, `watch-live`, `manager-mode`, `one-shared-timeline`, `honest-momentum` and `recorded-saves` gave 383 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/score-lands-with-ball/390-goal-in-flight.png` and `docs/reports/score-lands-with-ball/390-goal-landed.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/score-lands-with-ball.md`.

PR #73 (row 1b, honest momentum) merged as squash `b72ac5a`, reviewed head `ac3f545`, GLM 5.3 Flash APPROVE in round 1 with canary `honest-momentum-bcf935028d6e9b0a6aff5e9fb3a084b1` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b72ac5a` with `db.status` ok, and `e2e/honest-momentum.spec.ts` against production (chromium) passed 1 of 1.

## Honest momentum

Branch `fix/honest-momentum`, built on row 1a (`fix/one-shared-timeline`). UI only (Yellow), Wave 1 row 1b. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The momentum bar no longer leans toward a goal or a save before it happens. It reads 50% / 50% until the first five minutes are played, then follows the window that just finished.
- The ambient ball and the open-play possession bias read the same lean, so neither drifts toward a chance that has not happened yet.
- Measured in a live 390px replay of the golden cup8 run's G1, where the user's keeper saves at 3'. Before, 0' to 4' read 36% / 64%. After, 0' to 4' read 50% / 50% and 5' to 9' read 36% / 64%.
- Not changed by this row: the bar still reads a flat 50/50 in most windows, and each frame's line height still reads the tactic snapshot at the window's end.

RED commit: `018fd21` (3 failing tests in `timeline.test.ts`, plus `e2e/honest-momentum.spec.ts` failing on 36%64% at 0').

Gates at `43c5a5d` (later commits change only docs and screenshots):

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,322 passed in 145 files.
- Playwright on a fresh build of `43c5a5d`: `honest-momentum`, `one-shared-timeline`, `watch-live`, `mobile-targets` and `mobile-acceptance` gave 365 passed, 0 failed, 54 skipped.
- Browser proof: `docs/reports/honest-momentum/390-kickoff.png` and `docs/reports/honest-momentum/390-after-first-window.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

Scope, RED output and measurements are in `docs/decisions/honest-momentum.md`.

PR #72 (row 1a, one shared timeline) merged as squash `b2f2d49`, reviewed head `667ad76`, GLM 5.3 Flash APPROVE in round 1 with canary `one-timeline-051829b31b7efd9c2408e72508363bb4` echoed; hosted check and e2e green on that head. Production `/api/health?db=1` served `b2f2d49` with `db.status` ok, and `e2e/one-shared-timeline.spec.ts` against production (`PLAYWRIGHT_BASE_URL`, chromium) passed 1 of 1 with 13 typed tones heard.

## One shared timeline

Branch `fix/one-shared-timeline` off `f4489cb`. UI only (Yellow), Wave 1 row 1a. No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The pitch, the HUD, the ticker and the match sounds now read one timeline. `MatchPlayer` loads the canon movesets and hands its timeline to `Broadcast`, which no longer builds its own.
- Players no longer jump when the movesets finish loading. Open-play callouts draw from their own substream `broadcast:<seed>:<i>:callouts`, and every callout draws exactly one number. Before, 69 of 72 phases differed between the two timelines on the test fixture.
- The clock holds at kickoff until the movesets settle. A failed load falls back to generic callouts.
- Typed ability sounds (fire, water, electric, grass, ice, psychic) now play. In a live 390px replay at the `origin/main` build, 0 typed tones played. At the fix build, 13 did.

RED commit: `de664f4` (5 failing tests in `moves.test.ts`, `timeline.test.ts` and `MatchPlayer.movesets.test.tsx`).

Gates at `dd4f3e7`, before the rebase onto `65cc88b` that made it `2afec93`. The rebase added only the #71 docs, and `git diff dd4f3e7 2afec93 -- src e2e` is empty. Later commits change only docs:

- Lint, typecheck and build exited 0. Prettier check on every touched file passed.
- Unit tests: 1,319 passed in 145 files. A first full run failed 1 test in `src/components/run/__tests__/run.test.tsx` (a run survives a reload), which this PR does not touch. That file passed 30 of 30 on five isolated reruns, and the full chain then passed. Flaky under load, recorded here.
- Playwright on a fresh build of the fix code (`7832262`, now `d692806`; `dd4f3e7` adds only the spec and its screenshot): `one-shared-timeline`, `watch-live`, `manager-mode`, `recorded-saves`, `engine-v4`, `club-region-identity`, `mobile-targets` and `mobile-acceptance` gave 386 passed, 0 failed, 54 skipped. The new spec, pinned to the chromium project at `dd4f3e7`, passed 1 of 1.
- Browser proof: `docs/reports/one-shared-timeline/390-typed-callout.png`.
- Hosted CI, the GLM review and a physical phone check: NOT RUN at the time of writing.

PR #71 (audits archive) merged as squash `65cc88b`, reviewed head `a3f04cf`, GLM 5.3 Flash APPROVE in round 2 with canary `audits-r2-8c7a787f937ec25ab33178b69b261f54` echoed. Hosted e2e failed once on `webkit-wheel` `wheel-results.spec.ts` "skip results stay in the windows" (the Tap to skip button detached while spinning, 813 passed, 1 failed) and passed on a rerun of the failed job with no new commit. Production `/api/health?db=1` then served `65cc88b` with `db.status` ok.

Scope, RED output and measurements are in `docs/decisions/one-shared-timeline.md`.

## Audits archive and program start (2026-10-17)

Branch `docs/audits-2026-10-17` off `f4489cb`. Docs only (Green). Audit A, Audit G, the program
brief and Audit A's 13 production screenshots now live in `docs/reports/audits-2026-10-17/`, with
SHA-256 hashes in its README and a `program-log.md` that gets one entry per wave. Decision log:
`docs/decisions/audits-2026-10-17.md`.

Previous PRs, now merged and live:

- PR #70 (matchday simulation overhaul): squash `40f3c92`, reviewed head `f20ab71`, GLM 5.3 Flash
  APPROVE with canary `matchday-sim-6823f5df8ab5673193a42648d59a1273` echoed (PR comment).
  `main` CI run 39011425527 green.
- PR #69 (draft picker over the pitch): squash `f4489cb`, head `ab62a1c`. The PR comments hold no
  reviewer receipt for that head, so its reviewer is unknown here. `main` CI run 39042707390
  green.
- Production `/api/health?db=1` serves `f4489cb63fedc131274248b14c00758378898ca3` on
  `pokedraft-engine-6`, token versions 1 to 6, `db.status` ok.

Gates at `6e08aaa`: `prettier --check STATE.md` passed, `pnpm check:mirrors` reported mirrors
identical, and the three Markdown copies hash equal to their sources. Unit tests, build and
Playwright: NOT RUN, because nothing under `src/`, `e2e/` or config changed. Hosted CI runs on the
PR.

## Draft picker over the pitch

Branch `fix/draft-picker-over-pitch` off `47ca844`, with `origin/main` at `40f3c92` (PR #70, matchday overhaul) merged in to clear a STATE.md conflict. UI only (Yellow). No file under `src/engine`, `src/data` or `src/scouting` changed. Merge status, the squash SHA and the reviewer receipt go into the next STATE update.

- The draft picker opens as a pop-up centered over the dimmed pitch at every width, desktop included, and closes after a pick. Choose a player reopens it.
- Each Squad First roll scrolls the pitch into view when its top is hidden. Before, each roll scrolled to the wheel in a fixed sheet, which left the page wherever the last slot tap put it. At 390x667 the pitch top sat at -263px from round 2.
- Position First rolls do not scroll.
- Below 480px the selection bar drops its Best, OK and Poor legend so it stays one row. Each slot already shows its fit. Hosted CI caught the wrapped bar pushing the pitch top to 355px of 667px.
- Dropped guarantees, because the pop-up covers the middle of the pitch: the slot being filled in Position First is hidden while the picker is open; drag to place only reaches slots outside the pop-up; tapping a placed player or the hub Sound button on a small phone needs the picker minimized first.

RED commits: `3c5e178` (pitch hidden after a pick, picker in flow in landscape) and `1c682de` (picker not centered, desktop not an overlay).

Gates at `77284ba` (later commits change only docs):

- Lint, typecheck, format check and build exited 0.
- Unit tests: 1,305 passed in 143 files.
- Playwright on a fresh build: 814 passed, 0 failed, 61 skipped.
- Round 1 at `eac1a26`: GLM 5.3 Flash APPROVE with the canary echoed, then hosted e2e failed 1 of 875 on the wrapped selection bar. `77284ba` fixes it, so that receipt is void.
- A physical phone check: NOT RUN.

Root cause, measurements and decisions are in `docs/decisions/draft-picker-over-pitch.md`.

## Matchday simulation, SVG soccer ball and broadcast UX overhaul

Branch `feat/matchday-sim-overhaul` off `47ca844` (PR #68 squash of the post-#67 live check). No file under `src/engine` changed.

- `buildTimeline` in `src/ui/matchday/timeline.ts` now builds deterministic 1.25-minute open-play phases (`plays`, seeded from `broadcast:<seed>:<matchIndex>:plays`) with possession chains, dribbles, passes, through-balls, crosses, supporting runners, pressing defenders, and open-play canon move callouts (`playCallout` in `src/ui/matchday/moves.ts`).
- `stagePitch` interpolates all 22 players smoothly across phase waypoints, stages goalkeeper tracking and dives, drives parabolic ball flight (`loft`, `spin`, `trail`), parries saved shots clear with `saveBall`, lines teams up for penalty shootouts, and freezes positions under reduced motion.
- `Broadcast.tsx` replaces the 10px white circle with a Telstar-style paneled SVG soccer ball (`soccer-ball-svg`) and ground shadow, adds full pitch markings (6-yard boxes, penalty spots and arcs, corner arcs, center spot), draws curved pass/shot/save trajectory trails (`pitch-trails`), shows active ball-carrier nameplates (`ball-carrier`), yellow-card pips (`pitch-card-<side>-<slot>`), directional sprite facing and running/casting/diving poses, and open-play ability bursts (`pitch-ability`).
- `MatchPlayer.tsx` mounts `Broadcast` in both `quick` and `live` views, adds a live tactical and momentum HUD (`match-hud`), adds a `Sound on` / `Sound off` toggle (`sound-toggle`) in the control bar, and triggers Web Audio SFX (`playWhistle`, `playKickPass`, `playAbilitySound`, `playSaveSound`, `playCardSound`, `playSubSound`, `playOppGoal`, `playGoalHorn`).
- `Touchline.tsx` adds `PlayerImage` sprites to the on-pitch energy list (`energy-slot-<slot>`), highlights tired players below 65 energy, and selects a player for substitution when their row is clicked.

RED commits: `0a675ac` (4 failing tests in `moves.test.ts` and `timeline.test.ts`) and `d3e94ae` (4 failing tests in `Broadcast.test.tsx`).

Local gates on the implementation commits:

- Lint, typecheck, build, format check, image seam, theme colors, theme contrast, theme CVD, and client bundle all exited 0.
- Unit tests: 1,313 passed of 1,313 in 144 files.
- Playwright (`e2e/manager-mode.spec.ts` and `e2e/watch-live.spec.ts`): 17 passed of 17 across chromium and pixel-7; `e2e/mobile-targets.spec.ts` and `e2e/mobile-acceptance.spec.ts` (`-g "matchday live touchline"`): 10 passed, 2 skipped across iphone-se, iphone-14 and pixel-7.
- Hosted CI, physical phone check, and the Sol review lane: NOT RUN at the time of writing.

Details and verbatim RED outputs are in `docs/decisions/matchday-sim-overhaul.md`, and updated screenshots are in `docs/reports/manager-mode/`.

## Hand-off follow-up: production check after PRs #64 to #67

Production health after the #67 deploy serves `482299988485191e38f2768d6a37c00104f67c85` on `pokedraft-engine-6` with token versions 1 to 6. `/api/leaderboard` with `scope=all` answers 200 for `coach` all, uncoached and coached in both `cup8` and `kanto151`.

The live suite (`LIVE_URL=https://pokedraft-woad.vercel.app pnpm exec playwright test -c playwright.live.config.ts`) passed 3 of 4 before this PR. The daily verify-bot case submitted and found its row, then failed with `strict mode violation: getByTestId('board-row').filter({ hasText: 'verify-bot' }).getByRole('link') resolved to 2 elements`: board rows have carried a "Challenge this Seed" link since #50/#52, and hosted CI does not run `e2e-live`. The spec now reads the row's `/r/` share link. The three live runs (before, a single-test rerun, after) each submitted a verify-bot daily run to production, as the live check intends; the board shows one verify-bot row.

Section E product calls and the worktree cleanup are recorded in `docs/decisions/tooling-and-process.md`. Still NOT RUN: a physical phone check of manager mode and Live match (owner action), and the Sol review lane (no access).

## Matchday robustness (dispatch B)

Merged as PR #67 (squash `4822999`, reviewed head `3dcb28e`, GLM 5.3 Flash APPROVE in round 1 with the canary echoed; hosted check and e2e green on that head). Branch `feat/matchday-robustness` off `648cf2f`. No file under `src/engine` changed.

- A reload during the matchday now comes back at the same match with every touchline decision kept. The run snapshot gains a `matchday` screen whose token carries the decisions so far. This replaces the earlier "returns to the finished draft" behaviour.
- Each played match on the results page has Watch live. It lazy-loads the Live match broadcast for that match, and a pd5 link reaches the goals-only fallback.
- The start screen's manager mode and match view follow a change made in another tab.
- One formatter, `incidentText` in `src/ui/matchday/copy.ts`, serves both the ticker and the results. An opponent tactic at minute 0 reads "Kick off: Opp play Counter".
- A touchline decision costs a median 27.7 ms at a 4x CPU throttle in Chromium (15 samples, range 24.3 to 33.6 ms, worst cold decision 42.4 ms). That is under the 100 ms bar, so the synchronous replay stays.

RED commits: `223d3f6` (savedRun matchday restore), `b17be61` (opponent kickoff copy), `f8383bb` (cross-tab settings) and `08897fb` (Watch live browser test).

Local gates at `6866dc4` (the commits after it change only docs):

- Lint, typecheck, build, format check, image seam and client bundle all exited 0.
- Unit tests: 1,289 passed in 140 files.
- Playwright with `PLAYWRIGHT_PORT=3482 CI=1`: 811 passed, 0 failed, 61 skipped. By project: chromium 348 and 1, iphone-se 135 and 29, webkit-wheel 6 and 0, webkit-progress 6 and 0, iphone-14 173 and 3, pixel-7 143 and 28.
- Hosted CI, the independent review and a physical phone: NOT RUN.

Measurements, decisions and failing output for each RED are in `docs/decisions/matchday-robustness.md`.

## Tooling and process dispatch

Merged as PR #66 (squash `e5e71d0`, reviewed head `2f28559`, GLM 5.3 Flash APPROVE in round 2 after a coordinator fix to `strip-verdict.py`, with the canary echoed; hosted check and e2e green on that head). Branch `chore/tooling-and-process`. No file under `src/`
changed. `tools/review/review-packet.py` builds the GLM packet (`--out-dir`, repeatable
`--exclude`, clean-tree check) and `tools/review/strip-verdict.py` checks the reply for the
canary, the full head SHA and one verdict word. The overrides record Sol as an optional lane, GLM
5.3 Flash as the gate, and no silent model swaps. Playwright now picks a port from the checkout
path when `PLAYWRIGHT_PORT` is unset, the server it starts reports `git rev-parse HEAD` as its
health sha, and global setup fails when a reused server reports another commit (skipped in CI and
for deployments, warned when the server has no sha). Live-engine e2e pins (seeded records, the
mirror exhibition, the live token prefix, share-link regex and engine version) are generated into
`e2e/pins.ts` by `pnpm e2e:pins`, and a vitest guard fails when that file is stale. The hosted
timing audit of statistical suites found no test above 40% of its budget without a 60 s timeout,
so no timeout changed. Decisions, the timing table and the proof runs are in
`docs/decisions/tooling-and-process.md`.

Gates at `180bfe0` (later commits change only docs): lint, typecheck, build and mirrors exit
0; unit tests 1,287 of 1,287 in 141 files. Playwright on a fresh build with
`PLAYWRIGHT_PORT=3484 CI=1`, before and after the pin migration: 804 passed, 0 failed, 61 skipped
both times (chromium 343 and 1, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28,
webkit-wheel 6, webkit-progress 6). Hosted CI and the independent review: NOT RUN at the time of
writing.

## Coached SQL hardening

Merged as PR #65 (squash `e251199`, reviewed head `ad90c82`, GLM 5.3 Flash APPROVE in round 1 with the canary echoed; hosted check and e2e green on that head). Branch `fix/coached-sql-hardening` off `648cf2f`, dispatch C items 11 and 12; item 13 (a stored `coached` column) is deferred until a filtered view is measurably slow. `coachedSqlFor(versions)` builds the board's coached rule and throws at module load on any version that is not a positive integer, and `MANAGER_TOKEN_VERSIONS` is typed so such a value does not compile. `coachedSql` is now total: a hand-edited `pd6.` row reads uncoached instead of turning the Uncoached and Coached views into 503s. It screens the base64url alphabet and length, reads the bytes as LATIN1, and checks the JSON with `pg_input_is_valid` (PostgreSQL 16+; Neon reports 17) and `jsonb_typeof` before counting. `isCoached` now keeps a leading byte order mark so both rules reject it. Three tamper-only payloads (`\u0000` escape, lone surrogate, numeric overflow) still differ, without throwing, and a test pins them. Canonical tokens keep their verdict. RED commits: `04b6312` (version guard, 6 failing), `d51dab7` (malformed rows, 2 failing: a base64 error and two 503 views), `ce96eef` (BOM, 1 failing). Decisions and verbatim RED output are in `docs/decisions/coached-sql-hardening.md`.

Local gates at `ef6436d` (the commit after it changes only docs):

- `pnpm vitest run src/leaderboard`: 81 passed in 8 files. Lint, typecheck, build and format check exited 0. Unit tests: 1,294 passed of 1,294, in 140 files.
- The compiled `coachedSql` on a scratch PostgreSQL 16.14 cluster gave the same verdicts as the PGlite tests on 11 tokens, including 4,096-character nesting, without an error.
- Playwright on a fresh build with `PLAYWRIGHT_PORT=3483 CI=1`: 804 passed, 0 failed, 61 skipped. By project: chromium 343 passed and 1 skipped, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28, webkit-wheel 6 and 0, webkit-progress 6 and 0.
- Hosted CI and the independent review: NOT RUN at the time of writing.

## Engine comments and invariants

Merged as PR #64 (squash `56c41d4`, reviewed head `deee557`, GLM 5.3 Flash APPROVE in round 1
with the canary echoed; hosted check and e2e green on that head). Branch
`chore/engine-invariants-comments`, off `origin/main` at `648cf2f`. Section A of the 2026-10-16 hand-off. No runtime behaviour changes.
Comments in `src/engine/cup.ts`, `src/engine/match.ts`, `src/ui/manager/touchline.ts` and
`src/components/matchday/MatchdayFlow.tsx` record three rules. A clean sheet needs half of
regulation even in extra time. The vacancy multipliers also correct the original starter that
`refreshUserLines` re-inserts into a slot a red card emptied. Any manager decision switches the
auto coach off for the user side. A new case in `src/engine/__tests__/cup.test.ts` pins at most
one pre-match absence per match over 400 cups and fails on a local `[absence, absence]` mutation.
No golden moved and `src/engine/versions/v5` is untouched (provenance check exit 0). Local gates
are engine suite 273 of 273, goldens 7 of 7, and lint, typecheck, test (1284 of 1284 on the rerun
after one unrelated `announce-builder` flake), build and format check all exit 0. Playwright NOT
RUN because nothing at runtime changed. Details in `docs/decisions/engine-invariants-comments.md`.

## Manager mode UI and the Live match broadcast

Merged as PR #62 (squash `35b99cf`, reviewed head `c75187e`, GLM APPROVE in round 2 after the Coached filter moved server-side; hosted check and e2e green on that head). Production after the deploy: health serves `35b99cf` on engine 6; `/api/leaderboard` returns `coach` all, uncoached and coached views and 400 for an unknown value; `e2e/manager-mode.spec.ts` against the production URL passed 10 of 10 on chromium and pixel-7. Branch `feat/manager-mode-broadcast`, which merged `origin/main` at `6915a84` (engine 6). No file under `src/engine` changed. Two panel settings, `managerMode` (default off) and `matchView` (`quick` or `live`, default `quick`), sit on the home panel and on the `/play` and `/daily` start screens. With both at their defaults, See results goes straight to the results as before. Otherwise the cup plays match by match after the draft. In manager mode the touchline stops at kickoff, half time, the break before extra time and each user injury. Every decision is checked and then replayed through `runCup` (about 174 ms per call in node), and the finished token carries the manager list and replays from the share link. Live match is a lazy-loaded top-down broadcast with `PlayerImage` sprites and canon move callouts. Movesets load by dynamic import, and the choreography is seeded from `src/lib/rng.ts`. Results list match incidents. Leaderboard rows carry `coached`, derived at read time from the token with no column. Board rows show a Coached chip and an All / Uncoached / Coached filter that runs in SQL (`coach=` on `GET /api/leaderboard`, `coachedSql` mirrors `isCoached` over `MANAGER_TOKEN_VERSIONS`), so each view is its own top 50 ranked 1..n; the submit rank stays the overall board rank. A reload during the matchday returns to the finished draft. Decisions and limits are in `docs/decisions/manager-mode-broadcast.md`, and browser screenshots and a GIF are in `docs/reports/manager-mode/`. RED commit: `385bc84` (savedRun coached restore).

The engine 6 submit guard that refused coached tokens is removed with the marker. RED commit for that: the handler test that ranks a coached token (422 before the removal).

The board coach filter runs in SQL. RED commit: `c22bc59` (an Uncoached view cut short by 51 coached rows above it, `coachedSql` vs `isCoached` equivalence, and the manager token version list).

Local gates at `4c63850` (the commit after it changes only this file):

- Lint, typecheck, build, format check, mirrors, image seam, image packs, theme contrast, theme colors, theme CVD and client bundle all exited 0.
- Unit tests: 1,283 passed of 1,283, in 139 files.
- Playwright on a fresh build with `PLAYWRIGHT_PORT=3471 CI=1`: 792 passed, 0 failed, 61 skipped. By project: chromium 343 passed and 1 skipped, iphone-se 135 and 29, iphone-14 173 and 3, pixel-7 141 and 28. The manager-mode spec passed 5 of 5 on chromium and 5 of 5 on pixel-7.
- Hosted CI, the independent review and the webkit projects: NOT RUN.

## Engine 6: manager mode engine candidate

Live engine `pokedraft-engine-6`, run token v6 (`pd6`). Engine 5 is frozen in `src/engine/versions/v5` (digest `cd69715e…4ede`), so every pd1 to pd5 link replays on its own engine; retained token versions are 1 to 5. Matches play in 5-minute windows (18 in regulation, 6 in extra time) with five tactics (balanced, attack, defend, press, counter) and style edges, fatigue from STA, user-side injuries with substitutions (up to 5), yellow, second-yellow and straight red cards, and an auto coach for anything the player does not decide. The Boss Club picks its own tactics and rotates tired legs. Coach decisions are optional in the token (`manager`, omitted when empty). A decision at minute m never changes anything at or before m (`src/engine/__tests__/manager.test.ts`). Played matches carry `incidents` and `windows` for the touchline and broadcast. Coached and uncoached runs share boards. The submit handler rejected coached tokens with `ILLEGAL_ACTION` until the manager UI shipped the Coached marker and filter; that guard was removed with the marker (rationale and the measured replay advantage in `docs/decisions/engine-6-manager.md`). Calibration against frozen engine 5 on the same bot squads: strong squads unchanged (cup8 good-bot win rate 0.850 vs 0.852), weak squads up about 3 points from bench role fit; about 3.3 yellows, 0.17 reds and 0.25 injuries a match. Scouting queue items 6, 10, 11 and the KIC positive control are closed: Jigglypuff and Wigglytuff no longer list GK as a best role, and `scouting.json` changed only on rows 39, 40, 95 and 497. Two link bugs found on the way are fixed with RED guards: pd5 share links would have 404ed under pd6 in `src/proxy.ts`, and pd5 runs had lost their Challenge button and board squad preview since #52. Merged as PR #61 (squash `6915a84`, reviewed head `1791257`, GLM APPROVE in round 3 after a hosted timeout fix on the scorer-role suite; hosted check and e2e green). Production health after the deploy: sha `6915a84`, engine `pokedraft-engine-6`, token versions 1 to 6, and a pd5 share link returns 200 and renders its record. The Sol cross-vendor review was NOT RUN: the Codex login does not support that model.

## Cleanup and debt dispatch

Rate-limit tables are now bounded. Each admission statement also deletes up to 50 `rate_limit_events` rows older than 7 days and up to 50 `rate_limit_buckets` rows idle for more than 1 day, never the key it admits. It stays one statement and one round trip. The candidate selects use `FOR UPDATE SKIP LOCKED`. On a scratch PostgreSQL 16 cluster, 240 concurrent statements had 0 deadlocks, against 130 for the unlocked shape. Rule windows longer than the 1-day idle cutoff throw. The announce-board focus flake was a stale error effect consuming the retry flag; it is fixed with a deterministic guard. Inter is self-hosted through `next/font/local` with Google's exact 7 subset files, unicode ranges and fallback metrics, so the build no longer fetches fonts. The WebKit cold-start flakes were all `waitForHydration` hitting `expect.poll`'s default 5 s; that wait now has a 30 s deadline. `pnpm format:check` passes. `drizzle/meta` and `src/design/tokens.css` are ignored, not reformatted. Local gates at `8ad5b24`: lint, typecheck, 1,122 unit tests in 124 files, build, format check, mirrors, and the Chromium e2e project (333 passed, 1 skipped). Merged through PR #60 after GLM APPROVE on head `61a3ad1` (hosted check and e2e green there) and a round-2 review of the merge-from-main head. See `docs/decisions/cleanup-debt.md`.

## Canon movesets artifact

`src/data/movesets.json` holds up to 4 canon signature moves and a `keeperMove` for each of the 1,025 species, built by `pnpm data:movesets` from the pinned PokéAPI CSVs (three new inputs pinned in `src/data/movesets.sources.json`). It is presentation-only for the future match broadcast: nothing in `src/engine` or `src/scouting` reads it, and `pokedex.json` and `scouting.json` rebuild unchanged. Moves come first from each species' debut level-up set (Charizard gets Flamethrower, Blastoise gets Water Gun and Hydro Pump). `keeperMove` prefers the debut group too, and Protect is still 889 of 1,025 species. `movesetFor(speciesId)` in `src/data/movesets.ts` is the accessor. The file is 139,510 bytes (19,043 gzip) and no client component imports it yet. The selection rule, hashes and spot checks are in `docs/decisions/canon-movesets.md`. Merged as PR #58 (squash `1306dc9`, reviewed head `1547c9a`, GLM APPROVE in round 2; hosted check and e2e green).

## Two-leg exhibitions and lifetime history

Merged as PR #59 (squash `5e5920f`, reviewed head `9aa8f6e`, GLM APPROVE in round 2 after the gates were re-run on the exact head; hosted check and e2e green). Branch `feat/two-leg-and-lifetime-history` off `6053928`. Decisions and evidence are in `docs/decisions/two-leg-and-lifetime-history.md`. The exhibition modal offers One match (default, byte-identical to before) or Two legs, decided on aggregate with no away goals rule. A level aggregate goes to extra time and penalties in leg 2. Lifetime totals live under `pokedraft:lifetime:v1`, count each run once by hashed token, backfill once from the retained history (labelled in the UI), and feed the formation win rate. The history page can download a versioned backup and restore one with Zod validation and a non double-counting merge. No engine file changed. RED commits: `087368c` (exhibition, 3 failing tests plus 1 file that failed to import) and `dd8ec36` (lifetime, 4 files that failed to import). Local gates on `18fab55`: lint, typecheck, test (1,151 tests in 127 files), build and `check:mirrors` exited 0. `format:check` exited 1 on 24 files that main already fails, and no file this branch touches is among them except STATE.md, which was reformatted in this commit. Playwright chromium: 336 passed, 1 skipped, 1 failed (`theme-type.spec.ts` 1440 light, a Builder font-size probe outside this change, which passed 4 of 4 when rerun alone). Playwright iphone-se: 129 passed, 27 skipped, including the new two-leg exhibition scene. Other phone projects and hosted CI: NOT RUN at the time of writing.

## Submission attempts correction

Rejected leaderboard submissions no longer spend one of the 10 hourly attempts per IP. Only a submission admitted to the server replay counts, including one whose replay fails. This deliberately reverses the Dispatch 5 rule that every attempt counts; the reasoning and the full table are in `docs/decisions/submission-attempts.md`. Players with a page open across an engine release now get the reload prompt without losing an attempt. Before this change, 4 empty-body production probes during the engine 5 release each recorded a `submit` event.

Submission attempts correction receipt. PR [#57](https://github.com/pnascimento9596/pokedraft/pull/57) merged at 2026-10-16T15:08:33Z. The reviewed head is `30c3db03ce35401a1ba6e15e04d547d1684ad5f0` and the squash is `6053928df8e5b1b4f6b39bbb861cb9684175dbe7`. GLM 5.3 Flash approved with canary `attempts-6e626796dbf07cfa4b944f7a6d40f55c`. Hosted run 38918007179 was green. Production health showed `6053928` at 15:09:12Z. In the production probe, `submit` events stayed at 8 before and after an empty body (400), a malformed token (422) and a stale engine version (409).

## October 16 engine 5 release receipt

PR [#55](https://github.com/pnascimento9596/pokedraft/pull/55) merged on October 16 at 05:38:11 UTC. The reviewed head is `d8c84035d0a80472aa193d31a6067f1c8786ff55`; the squash is `90613cac1509c4f4cb53059f16674ffa0cb7eba3`. GLM 5.3 Flash approved the first head `2331ae7` (canary `engine5-saves-6a4ef051678d95a1df5039e0db4763f0`). Hosted e2e on that head (run 38852708452) failed 18 phone tap-target cases because the new "Recorded saves" summary was 22px tall. `d8c8403` gives it a 44px target, and GLM approved that exact head (canary `engine5-saves-r2-2de5319c6b9b467688cdf24f7ca94394`). Locally on `d8c8403`, the serialized gates exited 0 (format warnings identical to main), 1,107 unit tests in 123 files passed, 7 emitted retained replays passed, emitted retained JSON stayed 3 copies and 2,088,694 bytes, and all Playwright projects passed 759 with 55 skips. Hosted run 38854566812 passed e2e. Its first `check` attempt failed while Turbopack resolved the Google font (`next/font/google queries have exactly one entry`), and the rerun of that job passed with no code change. Cache-busted production health returned HTTP 200, `Cache-Control: no-store`, this squash, engine 5 and token versions 1 through 5 at 05:39:01 UTC. Five Chromium checks passed against production: recorded saves in results and matchday at 320 and 1280px, no save list on a retained engine-4 link, and club regions at both widths. A pd5 submission for nickname `e5proof1016` on 2026-10-16 returned 201 (Team Score 538, 4-0-1, engine 5), its retry returned 200 for the same row, the board listed it, and `db:delete-entry` removed exactly that row.

## Opponent completion dispatch

Engine 5 records named goalkeeper saves, and every opponent club shows a verified city region. Engine 4 is frozen in `src/engine/versions/v4` (bundle digest `dc448ff8…abbfb`), and `pd4.` links replay it with no save list. Raw v4 replays of the engine-4 golden tokens hash to the shipped engine-4 digests. A recorded save classifies a chance trial that did not score: it is drawn from a per-side `save_events` substream, never prevents a goal, and never changes a score. Keeper strength already lowers the goal rate through the GK line. A failed penalty is not a save. `ON_TARGET_SHARE = 0.15` is a design parameter for save volume, not a real-world calibration; a 400-match probe measured 2.71 saves per keeper per match. With saves and the version string removed, 40 paired CI runs and a 1,000-run local campaign match the frozen v4 bundle exactly. The results UI states beside each save list that saves never change the result. Club regions are presentation only, with sources in `docs/dispatches/club-region-identity.md`. Release evidence is in the engine 5 release receipt above. See `docs/decisions/opponent-completion.md`.

## October 16 platform infrastructure release and production cutover receipt

PR [#53](https://github.com/pnascimento9596/pokedraft/pull/53) merged on October 16 at 04:27:01 UTC. The reviewed head is `8d0d146fdd9d1aebaa5738b848e548716e3a7b8d`; the squash is `f592272f3a222e8b4cf96565d9ddbae703ad21d5`, and its tree is identical to the reviewed head. GLM 5.3 Flash approved that exact head with canary `infra-merge2-28d13f3001cc39d5f2c0d573f3969096`, and hosted check, e2e and Vercel passed on it. On the Neon `preview` branch, rollback dropped migration 0003 and its bucket table, and migrate restored both. A Preview HTTP proof then returned 201 for a fresh submission and 200 for its retry with one event, and deleted only its own row.

The production cutover ran under the documented protocol. At 04:16:02 UTC two production firewall rules were published: `pd-admission-host-fence` denied admission POSTs (`/api/leaderboard`, `/gate/unlock`, with or without a trailing slash) on every host except the three stable aliases, and `pd-cutover-pause` denied them everywhere without the coordinator header. Edge 403 was verified on all three aliases, all four paths, the current and previous immutable deployments, and through authenticated `vercel curl`; health stayed 200. After a drain past 300 seconds, aggregate `pg_stat_activity` showed one idle client backend and no active admission queries. The Neon main branch `br-morning-snow-b7dn8iy8` held 3 migrations (latest `1791990000000`), no bucket table, 2 entries and 2 events. `pnpm db:migrate` recorded 4 migrations (latest `1792066817368`) with the bucket table present and counts unchanged. Health served the squash at 04:27:38 UTC on deployment `dpl_7MkzZ5XTi8JeL4hkUqhyjpV7NkoB`. The project skew boundary moved from null to that deployment's creation time `1792124823738`, and old pins by query, header and cookie all served the new SHA. A coordinator smoke on the stable alias returned 403 without the header, then 201 and a 200 retry for nickname `prodproof1016` on 2026-10-16 (Team Score 299, 0-2-1, engine 4). One row and one submit event were added, the board listed it, and `db:delete-entry` removed exactly that row. The pause rule was removed at 04:32:37 UTC. At 04:46:19 UTC the host fence was loosened from an allowlist of the three aliases to a deny pattern for immutable deployment URLs only, so submissions work from any alias and any future custom domain. Alias POSTs reach the application, and current and old immutable deployment POSTs stay denied. See the host fence section of `docs/decisions/platform-infrastructure-completion.md`. The local coordinator secret was deleted. Production credential rotation was not performed.

## Leaderboard row alignment correction

Hosted e2e failed `leaderboard-font-cls` at 412px in both themes on PR #53 (run 38830215286, twice) and earlier on `50af55a`. Main `88dcbae` fails the same 2 of 4 cases in the `mcr.microsoft.com/playwright:v1.64.0-noble` image. There, "Squad preview unavailable." fits one line in the Liberation Sans fallback and needs two in Inter, so the vertically centred rank, record and Team Score dropped 9px (layout shift 0.000208) when Inter arrived. macOS fallback metrics wrap like Inter, so local runs passed. Hosted passes depended on whether Inter loaded before the row painted. The board row now top-aligns its columns. A RED guard that grows the middle column failed at 360, 412 and 1280px before the fix. After it, the Linux image passed `leaderboard-font-cls` plus `leaderboard-cls` 13 of 13 in three consecutive runs, and local Chromium passed 328 browser tests with 1 skip, 1,039 unit tests, lint, typecheck, build, theme colors and mirrors. WebKit locally: NOT RUN; hosted CI covers it.

## October 15 engine release receipt

PR [#51](https://github.com/pnascimento9596/pokedraft/pull/51) merged on October 15 at 18:07:36 UTC. The reviewed head is `4b7439ca2cff41aa6211df9cd7a7a2fb565673d3`; the squash is `6218750ea2c9896e469b1496d5d20691b4b78d6f`. Hosted checks passed with 1,003 unit tests and 732 browser tests plus 55 skips. Cache-busted production health verified this exact squash at 18:08:36 UTC with HTTP 200, `Cache-Control: no-store`, engine 4, and token versions 1 through 4. Vercel deployment `dpl_GHSGZTdQ73mA2u7UiXDVGg1218yU` is READY in production. The landing owner completed 21 production browser checks against this exact squash, including retained/current replay and malformed-link contracts. The platform experience candidate is rebased onto this squash and preserves the final engine browser fixture repairs.

## October 15 platform experience release receipt

PR [#52](https://github.com/pnascimento9596/pokedraft/pull/52) merged on October 16 at 00:13:40 UTC. The reviewed head is `40723142cd9bdea99b16bbc4ece93de407a2f2c0`; the squash is `88dcbaef39b0aebc0f917f5127b666d711b657ce`. GLM 5.3 Flash approved that exact head with canary `experience-ci-repair-3f0f21419367f37b57cbaf729e7cc914`. Hosted run 38825262768 passed 1,039 unit tests in 117 files and 747 browser tests with 55 skips and 4 flaky retries. The four flaky cases are the `draft-flow.spec.ts` WebKit 375 and 390 px cold-start cases; the same four retried on main run 38783031946 before this PR, and this PR does not touch that file. Cache-busted production health returned HTTP 200, `Cache-Control: no-store`, this exact squash, engine 4, token versions 1 through 4, and `db.status=ok`. Thirty-seven read-only Chromium checks passed against production in 18.0 seconds, covering Boss XI and shootout identities, retained v1 to v3 replays, query and gate share previews, platform experience flows, history controls, and 15 malformed version 1 to 4 links answering 404.

### Platform experience candidate history

The second dispatch completes draft/scouting feedback, filled tactical slot labels, chemistry reason filters, actual swap comparisons, all-squad scouting, local formation win rates and the 1,025-species Hall of Fame, known-squad social previews, and recorded exhibition highlights. Historical records without squad metadata remain explicitly unknown. The first PR #52 hosted browser run failed with 716 passes, 30 failures, and 55 skips. The repaired candidate passes 1,039 unit tests in 117 files, lint, typecheck, production build, seam/mirror/theme checks, 85 focused browser cases, and a subsequent 83-case phone target/history selection. The browser selections overlap. Earlier 249-pass mobile results precede these repairs. Root causes, RED guards, exact logs, and limits are recorded in `docs/decisions/platform-experience-completion.md`. The release receipt above supersedes the pending review, CI, and deployment status recorded here.

| Field                                                                                     | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel linked                                                                             | **yes.** Merge = ship. Project `pokedraft` (`prj_GfNWnE8gbjY2YXOPOWszq7vxGOnL`, team `pnascimento9596s-projects`, Hobby, Git-linked to `main`). Production URL `https://pokedraft-woad.vercel.app`, first deploy `dpl_ARD2HPXQ1GY73ZEzeY3bkuFAEtxK` at `fb3c18e6d77f4b3495864275f27e4e7da73d23b2`. Env var names: `DATABASE_URL` (Production: Neon pooled main branch; Preview: pooled `preview` branch), `IP_HASH_SECRET` (Production, Preview; separate values)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | dispatch 4 GATE 5; `docs/decisions/dispatch-4.md`                                                                                                                                  |
| Database                                                                                  | Neon project `summer-lab-87419384`, production main `br-morning-snow-b7dn8iy8`. PR #50 recorded migration `0002_alltime_board_idx` and DB smoke PASS. No production schema change in this engine dispatch; fresh production migration smoke is NOT RUN here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October15 completion gates                                                                                                                                                         |
| Species in `pokedex.json`                                                                 | 1025                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `jq length src/data/pokedex.json`; PokéAPI CSVs pinned at c80757193bd0889054e36f4209762360bdaa4b95                                                                                 |
| `scouting.json` sha256                                                                    | 5f4b34e37a1fa78c1c4dafe65cc3dafce5e0532f8f982474898a7187ebe4d74d (dispatch 6 PR 6B: keeper frame term on DIV and HAN, serpent height read as body length unless the body levitates, Layer 2 reconciled; was 5969709fca53bf0dbea4d1cbfdc3499836c2d8f6654ddfabc78a6af93d807775, now frozen in the v1 bundle)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `shasum -a 256 src/data/scouting.json`                                                                                                                                             |
| Sanity panel                                                                              | 42 of 42 pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `pnpm vitest run src/scouting/__tests__/panel.test.ts`                                                                                                                             |
| `type-chart.json` sha256                                                                  | acfc00493f2b5d80edacf06271bfc935f5f8adc99bbb32f7dae1b89fa95f7cb1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `shasum -a 256 src/data/type-chart.json`; PokéAPI `type_efficacy.csv` at the pinned commit                                                                                         |
| Engine version                                                                            | Production `pokedraft-engine-4`, current token `pd4.`, verified at PR #51 squash `6218750ea2c9896e469b1496d5d20691b4b78d6f`. See the exact deployment receipt above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | October 15 completion evidence and executable guards                                                                                                                               |
| Retained engine bundles                                                                   | Frozen v1/v2/v3 remain byte-pinned. Version-aware adapters preserve v3 contribution and coin metadata and retain v1/v2 decree semantics. Only the requested retained bundle loads. See `src/engine/versions/__tests__/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | October 15 completion evidence and executable guards                                                                                                                               |
| Engine goldens                                                                            | Engine 4 cup8 593 / 3-0-2 / R16; Kanto 480 / 0-3-0 / group. Current replay hashes are literal in `src/engine/__tests__/goldens.test.ts`. Frozen v3 replay remains unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October 15 completion evidence and executable guards                                                                                                                               |
| Calibration (N 5,000 per row and bot, 0 errors)                                           | Engine 4, 90,000 cups, F=985. 840 bucket 288/8667 flawless, 6.09 mean wins; 900 982/8070; 950 6076/20194. All established probability targets fall within Wilson intervals. See `docs/reports/engine-v4-calibration.md` for fresh final evidence and preserved baseline candidates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | October 15 completion evidence and executable guards                                                                                                                               |
| Golden Boot by role (report only)                                                         | Fresh engine4 160000 cups,5000 per formation/bot/mode. Largest combined defensive-role share9.60% cup8 and9.64% kanto151; measured cells below10%, Wilson intervals cross10%. See `docs/reports/engine-v4-boot.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | October15 completion gates                                                                                                                                                         |
| UI routes                                                                                 | `/` (home and builder), `/play` (challenge run), `/daily` (today's New York seed, cup8 Open), `/leaderboard` (daily and all-time, per mode), `/r/[token]` (shared run plus OG image, one replay per request), `/card` (1200x630 PNG, same satori renderer as OG), `/history`, `/how-to-play`, `/gate` (friends passcode, off unless `FRIENDS_PASSCODE` is set)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `src/app/`                                                                                                                                                                         |
| API                                                                                       | `POST /api/leaderboard` (server replay, typed 4xx codes, 10 per IP per hour, counting only submissions admitted to the replay (pre-database rejections, stale engine versions, duplicate tokens and taken daily nicknames spend nothing; see `docs/decisions/submission-attempts.md`); submit stores the canonical token re-encoding; retrying an accepted (token, nickname) returns the saved row without spending an attempt; rank may be `null` after a saved insert), `POST /gate/unlock` (10 attempts per IP per 15 minutes), `GET /api/leaderboard?mode=&scope=daily\|all&date=` (top 50, read-only). Server errors log one JSON line (request id, no personal data); 503s carry `x-request-id`. Baseline security headers plus report-only CSP with `/api/csp-report` sink; valid-token `/card` and share images cache a day in browsers, a year on the CDN                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/leaderboard/contract.ts`, `src/leaderboard/server/handlers.ts`, `src/observability/log.ts`, `next.config.ts`                                                                  |
| Indexing                                                                                  | noindex, nofollow metadata, `X-Robots-Tag` on every response, robots.txt disallows `*` and allows link-preview bots, no sitemap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/app/robots.ts`, `next.config.ts`                                                                                                                                              |
| Unit and component tests                                                                  | Latest complete engine dispatch run: 1003 passed in 111 files. Additional focused data-free schedule extraction: 21 passed in 3 files. Exact final gates are recorded in the dispatch completion report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | October 15 completion evidence and executable guards                                                                                                                               |
| Playwright                                                                                | Engine completion selection56passed,1project-scoped skip, including malformed versions1through4,320/1280rosters and shootout names,retainedv3contribution,data-split,results,a11y,persistence. Physicaldevice proof NOT RUN.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | October15 completion gates                                                                                                                                                         |
| Image seam guard                                                                          | `PlayerImage.tsx` and its pure half `PlayerPicture.tsx` are the only files under `src/` allowed `<img`, `next/image`, `background-image` or `url(`; runs in CI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `pnpm check:image-seam`                                                                                                                                                            |
| Image packs                                                                               | `pokeapi-pixel` (default, 96x96 PNG, 4.0 MB) and `pokeapi-art` (256 px WebP, 13 MB), each 1025 of 1025 Dex ids, from `PokeAPI/sprites` @ `35fdbe9bdec8f519f882c3edc3c0185f08af4d86`. Credit and license are in each `pack.json`; `src/data/image-packs.json` is generated. The card re-encodes WebP to PNG with `sharp` (now a runtime dependency)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `pnpm check:image-packs`; `docs/reports/image-pack-*.md`                                                                                                                           |
| Lighthouse (local production build, mobile preset, simulated throttling, dispatch 5 PR B) | `/` Performance 88, LCP 3.8 s (over 2.5 s; the 1.33 MB `pokedex.json` plus `scouting.json` chunk, deferred); `/play` 96, LCP 2.6 s; `/leaderboard` 96, LCP 2.6 s (one run 4.4 s, 83); CLS 0 to 0.028; TBT 70 to 150 ms; Accessibility 100; Best Practices 100 (96 on `/leaderboard` locally, expected 503 with no database); SEO 63 (`is-crawlable`, intentional noindex). Production numbers for this PR are measured after deploy and recorded in the PR, not here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `docs/reports/finish-qa.md`                                                                                                                                                        |
| Ratings notes                                                                             | 20 seeded drafts, 7 oddities logged; re-run on engine-1, engine-2 and engine-3 with a before/after table (oddities 1, 4, 5 and 7 addressed in dispatch 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `docs/reports/finish-ratings-notes.md`; `scripts/calibration/play-seeded.mts`                                                                                                      |
| Road to the Final                                                                         | shows this run's exact opponents. `RoadStrip` takes the run's seed and mode, calls `buildLadder(seed, mode)` and prints each round's rating; a screen reader hears the round, the opponent's name and the rating. The draft screen always has the run's seed. On the start screen the seed is known for the Daily (today's seed) and for a shared `seed=` link; a fresh run draws its seed at Start, so until then the bars follow the shape of the coefficient table's ladder, no rating is printed, and the caption reads "Your opponents are set the moment you start the run." No nominal or approximate number is shown anywhere. Unit tests pin the eight names and ratings for seed `golden-1`, the start and draft screens for a shared link, a fresh run and the Daily, and the strip against the cup the same run plays. Checked in WebKit and Chromium at 390, 360 and 320 px in both themes: no overflow, start-screen layout shift 0.000 in 3 runs each (fresh, Daily, shared link), strip height 160 px with and without ratings; proof in `docs/reports/dispatch-7-pr-7a-proof/`. On a builder pitch under 800 px the token pill shows the number alone (a two-line pill overlapped tokens) and one line under the pitch reads "Ratings are 0 to 100, vs other players in the same role." | `src/components/run/RoadStrip.tsx`, `PlayScreen.tsx`, `DraftBoard.tsx`; `src/components/run/__tests__/RoadStrip.test.tsx`, `run.test.tsx`; `docs/queue/engine-followups.md` item 1 |
| Platform audit (dispatch 7)                                                               | Baseline on `928e4b1`: production Lighthouse mobile on a GitHub-hosted runner, LCP median 1.7 to 3.8 s (over 2.5 s on `/play`, `/daily`, `/leaderboard`, `/r/<token>`), CLS 0.211 on `/r/<token>` and 0.046 on `/daily`, Accessibility 100. Findings: 0 S1, 56 S2 (each assigned to a fix PR), 137 S3 (135 deferred, 2 frozen)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `docs/reports/audit-baseline.md`, `docs/reports/platform-audit.md`, `docs/queue/dispatch-7-deferred.md`, `docs/decisions/dispatch-7.md`                                            |
| Data split (dispatch 7 PR 7I)                                                             | The 1.32 MB species chunk (`pokedex.json` + `scouting.json` in one hashed JS file) loads on demand, never with cold `/`, `/play` or `/daily`: proven by `e2e/data-split.spec.ts` (chunk absence before load, fetch on first use). `src/ui/lineup.ts`, `src/engine/formations.ts` (via `src/engine/roles.ts`), `RoadStrip`, `Pitch` (via `speciesOf`), `Builder`/`HomeScreen`/`PlayScreen` shells are data-free; the builder engine (`src/components/builder/live.ts`), `LiveRun`, `ResultsView`, `swapMessage` (`src/ui/swap-message.ts`) and token helpers (`src/ui/builder-token.ts`) load with `import()` at first use or idle. Engine output unchanged (goldens green). Lighthouse + start-to-wheel timing measured on the PR's Preview deployment vs production; numbers in the PR body.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `e2e/data-split.spec.ts`, `pnpm build`                                                                                                                                             |
| Last reviewer                                                                             | GLM 5.3 Flash (`glm-5.3-flash:cloud --think high`), dispatch 8 PR #25 APPROVE on `2eda683327f9ff7cd08cdf05b7f7e1211497b2b0`, squash `56b9f754d88388223725ad2f3512f239b18fd229`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PR #25 review receipt and Linux CI `38129942178`                                                                                                                                   |
| Health and theme measurements (dispatch 8 PR 8.0)                                         | `GET /api/health`: build SHA, env, region, engine and supported token versions; dynamic and no-store, public through the passcode gate. No database access unless `?db=1`, then read-only connectivity with neutral 503 on failure. `theme-measurement.yml` manually runs three Lighthouse mobile production audits per route on GitHub-hosted Ubuntu and records medians plus raw reports. Production health proved merge `56b9f754d88388223725ad2f3512f239b18fd229`; live 4 passed and mobile 242 passed/46 skipped. Baseline Lighthouse run `38130597740` completed with three runs per route, Accessibility 100 and CLS 0 medians.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `src/app/api/health/route.ts`, `.github/workflows/theme-measurement.yml`, `docs/decisions/dispatch-8.md`                                                                           |
| Warm theme foundation (dispatch 8 PR 8A)                                                  | Inter, exact source tokens plus documented game roles, nine primitives, shared nav icon registry, contrast/color/CVD CI gates and 44 visual/axe cases with platform-specific references. Local unit suite 734/80 and foundation browser suite 102/102 passed. PR #26 reviewed head89b390f and mergee8ce2d3: Linux CI38148882020 passed734 unit tests and488 browser cases/51 skips; production live4 and unchanged mobile242/46 passed; HTML/network proves Inter alone. Font-change Lighthouse38150015655 passed: three runs per route, Accessibility100 and CLS0 in every sample; medians archived. Page structure restyles remain scheduled for PRs 8B through 8F.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `docs/design/tokens.md`, `docs/decisions/dispatch-8.md`                                                                                                                            |
| Challenge ratings setting                                                                 | Home Settings has a second switch, "Show ratings (challenges)", default off, stored as `showChallengeRatings` in `pokedraft:panel`. On, the 8-0, 151 and Daily draft screens show each offered player's rating (rated at the committed slot's role, else "Best: ROLE"), each placed player's pitch pill and one legend line; off renders nothing extra. Display only and client-local: engine, token, scoring, leaderboard and DB unchanged. One `ratingFor` (`src/ui/rating.ts`) now feeds the builder picker, the builder token pill and the draft board. The ranked board cannot tell sighted from blind runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `src/ui/rating.ts`, `src/components/run/DraftBoard.tsx`, `docs/decisions/challenge-ratings.md`, `e2e/challenge-ratings.spec.ts`                                                    |
| Silph Stadium UI                                                                          | UI-only 3D pitch, authentic type/card presentation, dugout, scrollable mobile hub/drawers and bare `/play` lobby. Parent verification passed lint, typecheck, 864 units in 93 files, build, palette/contrast/CVD, image/bundle/mirror guards, and full Playwright 671 passed / 55 conditional skips / zero failures. Default-open mobile settings precede the pitch and Formation is visible on the first screen; existing confirmation and customization contracts are retained. All 163 protected paths match base hashes. Nine immutable before captures and 34 final captures under `output/silph-stadium/`. Partial chemistry remains unavailable through the frozen engine API. Exact-head independent review, remote CI and shipping pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `docs/decisions/silph-stadium.md`, `decisions.tsv`                                                                                                                                 |
| Mobile draft flow                                                                         | Narrow UI follow-up. Phone wheel scrolls into view once per active roll; draft-only pitch is 620px; empty/armed positions have one solid frame; committed slot has distinct 3px outline ring; compact picker and rerolls use normal page flow without nested scrolling or bench overlap. Full validation and review 2 in progress.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `docs/decisions/mobile-draft-flow.md`, `e2e/draft-flow.spec.ts`                                                                                                                    |
| Platform overhaul (waves 1 to 4)                                                          | PR #50 merged and production health verified at `c87e5a8a6c4fd3e160786edd79e37776b626e0d2`. Engine/replay completion is this dispatch; draft/scouting/career and platform admission/dedup follow as separate reviewed dispatches under the user-approved full roadmap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | October 15 completion evidence and executable guards                                                                                                                               |

## NOT RUN

What the repo's own records say was not run or not measured, copied from those records, and what dispatch 7 PR 7A could not run. A line here is not a pass. When a check is run, its result replaces the line.

### Recorded by dispatch 5

From `docs/reports/finish-qa.md`, run on 2026-10-10 against a local production build and the production baseline at the PR A deploy (`32e966b`), before that PR merged. The file says: "The post-deploy production run is part of the live verification after merge and is not recorded in this file."

| Not run                                                                                                                                   | As recorded                                                                                                                                                                                                                                                                   | Source                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Browser drag-and-drop of tokens, including touch-emulated drag swap on a phone-sized viewport (F2), and manual reroll in the browser (F7) | "Roll identity is therefore guarded by a unit test only." F2: "no manual drag in a real browser this dispatch"                                                                                                                                                                | `docs/reports/finish-qa.md` lines 84, 88, 178 |
| A whole draft operated by keyboard alone (A1)                                                                                             | "Operating a whole draft by keyboard alone was not done"                                                                                                                                                                                                                      | `docs/reports/finish-qa.md` lines 105, 179    |
| Daily submit and a real leaderboard row (F10)                                                                                             | "needs the database; e2e stubs the API. The live suite after deploy covers submit and the board row"                                                                                                                                                                          | `docs/reports/finish-qa.md` lines 91, 180     |
| Gate unlock and throttle (F14)                                                                                                            | "Unlock and throttle were not exercised in this dispatch (dispatch 4 tests cover them)"                                                                                                                                                                                       | `docs/reports/finish-qa.md` lines 95, 181     |
| `role="alert"` errors on submit and gate (A7)                                                                                             | "`role="alert"` on submit and gate errors was not exercised in a browser"                                                                                                                                                                                                     | `docs/reports/finish-qa.md` lines 111, 181    |
| 44 px tap-target measurement                                                                                                              | "Tap-target size (44 px): NOT RUN, so the viewport row is not a full pass."                                                                                                                                                                                                   | `docs/reports/finish-qa.md` lines 99, 182     |
| Lighthouse on production for this PR                                                                                                      | "(after deploy)"                                                                                                                                                                                                                                                              | `docs/reports/finish-qa.md` line 183          |
| A missing-id end-to-end test (W1)                                                                                                         | "NOT DONE as an end-to-end test. Both packs cover 1025 of 1025 Dex ids, so no real route can render a missing id. The blank fallback for a missing id is covered by `PlayerImage.test.tsx`; the e2e image-error test covers the same blank footprint through a failing image" | `docs/reports/finish-qa.md` lines 165, 184    |
| The production baseline column for F2, F3, F4, F5 and F6, F7, F8, F10, F13 and F14                                                        | "NOT RUN"                                                                                                                                                                                                                                                                     | `docs/reports/finish-qa.md` lines 84 to 95    |
| Text over gradients or images (the pitch, the hero) under axe (A4)                                                                        | "axe cannot evaluate text over gradients or images (the pitch, the hero), so those spots are unverified"                                                                                                                                                                      | `docs/reports/finish-qa.md` line 108          |

From `docs/decisions/dispatch-5.md`:

| Not measured                                                                             | As recorded                                                                                                                                                                                           | Source                                 |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Whether a cold connection shows an unloaded face in the first frames of the wheel's spin | "NOT MEASURED: whether a cold connection shows an unloaded face in the first frames of the spin"                                                                                                      | `docs/decisions/dispatch-5.md` line 58 |
| The fallback font's metrics (`Big Shoulders Fallback`)                                   | "The numbers are computed in the CSS comment from Next's bundled capsize metrics for Big Shoulders Display at weight 800 against Arial Bold; they are NOT measured from the font file the site loads" | `docs/decisions/dispatch-5.md` line 77 |
| The pack credit with scripting disabled                                                  | "A no-JS visitor with a saved other-pack choice would see the default credit. Not measured with scripting disabled."                                                                                  | `docs/decisions/dispatch-5.md` line 91 |

### Recorded by dispatch 6

`docs/decisions/dispatch-6.md` has no NOT RUN or NOT MEASURED entry. Its playbook checklist records these skipped steps: "`how` over the affected subsystem. skip: not installed; GATE 0 recon above stands in, per pokedraft-mode." (line 40), "`architect` for parallel design exploration. skip: architect skipped, dispatch fixed the design." (line 41) and "The multi-phase plan playbook is `skip: the dispatch is the plan and the autonomy grant`." (line 53).

### Dispatch 7 PR 7A

| Not run                                                    | Why                                                                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real iPhone Safari and a real Android phone                | the browser proof used Playwright WebKit (iPhone 14 profile) and Chromium (Pixel 7 profile) only                                                                             |
| "Scouting notes" on a result row with no rationale         | unreachable: 1025 of 1025 species have a rationale                                                                                                                           |
| `knip` (unused exports after `NOMINAL_LADDER` was removed) | knip is not a repo dependency; `rg NOMINAL_LADDER` finds no use in `src/` instead                                                                                            |
| Share card redesign                                        | Card sprites trimmed and 2x+ larger, framed pitch, W/D/L and finish panel; PNG 97,283 to 292,593 B, warm render 49 to 147 ms (FLAWLESS)                                      | `docs/decisions/share-card-redesign.md` |
| Home settings (settings-confirm)                           | Settings open by default; home Play buttons open a "Settings confirmed?" dialog (Yes goes to `/play`, No focuses Formation); shared links, daily and friendly are not gated. | `docs/decisions/settings-confirm.md`    |

### Dispatch 8 PR 8B checkpoint

PR #27 is shipped: reviewed 249a6dd, squash 6e7d34e, GLM APPROVE, Linux CI 38150679435 734 unit/496 browser/51 skips. Production health/live4/mobile242/46 pass; verify-bot cleanup count0. Clean-runner Lighthouse 38151791031 complete, all samples Accessibility100 and exact CLS0. Screenshot and figure receipts are in docs/reports/dispatch-8/.

### Dispatch 8 PR 8C checkpoint

PR #27 shipped with GLM exact-head APPROVE, Linux734 unit/496 browser/51skip and productionlive4/mobile242/46. Draft/wheel restyle in progress: strengthened actual-picture guards exposed an own-picture hover-scale collision, corrected in the current candidate. Full local run519/51 exposed one chart bounds failure; four chart guards committed RED before correction. Current99 focused checks pass; all24 actual-picture formation/device guards passed. Linux final browser, independent review and production8C remain pending. Strictzero360/390 restoreCLS remains enforced.

### Dispatch 8 PR 8D checkpoint

PR28 shipped: reviewed6568b06, squashbac8bea, GLMAPPROVE, Linux734/524/51, productionlive4 andcombinedmobile+draft286/50, verifybotcount0. Lighthouse38170883438 complete(all100A11y/exactCLS0). Results/sharecandidate:734unit/80files and61focusedbrowserpass; allgatesgreen. Corrected6darkcontrastfailuresfromthefull522/51/6run. Before/aftercapturesandnumericreadbackretained. Exact-headLinux579-casefullsuite,independentreviewandproduction8Dpending.

## Dispatch 8E candidate

Daily/leaderboard presentation restyle; local unit734/80 and browser536/51skip, 587total. Figures unchanged, zero axe/CLS in focused checks. Exact-head review/CI and production pending. 8F support area remains pending.

8D shippedPR29 mergeb3ab2c7; reviewed e0c7903 GLM APPROVE, CI734unit and528/51browser, productionlive4/mobile242/46, card+OG1200x630, exactverifybotcleanup0. 8E candidate nowrebased onto8Dmain; exactreview/CIpending.

## Dispatch 8E production correction

PR30 shippedf5e2256, reviewedb47a8e3 GLMAPPROVE, CI38173336275 unit734/browser536+51skip. Productionlive4/mobile242+46skipgreen, exactbotcleanup0. Lighthouse38174354317 exposedboardfooterCLS0.011626827583050482 all3samples; gateRED. SixnewcoldloadguardscommittedRED, candidate viewportreservation yields21focusedpass. ExactLinuxCI/review/productionpending. Support8F workcontinuesisolated.

## Dispatch 8F candidate

Support pages and final type/table/static-figure presentation implemented. Currentbase8D; 8E will be integrated before finalgates/review. Correctedfocused73pass; priorfull540/51skip/4testselectorfail preserved. Finalexact-headLinuxCI andproductionpending.

## Dispatch 8F final candidate

History/help/404/gate plusreadabilityandhumanroundlabels: unit735/80, fullbrowser560/51skip(611cases), primitives44 unchangedvisualrefs, figures186/10both themesunchanged. Targetedtype4passaftertestselectorfixes; historicalfailedruns preserved. Beforeafter52viewport+52full eachzerooverflow/card1200x630. Rebaseonto8ECLSfix, exact617-caseLinuxCI/independentreview/productionremainpending. PR31correctionhasGLMAPPROVE; firstLinuxcheckfailed733/1duetotheunchangedbuilderlazyrestore1swait, fullgateunaccepteduntilgreen.

## Current Dispatch 8 checkpoint

PR25–31 are merged. PR31 exactreviewc8c4d58, squash5199e56, CI38175095402 green734unit/542browser/51skip aftersame-head checkrerun. Productionlive4/mobile242+46skip/cleanup0, UbuntuLH38176506885 all24samples100/exact0. Tiny late-font fixture shifts are resolved in8F.

8F finalcandidate:735unit/80files; full623-case browser suite572pass51skip; allstatic/contrast/color/CVD/image/bundle/mirror gates green. Beforeafter68viewport+68full each, zerooverflow, card1200x630, figures186/10both themes unchanged. Exact-headLinuxCI, independentGLMreview, merge andproduction8F verification pending. Wholelanecloseout remainspending.

### Dispatch 8F Linux correction checkpoint

PR #32 remains unmerged. First exact-head Linux browser CI 38193051091 found four delayed-font failures (568 passed, 51 existing skips); its static/unit job passed 735 tests. The prior fc070324 review is superseded. The native date field now reserves geometry and shows Loading date until fonts are ready; caption line space is reserved. No second font or original mobile assertion changed. Linux focused 12 and macOS focused 62 pass, native date editing is preserved, and 186/10 figure snapshots remain identical. New full CI and independent review are required. A local concurrent unit run timed out four unchanged tests; isolated validation is pending.

## Dispatch 8 source acceptance complete

PR25–32 are merged. Final theme merge b6c9bb71f0f12ad56b37e5945c302712dc6388a7, reviewed792c841146a3fcec7aa0304afb61810f57e24315, GLM high APPROVE/canary verified. CI38195371430:735unit/80files; browser573pass,1pass-on-retry,51existing skips,625total. Productionhealth/live4/mobile+formations286/50/UI71 pass, exact verify-bot cleanup0. Forty-four production viewport+full-page pairs are bound to the health SHA; all zero overflow/oneh1. Inter-only HTML/network proof and1200x630 card/OG pass; figures186/10 unchanged per theme.

Final clean Ubuntu Lighthouse38246671783: all24 samples Accessibility100/exactCLS0,3run medians per8routes, matching baseline environment. Source before/after screenshots, contrast minima, type-color simulations and full metrics are in docs/reports/dispatch-8/readback.md and screenshots.md. The documentation closeout PR carries these receipts and still requires its own exact-head review/CI/merge/production sequence. The final response records that PR’s identity and post-merge result. Earlier pending checkpoints are historical and superseded by this section.

## Settled wheel result correction

The region/type wheel windows no longer inherit the animation strip's transform or blur after settlement. Spinning and settled reels have distinct DOM keys. Draft state, timing, engine rolls, and generated data are unchanged. The failing component guards were committed before the fix.

Local validation passed lint, typecheck, production build, and 739 unit tests across 80 files. Twelve browser cases passed in Chromium and WebKit at 390 and 1440 px, covering natural completion, mid-spin skip, reduced motion, candidate selection, and the next round. Exact-head review and CI receipts belong to the correction PR. Merge and post-deploy verification are NOT RUN until deployment is authorized. See `docs/decisions/wheel-results.md`.

## Share link transport correction

Share copies `/r/pdN?t=<payload>` so Apple's native link detector preserves the complete run payload. The proxy reconstructs the existing canonical token and rewrites to the result route after passcode checks. Complete legacy path links, current and retained engine replay, previews, image downloads, and scoring retain their contracts. Production requests to a truncated `/r/pd3` returned HTTP 404, matching the player's reported link.

The regression commit preceded the fix and failed six checks. Local validation passed lint, typecheck, production build, and 762 unit tests across 81 files. Fifteen focused browser cases passed for Share/replay, draft orders, retained links, gate preview metadata, and invalid-link status. Chromium and iPhone-profile WebKit both restored the observed `1-1-1`, Team Score `283` run. Apple's native detector recognized all 434 characters of the corrected copied link, versus 39 of 432 for the original. A test selector was scoped to the results status after the separate capture harness exposed the global announcer.

Independent review and CI receipts belong to the correction PR. Merge and production verification are NOT RUN until deployment is authorized. Physical iPhone messaging applications are NOT RUN. The shortened `/r/pd3` alone has no seed or action payload to recover. See `docs/decisions/share-links.md`.

### Share correction browser gate

Two full Linux attempts on `1892394` passed all Share cases but failed the existing natural wheel candidate deadline. First results were 589 pass, 51 skip, two pass on retry, one fail. The unchanged rerun was 586 pass, 51 skip, five pass on retry, one fail. A focused unchanged wheel run passed all 12 Chromium/WebKit cases. Traces show candidates appearing just after the five-second assertion, while the nominal spin/pause sequence alone is 4,380 ms. The browser test now awaits both settled wheel results before its unchanged candidate assertion at both rounds. This changes only the test protocol. The prior review receipt is superseded; fresh exact-head review and CI remain required.

The corrected wheel wait and Share cases passed all 19 focused browser checks across Chromium and WebKit. Only two settlement waits were added to the existing browser test; the original candidate, result text, geometry, selection, and next-round assertions remain. No application source changed in this correction.

## Browser progress and simultaneous players

Separate browser profiles retain independent history, stats, preferences, and active runs. Run snapshots now preserve the original random seed and persist to both per-tab storage and a durable browser checkpoint. The tab owns its active run; reopening the site can recover the latest checkpoint per mode or Daily. New run clears only matching owned bytes and leaves a cleared tab marker. Existing tab-only saves migrate when no durable checkpoint exists. Settings, seed, date, and reconstructed token are validated behind the existing lazy run import.

Builder now persists exact player edits synchronously before render and restores the lineup on plain home reopen. Explicit shared lineup links retain priority, and viewing or clearing another squad protects the unrelated owned checkpoint. Browser storage remains best effort; accounts and cross-device synchronization are outside this change. Engine/scoring/leaderboard contracts are unchanged.

Failing unit guards preceded the fixes. Local lint, typecheck, production build, and 793 unit tests across 82 files pass. Twenty-five focused browser cases pass with one existing desktop touch-share skip; all six new progress guards pass in Chromium and iPhone-profile WebKit. They cover independent players, tab ownership, random refresh, browser restart, replay isolation, and Builder recovery. Exact-head review, full CI, merge, and production receipts belong to the correction PR. See `docs/decisions/browser-progress.md`.

### Browser progress CI focus correction

The initial final-head Linux unit job passed 792 tests and failed the existing async Start-focus assertion. That test now awaits its unchanged expected heading focus after the lazy screen loads; application focus behavior is unchanged. The corrected file passes all ten tests with scoped lint/typecheck green. Prior review is superseded; fresh exact-head review and CI are required.

### Browser progress route focus correction

Full Linux browser CI found a real New run focus regression after explicit-seed removal remounted Challenge. The cleared-tab mount now focuses the replacement Start heading. The strengthened unit guard preceded the runtime fix and the 47-test run group passes. The browser guard awaits the final seed-free URL before asserting focus. WebKit's restored Round 1 appeared 5,046 ms after its five-second deadline; only that assertion now uses the existing ten-second lazy-load budget. The previous review is superseded; fresh exact-head review/CI remain required.

## CI UI regression correction

Narrow display-only repair resumes the interrupted lane at `94ec380`. Pitch/card geometry keeps targets separate, visible slot instructions fit compact empty cards, and accessible names retain the visible label sequence. Cup-round controls meet the existing size/type guards. Results/chart colors follow their actual theme surface. The fixed phone drawer retains its original maximum height and reserves matching page scroll space during choosing, including before wheel reveal. Its toggle and instruction use stadium colors only inside that dark responsive panel.

Engine, data, scoring, storage, draft actions, leaderboard, database, API, and runner configuration are unchanged. The two-tab test waits for a hydrated, idle second Start instead of spending its click during an automatic wrong-seed restore. Its original isolation and checkpoint assertions remain. New name and drawer-contrast guards were committed RED before their fixes. Final local lint, typecheck, build, client-bundle guard, and 881 unit tests in 97 files passed. The first complete browser suite passed 697 cases with 55 existing conditional skips, zero failures, and zero retries. Independent review then rejected `b886aed` for filled-card content overflow. New containment and filled-target guards were committed RED. Base and builder heights retain 94px and 90px; fitted filled cards use a measured 88px, while empty cards remain compact. That head's review/browser receipt is superseded. Fresh complete browser validation, exact-head review, CI, merge, and production proof remain pending at this checkpoint. The original screenshot acceptance audit also found ambiguous clipped names. Type icons now sit beside the unchanged artwork, leaving a two-line name area; corner position/rating badges and primary-type outlines are preserved. The full-name guard preceded the fix, and focused verification passed 119 browser cases with four existing conditional skips. Home-only disclaimer and unclipped phone-round labels are directly guarded. See `docs/decisions/ci-ui-regressions.md`.

## Results interaction repair candidate

The ball now receives the existing striking state through its CSS attribute. Pause Motion covers every descendant animation while logical timers continue. Selection, reset, and unmount cancel pending strike callbacks. Single-goal headlines use neutral scorer copy rather than inferring equalizers from final scores. RED guards preceded the fixes. Local focused units passed 13 tests and fresh-build Chromium/WebKit proof passed 6 browser checks on port 3481. Lint, typecheck, and build exited 0. Full units passed 882 and failed 4 untouched Builder/run card-text assertions; an exact-base archive reproduced those four failures. Independent review, full browser sweep, CI, PR, merge, and production verification remain NOT RUN. See `docs/decisions/results-interactions.md`.

## Platform infrastructure acceptance candidate

Fresh leaderboard submissions use three database queries on daily and all-time boards. Saved retries use two and consume no slot. Atomic bucket upserts serialize admission per scope and hashed IP. Migration 0003 backfills existing events; new admissions retain append-only event evidence. Event and inactive-key retention remain explicit operational carryovers. Saved responses still survive rank lookup failure.

A server-only Turbopack loader aliases byte-identical retained JSON modules and tracks live artifact dependency changes. Actual emitted server payloads measure three copies and 2,088,694 JSON bytes, compared with the earlier measured eight copies and 5,144,396 bytes. All five actual emitted retained replay hashes match. Frozen source data is unchanged.

Local focused tests passed 67 in eight files. Full units passed 1,044 in 119 files. Lint, typecheck, build, mirrors, image seams and packs, client bundle, theme contrast, colors, CVD, and migration generation passed. A new isolated PostgreSQL 16 cluster passed four races of 24 independent backend processes, admitting 10, zero, 10, and one attempts. It stopped cleanly. Browser Share and engine checks passed 23 cases, while three unchanged data-split guards exposed an eager species import through the UI chemistry label registry. The UI dispatch owns that correction. Final rebase and complete exact-head gates remain pending.

Independent review, CI, merge, production migration, and production verification are NOT RUN by this acceptance lane. Migration and deployment require paused gate and leaderboard admission so old and new writers cannot overlap. See `docs/decisions/platform-infrastructure-completion.md`.

### Infrastructure final exact-head gates

Branch `feat/platform-infrastructure-completion` was rebased onto release squash `88dcbaef39b0aebc0f917f5127b666d711b657ce` from the UI boundary `40723142cd9bdea99b16bbc4ece93de407a2f2c0`. The rebased diff is byte-identical to the pre-rebase stack diff. On source head `6b9e9e4118d0f20c93692b76fc55b69c60e56de8`, the serialized gates passed: mirrors, image seam and packs, theme contrast, colors and CVD, lint, typecheck, 1,048 unit tests in 119 files with four workers, production build, client bundle, and migration generation with no schema changes. Regenerated `src/data` has no diff and review move citations report 0 not learnable. Forty-two fresh Chromium cases passed in 57.6 seconds across data split, engine 4, share, health, images, pitch regressions, history controls, leaderboard, and old links. The emitted server retains three JSON payloads totaling 2,088,694 bytes and all five retained replay hashes pass. Frozen versions and current data have no diff against the UI release. Independent review, hosted CI, Preview application HTTP proof, and the production cutover are recorded in the PR and below once run.

### Platform preview database receipt

On source head `aa6715b`, the existing Neon `preview` branch `br-rough-bird-b79ahwsx` passed migration and admission SQL verification. The unchanged migration runner completed twice, with four journal rows and latest migration timestamp `1792066817368`. Six transactional admissions matched first/second allowed, third refused, inclusive cutoff refused, expired allowed, and independent gate allowed. Four evidence events and two task buckets existed before rollback; separate readback then confirmed zero entries, zero events, zero buckets, and four migration rows. The direct endpoint and commands are recorded in the dispatch decision. Production migration and application HTTP verification remain NOT RUN.

### Platform cutover routing controls

The cutover protocol now accounts for Fluid execution and stale deployment pins. Coordinator recon found Fluid enabled, a43,200-second skew window, null fixed threshold, and no rolling release. The planned cutover retains a production-only host rule denying admission POSTs outside current stable aliases, temporarily denies both admission paths on all production hosts, drains for at least300seconds and the effectiveoldfunctionmax, migrates and promotes under pause, then sets the threshold to the new deployment creation timestamp. Canonical health with old deployment query/header/cookie pins must return the newSHA or reject; old immutable POST hosts must remain denied, including authenticated access. Restore the previous threshold under a verified pause during rollback. These production controls and checks are NOT RUN by this documentation lane. See the dispatch decision for official sources, ordering, and rollback details.

### Infrastructure local integration acceptance

The third dispatch was locally rebased onto UI candidate `0c7ff856dc6dcb8fa3988cacb5009de363b2c981`. Integration source `190f690eb864f0a0a56d4bbf53a7ccefe1185fa9` passed 67 focused tests in eight files and 1,046 full units in 119 files. Lint, typecheck, build, all image, theme, mirror, and client guards passed. Migration generation reported no changes. The actual emitted server retains three payloads totaling 2,088,694 bytes, with all five retained replay hashes matching. Fresh port 3416 Chromium data-split, engine 4, and Share browser selection passed 26 cases, superseding the earlier import failure checkpoint. Frozen versions and current data have no diff against the UI candidate. The final rebase onto the UI main merge and independent review remain pending. The cutover protocol also requires zero active admission table queries through aggregate-only `pg_stat_activity` after the function drain and before migration. This production check is NOT RUN.

### Infrastructure integration onto the release stack

Local integration source `0eeaccf4fec41f642978b997222b8a342c6cfdc8` includes PR #52 candidate `50af55aa40272ec37e2783be4e2f8b7375093f29` on first-release squash `6218750ea2c9896e469b1496d5d20691b4b78d6f`. The first release's inherited receipt records exact live health and 21 production browser checks, with no production database schema change. This integration passed 67 focused tests, 1,046 unit tests in 119 files with four workers, and 31 fresh Chromium checks including lazy data, engine, Share, health, and images. The first concurrent unit attempt had one failure and 1,045 passes; that unchanged file passed six tests in isolation before the full serialized run passed. Static gates, build, migration generation, three emitted data payloads, and all five compiled retained replay hashes passed. Logs preserve each attempt. The rollback protocol now restores a prior null skew threshold as documented integer zero, preserving the unbounded eligibility floor and verifying readback under pause. Production infrastructure actions remain NOT RUN. The final rebase onto the second dispatch's main squash, exact-head review, and hosted CI remain pending.
