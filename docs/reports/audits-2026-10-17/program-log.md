# Program log

One entry per finished wave: PRs merged, production SHA, measurements that moved, open
carryovers. The brief is `pokedraft-implementation-prompt-2026-10-17.md` in this folder.

## Program start

`origin/main` and production both at `f4489cb` (PR #69), engine 6, token versions 1 to 6,
`/api/health?db=1` reports `db.status` ok.

## Wave 1. Truth pass

All twelve program rows (1a to 1l) merged, one PR each, each live-checked on production before
the next began. The table also lists the audits archive (#71), which has no route to check.
Production serves `4173b94` (PR #86), engine 6, token versions 1 to 6, `db.status` ok.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| Audits archive | #71 | `65cc88b` | `a3f04cf` | GLM APPROVE, round 2 | n/a (docs) |
| 1a one timeline | #72 | `b2f2d49` | `667ad76` | GLM APPROVE, round 1 | `one-shared-timeline` 1 of 1 |
| 1b honest momentum | #73 | `b72ac5a` | `ac3f545` | GLM APPROVE, round 1 | `honest-momentum` 1 of 1 |
| 1c score lands with the ball | #74 | `b8e5c2c` | `8395f24` | GLM APPROVE, round 1 | `score-lands-with-ball` 1 of 1 |
| 1d injury staging | #75 | `09fcdae` | `aa007c4` | GLM APPROVE, round 1 | `injury-staging` 1 of 1 |
| 1e speed-aware staging | #77 | `e449555` | `0a91bd9` | GLM APPROVE, round 1 | `speed-aware-staging` 1 of 1 |
| 1f Quick is not a broadcast | #78 | `c87509f` | `27659c6` | GLM APPROVE, round 2 | `quick-not-broadcast` 1 of 1 |
| 1g mobile pitch fixes | #79 | `90aba39` | `5cac7ce` | GLM APPROVE, round 2 | `mobile-pitch-fixes` 4 of 4 |
| 1h highlights honesty | #81 | `68f37c9` | `b1f6f8e` | GLM APPROVE, round 1 | `highlights-honesty` 1 of 1 |
| 1k security and integrity | #83 | `b7f28d6` | `8307dbe` | GLM APPROVE (rerun: first reply mistyped its canary) | gate and API probes, `leaderboard` 2 of 2 |
| 1i draft safety | #84 | `63c9d36` | `7d9c485` | GLM APPROVE, round 2 | `draft-safety` 9 of 9 |
| 1j builder matchday | #85 | `badda9f` | `d66ba81` | GLM APPROVE, round 2 | `builder-matchday`, `settings-confirm`, `quick-not-broadcast` 15 of 15 |
| 1l retained JSON dedupe | #86 | `4173b94` | `0054190` | GLM APPROVE, round 1 | `old-links`, `engine-v4` 4 of 4; CI measure 4 copies |

Side PRs outside the table: #76 (webkit wheel skip flake, `cd6c50e`), #80 (two unit flakes,
`9d37864`), #82 (e2e in eight CI shards, `754d838`).

Order: 1k moved ahead of 1i and 1j once #71 had made the audits public, with the owner's leave to
choose the order. All reviews were GLM 5.3 Flash with an echoed canary; no fallback reviewer ran.

### Measurements that moved

- Server build retained JSON: 8 payloads and 5,784,409 bytes to 4 and 2,891,853 (1l), now asserted
  in CI.
- Hosted e2e critical path: about 31 min (28.6 min test step, PR #80) to a slowest shard of 8.4 min
  with eight shards (#82). Playwright splits by test count, so shard times ranged 3.0 to 8.4 min.
- 1a: typed ability SFX now play; the production check heard 13 typed tones.
- 1j: a formation picked during hydration on an 8x throttled phone was lost 6 of 6 times on the
  first 1j head and 0 of 6 on `main`; fixed before merge, guarded in `settings-confirm.spec.ts`.
- Neon cold start: one sample, 0.90 s cold and 0.16 s warm, against the new 4 s query budget (1k).

### Brief vs code

- 1a: the Fire guard already passed; the defect was that `MatchPlayer` never passed movesets.
- 1d: the cause was a tie in `activeBeat`.
- 1i: the sticky guard needs a spacer to measure; the drawer is a centred pop-up since #69. Only
  `body` had `overflow-x: hidden`.
- 1j: the player path is the home friendly in `HomeScreen`; `/play` never runs a builder cup.
- 1k: a bad unlock body answers 303 back to the gate, and `rankOf` takes the coach view.
- 1l: the measured saving is 2,892,556 bytes (5,784,409 to 2,891,853), not the audit's estimate.

### Open carryovers

- The 1d ticker shows the assistant's sub line during the manager injury stop.
- 1e: toggling speed mid-beat jumps the staging.
- `score-lands-with-ball.spec.ts` polls the goal flash the way the fixed `speed-aware-staging`
  spec used to (watch).
- 320px scoreboard word break; short trail on a missed penalty; wheel skip loses focus (a11y).
- Early 390px screenshots predate the two-row HUD.
- `Builder.test.tsx` flaked once on `main` (run 39080199806), a lazy-import race like #80's.
- `check-retained-replays` covers v1 to v4 only and is not in CI.
- A real IPv6 client and a real hung Neon query were not exercised (1k).
- A physical phone check was not run for any row (owner action).
- Process: #72 was rebased and force-pushed once, against the repo rule; merges since use
  `git merge origin/main` only.
- The audits went public in #71 before the 1k fixes shipped (now in production) and before row
  5f, which stays open until Wave 5.

## Wave 2. The broadcast feels like football

All eight rows merged, one PR each, each live-checked on production. Production serves `87e7d51`
(PR #96), engine 6, token versions 1 to 6, `db.status` ok.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 2h audio polish | #88 | `e7f2012` | `f46ef6c` | GLM APPROVE, round 1 | `audio-polish` 2 of 2 |
| 2g callouts and type effects | #89 | `ae8ee22` | `60dc61d` | GLM APPROVE (rerun: first reply's verdict line did not parse) | `callouts-type-effects` 4 of 4 |
| 2b continuous ball | #90 | `458c56e` | `18c0fb0` | GLM APPROVE, round 2 | `continuous-ball`, `callouts-type-effects` 5 of 5 |
| 2a frame loop | #91 | `e3d0e95` | `b420c85` | GLM APPROVE, round 1 | `broadcast-frame-loop` and three matchday specs 9 of 9 |
| 2e shootout with suspense | #92 | `85b292e` | `5b2229a` | GLM APPROVE (rerun: verdict line did not parse) | `shootout-suspense`, `continuous-ball` 2 of 2 |
| 2d set pieces | #93 | `20fe868` | `fc9bae8` | GLM APPROVE (rerun: verdict line did not parse) | `set-pieces`, `continuous-ball` 5 of 5 |
| 2c smooth movement | #94 | `ebb04f0` | `daeb1c3` | GLM APPROVE, round 1 | `smooth-movement`, `continuous-ball`, `set-pieces` 7 of 7 |
| 2f fatigue on the pitch | #96 | `87e7d51` | `2d67b2e` | GLM APPROVE, round 1 | `fatigue`, `continuous-ball` 2 of 2 |

Side PR outside the table: #95 (review packet asks for the verdict alone on its own line,
`2b2bb0f`). All reviews were GLM 5.3 Flash with an echoed canary; no fallback reviewer ran.

Order: 2h first, then 2g and 2b, which every later row builds on. 2a landed after 2b so the per-frame
painter was written against `stageFrame` once. 2e landed before 2a's last merge, 2d before 2c, and 2f
was built on 2c's branch and opened only after 2c merged, with the owner's leave to choose the order.

### Measurements that moved

- 2b: largest one-frame ball move on the golden cup at 1x, 78.0% to 3.87%. Browser spec, fastest
  100 ms speed per 60 Hz frame: 9.00 on the old build, 2.68 to 2.70 since.
- 2c: largest one-frame player move per golden match at 1x, 6.28 to 35.08% before, 3.01 to 4.94% after
  (the 4.94 is 2b's save settle). Teammates closer than 4%: 31.9% of sampled open-play frames to
  7.4%.
- 2a: at 390x844 and 4x CPU throttle, DOM mutations about 2,207 to 1,164 per second, main-thread task
  time 3,022 to 2,824 ms per 10 s (second batch 4,167 to 3,764), React commits 62 to 12 in 62 frames.
  Style recalc rose, 257 to 484 ms per 10 s. p50 and p95 frame interval unchanged at 16.7 ms, no
  dropped frames either side.
- 2g: open-play callouts per match, mean 54.83 to 13.81 (median 55 to 14, max 61 to 18).
- 2h: kick thuds over phases 0 to 16 of the pinned audio match, 6 to 5; Watch live now unlocks audio
  before the broadcast opens.
- 2d: every goal kind is staged from the engine's `goalKind`; worst ball move inside any goal staging
  over 200 extra viewings 3.67% (solo).
- 2f: tired players (energy under 65) cover 0.85 of each move; no golden match goes under 65, so the
  proof is a pinned builder run.

### Brief vs code

- 2a: the brief said React already ticked at about 10 Hz; it rendered every frame (62 commits in 62
  frames). The single rAF stays in `MatchPlayer` and `Broadcast` subscribes to it.
- 2b: the browser's one-frame bound failed on a hosted runner (9.82%) from late renders, not
  teleports; the spec measures over 100 ms windows and the 4% bound stays in the unit test.
- 2c and 2f: open play is a Catmull-Rom spline, so the 0.85 slows waypoints, not a lerp. The 4%
  spacing is pinned at a sampled moment, not every frame.
- 2d: the solo goal beats the outfield player nearest the run, not the phase's presser, who can stand
  behind the scorer. Row 2b's log said no golden goal was a free kick; that holds for cup8 only.
- 2e: sudden death starts at kick 11 (`ENGINE_COEFFICIENTS.shootout.kicks` 5 a side). The engine
  records only `scored`, so every miss is staged as a save while the ticker still says "misses".
- 2f: `StageInput` takes every window snapshot, not the latest, so the past path does not jump when a
  window closes.

### Open carryovers

- At 2x speed a player can still move 9.85% and the ball 8.84% in one frame; no guard covers 2x.
- Over 20 extra seeds the ball's worst open-play frame is 4.41% (duel turnovers), above the 4%
  golden-cup bound.
- 2a: style recalc cost is unexplained; pose and facing update at the 10 Hz floor; the perf harness
  was not rerun after the 2e and later merges.
- 2c re-pinned 2a's frame-loop positions from its own staging.
- 2e: pausing mid-kick lets the kick play out and resume starts the next at once (predates the row).
- 2g: extra-time matches get about 20 callouts; badges clip at the pitch edge; reduced motion shows
  no key-duel cards.
- 2h: the crowd needs an unlock again after a reload; reduced motion keeps the crowd level constant.
- 2f: the pip and arc are small at 390; the extra waypoint work is unmeasured; the proof depends on a
  builder token valid on engine 6.
- Flake: `MatchPlayer.quick.test.tsx` ("Quick shows no cut-in through the 30' goal", about 1.9 s
  locally) hit the 15 s limit once on a hosted runner (#92); the failed job was rerun.
- GLM put its verdict on a line with other text three times (#89, #92, #93); #95 asks for it alone,
  and the replies since have parsed (#94, #95, #96).
- A physical phone check and on-device sound were not run for any row (owner action).
- Process: on #94 a push went out while a merge had stopped on a conflict (a pipe hid the exit code);
  it was resolved in the next commit with no force-push.

## Wave 3. Matchday on a phone

All twelve rows (3-0, 3a to 3k) and the test chore merged, one PR each, each live-checked on
production before the next landed. Production serves `88f6f72` (PR #111), engine 6, token versions
1 to 6, `db.status` ok.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 3f prematch merge | #98 | `b08c68c` | `8789a50` | GLM APPROVE, round 1 | `prematch-merge`, `manager-mode` 12 of 12 |
| 3-0 motion bounds | #99 | `39a3a6a` | `d86e58b` | GLM APPROVE, round 1 | `continuous-ball`, `smooth-movement` 4 of 4 |
| Chore: test flakes, retained replays | #100 | `20e34f6` | `3432861` | GLM APPROVE, round 1 | `fatigue`, `callouts-type-effects` 5 of 5 |
| 3h "Your calls" card | #101 | `c33fa17` | `2df3889` | GLM APPROVE, round 1 | `your-calls`, `manager-mode` 8 of 8 |
| 3a touchline bottom sheet | #102 | `02e45cd` | `72063d0` | GLM APPROVE, round 1 | `touchline-sheet`, `shootout-suspense` 9 of 9 |
| 3d team readability | #104 | `40221a8` | `d656db7` | GLM APPROVE, round 1 | `team-readability`, `pitch-card-containment` 19 of 19 |
| 3b follow camera | #106 | `1e417e3` | `7e8b503` | GLM APPROVE, round 2 | `follow-camera`, `mobile-pitch-fixes`, `broadcast-frame-loop` 11 of 11 |
| 3e haptics and tap for sound | #107 | `8247f20` | `f729d11` | GLM APPROVE, round 1 | `haptics`, `audio-polish` 5 of 5 |
| 3c landscape, full screen, score bug | #108 | `b9c9113` | `4bc15fd` | GLM APPROVE, round 1 | `fullscreen-score-bug`, `touchline-sheet` 12 of 12 |
| 3k broadcast follow-ups | #110 | `cf4efeb` | `2952e09` | GLM APPROVE, round 1 | `broadcast-follow-ups`, `score-lands-with-ball`, `callouts-type-effects` 6 of 6 |
| 3i replay and deep links | #109 | `eef865e` | `46d7641` | GLM APPROVE, round 2 | `replay-deep-links`, `haptics` 8 of 8 |
| 3g touchline intelligence | #103 | `6fb14b7` | `834cfea` | GLM APPROVE, round 1 | `touchline-intel`, `manager-mode` 13 of 13 |
| 3j accessible stops and controls | #111 | `88f6f72` | `98f81a2` | GLM APPROVE, round 1 | `keyboard`, `speed-aware-staging`, `a11y` 30 of 30 |

Closed without merging: #105 (mute e2e browser audio, Green). GLM approved it, but specs that call
`webkit.launch()` inherit the chromium project's launch args and WebKit rejects `--mute-audio`
(run 39170166703); Playwright 1.64.0 already mutes headless Chromium. All reviews were GLM 5.3 Flash
with an echoed canary; no fallback reviewer ran. Both round-2 reviews followed a hosted failure on
an approved head, not a review finding: #106's shard 2 failed `mobile-pitch-fixes` under the new
phone zoom, and #109's check timed out four haptics unit tests twice.

Order: 3f first to simplify the stop flow, then 3-0. 3h landed before 3a because it was ready first
and shares no files. 3g waited on an owner decision (below) and landed after 3i. 3k landed before
3i because it carried the haptics test fix that 3i's hosted check kept tripping. 3j last, since it
touches controls from 3a, 3c and 3i. Every reorder was within the owner's leave and is recorded in
the row's decision log.

### Measurements that moved

- 3-0: largest one-frame ball move per golden match at 2x, 5.62 to 8.84% before, 5.09 to 6.77% after;
  player at 2x, 9.85% worst to 6.26%. Over the 20 sweep seeds the worst 1x ball frame went 4.41%
  (six views at or over 4%) to 3.97% (none).
- 3d: move badges clipped at the pitch edge, 5 to 7 of 13 per golden match (up to 65.1 px) at 390,
  360 and 320, to none; phone sprites 38.4 to 44 px.
- 3b: at 4x CPU throttle, p50 and p95 frame time 16.7 and 16.8 ms with and without the camera, no
  dropped frames or long tasks. Under Follow's 1.6x zoom the ball's worst on-screen frame is 4.91%,
  against the 4% bound that 3-0 holds on the unzoomed pitch.
- 3k: callouts per 120' match over 108 cups, mean 17.32 (max 23) to 13.34 (max 20); 90' matches
  unchanged at 13.54. `MatchPlayer.haptics.test.tsx` 15.5 s to 2.9 s per file.
- 3j: a 2x toggle 301 ms into a goal callout used to cut it to 665 ms; it now runs 1,133 ms against
  1,125 predicted.
- 3h: the "Your calls" card's 8 replays take 254 to 300 ms at 4x CPU throttle, no long task.
- 3c: on a phone turned to landscape (844x390) the pitch is 427 by 273 px; at 320x640 the match now
  opens with the pitch wholly on screen (it sat 41 px above the screen after 3b and 3c composed).
- Unit tests, 1,506 in 172 files at 3-0's head to 1,659 in 194 at 3j's.

### Brief vs code

- 3g: the 65' managed stop cannot appear in engine 6. The lowest STA in the pool is 19 and the
  lowest energy at 65' is 67. The owner chose to ship it as written (2026-10-18) and revisit at W6b.
- 3g: engine 6 gates the auto tactic and fatigue subs on one `managed` flag, so the assistant status
  reads "subs on, tactics on" until a decision and "subs off, tactics off" after.
- 3i: the deep-link minute is `at`, not `t` (`t` already carries the run). There was no event bar,
  so goal pips sit on the progress bar.
- 3j: the code map's lines had moved (momentum at `MatchPlayer.tsx:557`, not `:416`); `speed` had
  no `now`; every fired beat is rebased, not only those in flight, which reads the same on screen.
- 3k: `speed-aware-staging` does not control the clock; it waits on a `MutationObserver` log, and
  `score-lands-with-ball` now does the same. The missed-penalty short trail no longer reproduces:
  all 87 misses over 108 cups trail 9.43, all 294 goals 11.18.
- 3c: the 70svh pitch cap also applies on a desktop: at 1280x720 the pitch is 787.5 px wide, not
  1,214.
- Rows built in parallel and merged in turn. 3g was cut from 3a's branch before 3a's squash, so its
  first merge with main re-merged six files against 3a's branch tip, where they equal the squash.

### Open carryovers

- Follow camera: the ball's worst on-screen frame is 4.91% under the 1.6x zoom, unguarded. Watch for
  it on the phone; the fix is a smaller zoom or a gentler pass speed.
- The cut-in card's sprite can render empty: `PlayerImage`'s inline 80 px box beats
  `.cutInSprite > *`, so a small pixel sprite (Remoraid) shows nothing in the circle (since 2g).
- The ball carrier's nameplate is clipped at the pitch's left edge (seen in the refreshed
  `touchline-stop-360.png`); 3d clamps badges, not nameplates.
- At 1280x720 the full-screen exit button overlaps the pitch's top right corner.
- One 120' match still draws 20 callouts (d5, 4-3-3, match 3); 11 are key duels, outside the budget
  by 2g's design.
- 3i: in manager mode a goal on a stop minute replays after the stop is answered (code reading
  only). The diff ran to about 1,413 insertions in one PR.
- 3j: axe finds three touchline violations that predate the wave (`aria-allowed-role` on the energy
  rows, `list`, `heading-order`); the matchday scan excludes the touchline until Wave 4 (4g). After
  Kick off a keyboard user lands on the body, so Space needs a click or Tab into the player first.
- Engine 7 (W6b) checklist: the 65' stop decision; seed `e2e-a11y-47` (an injury at 16' in match 0)
  behind the keyboard and axe scenes; `e2e/pins.ts`'s deep link (the golden v5 draft's 49' goal).
- A physical phone check and on-device sound and haptics were not run for any row (owner action;
  the checklist is in the Wave 3 summary's decision log).

## Wave 4. The first five minutes

All twelve rows (4-0, 4a to 4j, with 4h split into 4h1 and 4h2) merged, one PR each, each
live-checked on production before the next landed. Production serves `b4f8ca7` (PR #123), engine 6,
token versions 1 to 6, `db.status` ok. No file under `src/engine`, `src/data` or `src/scouting`
changed in the wave, and the engine goldens are untouched.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 4-0 matchday carryovers | #113 | `124afab` | `54619a0` | GLM APPROVE, round 1 | `matchday-carryovers`, `keyboard`, `touchline-sheet`, `fullscreen-score-bug` 28 of 28, `a11y` 22 of 22 |
| 4e copy pass and dash lint | #114 | `d48aa0f` | `1d05a87` | GLM APPROVE, round 1 (after one fix round) | 18 of 18 |
| 4a one-tap play | #115 | `fb03b7a` | `e2bf503` | GLM APPROVE, round 1 | 21 of 21 |
| 4c live Team Score | #116 | `63462b3` | `ef1244a` | GLM APPROVE, round 1 | 31 of 31 |
| 4b home hierarchy | #117 | `337f9df` | `40779df` | GLM APPROVE, round 1 | 20 of 20 |
| 4f dossier and picker | #118 | `168a8f3` | `93dfb66` | GLM APPROVE, round 1 | 25 of 25 |
| 4d fast spins | #119 | `da44d4b` | `96acb86` | GLM APPROVE, round 1 | 15 of 15 |
| 4j pitch density and drag | #120 | `3d59cee` | `f3d112e` | GLM APPROVE, round 1 | 39 passed, 2 skipped by project gate |
| 4h1 colour tokens and CVD | #121 | `ff7c893` | `00a2d81` | GLM APPROVE, round 1 | `team-readability`, `contrast`, `theme-draft`, `theme-builder` 47 of 47 |
| 4g resilience, onboarding, a11y | #122 | `5c7d4fb` | `c0bcd07` | GLM APPROVE, round 1 | `resilience-a11y`, `wheel-results`, `server-html`, `a11y`, `theme-choice` 41 of 41 |
| 4h2 dark palette and breakpoints | #124 | `6e0a34a` | `4f01365` | GLM APPROVE, round 1 | `theme-breakpoints`, `theme-choice`, `home-hierarchy`, `contrast` 70 of 70 |
| 4i PWA and viewport | #123 | `b4f8ca7` | `e9cbbdc` | GLM APPROVE, round 1 | `pwa-viewport`, `theme-breakpoints`, `mobile-acceptance` 38 of 38, plus a cookieless 200 on the manifest and icons |

All reviews were GLM 5.3 Flash with an echoed per-head canary; no fallback reviewer ran. Every merge
had all eight e2e shards and the hosted check green on the first run. Production checks ran on
chromium against `https://pokedraft-woad.vercel.app`. 4e's fix round came from the coordinator's
read of the diff, not a review finding: the shared replay still said "Your XI" and "Your side". The
other "after merge" heads (#115, #116, #119, #120, #122, #123) are merges of `origin/main` into the
branch after the previous landing; #117 and #118 carry a STATE-only commit adding the previous PR's
merged paragraph.

Order: the hand-off's order, with four swaps inside the owner's leave, each recorded in the
coordinator notes. 4c landed before 4b and 4f before 4d, because each was ready first and the files
were disjoint. In the platform lane 4h1 was built beside 4g (disjoint: 4h1 kept off the theme boot
script, layout and toggle) and landed first; 4h2, which relies on 4g's boot script, landed after
it. 4i was built beside 4h2 and landed after it, as planned, so the manifest reads the final
palette. Building two platform rows at once broke the hand-off's "next in a lane only after the
previous merged" rule; the price was one expected merge per pair, both STATE-only conflicts.

### Measurements that moved

- 4d: a full 8-0 cup draft takes 29.8 s of spins instead of 77.7 s (47.9 s saved); a 151 draft
  saves 24.0 s. `SPIN_FAST_FACTOR = 0.4`.
- 4j: candidate drag script time at 4x CPU throttle 132 ms to 36 ms; phone sprites 48 px with a
  3 px top bar and one-line names.
- 4c: the provisional Team Score matches `rateTeam` exactly on a full XI; early picks swing (869 to
  240 on the second pick) by the decided formula.
- 4h1: 129 colour literal lines moved to 71 tokens; five type colours moved to clear the 4.01 CVD
  minimum, now enforced by `theme-cvd`.
- 4h2: 47 media query widths off the scale (in 43 queries) to none, on a 480, 720, 960 and 1200
  scale enforced by `check:breakpoints`. The home page is two columns from 960. 46 of 48 proof shots
  were pixel-identical across the final refactor commit.
- 4i: with a 47 px notch and a 34 px home bar at 390x844 the phone header grows 57 to 104 px, the
  page bottom gap 32 to 66 px, the draft toast top 8 to 55 px.
- `check:*` scripts, 7 to 9 (`check:dashes` in 4e, `check:breakpoints` in 4h2). Unit tests, 1,669
  in 196 files at 4-0's head to 1,805 in 214 at 4i's. Full local Playwright at 4i's branch head
  before its last merge: 972 passed, 67 skipped by project gates; at 4h2's: 998 passed, 67 skipped.

### Brief vs code

- 4a: the builder's Matchday setting already shared the panel state, so two controls bind one value.
- 4f: the engine's `place` action throws outside builder mode, so the draft dossier uses `pick`.
  Ability and move contributions need breakdowns in `scouting.json`, a Red data change, and were
  deferred.
- 4g: Next's media `themeColor` entries fought the boot script, so the boot script owns the one
  theme-color meta and always sets `data-theme`.
- 4h1: `MatchHighlights` is live, so it was tokenised, not removed.
- 4h2: the brief counted 11 ad-hoc breakpoints; the tree had 47 widths in 43 queries, including 4b's
  379 px card rule and a camera `matchMedia` string. The hard-coded dark gradients the code map
  placed in `MatchHighlights` and `Broadcast` already read tokens. The full suite found that Next's
  notFound shell renders the layout on the client without the boot script; the deleted
  `prefers-color-scheme` copies had hidden it, and the theme now also boots on mount.
- 4i: at 480 px and below the header is a fixed 57 px row, so the general inset rule never reached
  phones; the phone rule now adds the inset too. Chromium's CDP safe-area override works, so the
  guards assert real computed values. There is no `public/favicon.ico`.

### Open carryovers

- "Goal for This squad!" capitalises "This" on the shared replay (4e).
- The draft drawer swipe and the builder picker swipe still set React state on every move (4j).
- `Wheel.tsx:57` and `BossRoster.tsx:56` keep picture alt text that repeats the visible name (4g).
- Dossier ability and move contributions wait on a Red data change (4f).
- Landscape side insets are not handled, and the home footer adds the bottom inset on top of the
  page's (about 34 px of extra space on a notched phone, `/` only) (4i).
- 4h2's two 4 px frame-noise diffs inside the frozen broadcast frame were not traced.
- A few rules once scoped under 360 or 420 px now apply to every phone under 480 (4h2, intended).
- Engine 7 (W6b) checklist from Wave 3 stands unchanged.
- A physical phone check, Add to Home Screen, on-device sound and a real screen reader were not run
  for any row (owner action; the checklist is in the Wave 4 summary's decision log).

## Wave 5. Social loop and leaderboard

All eleven rows (5-0, 5a, 5b, 5c1, 5c2, 5d, 5e, 5f1, 5f2, 5g, 5h) merged, one PR each, each
live-checked on production before the next landed, plus three side PRs. Production serves `e1f2c38`
(PR #139), engine 6, token versions 1 to 6, `db.status` ok. No file under `src/engine`, `src/data`
or `src/scouting` changed in the wave, and the engine goldens are untouched. Wave 5 is the first
wave since dispatch 5 to change the production schema (migrations 0004 and 0005).

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 5f1 fingerprint and coached columns, expand (Red) | #126 | `3b821d1` | `ce1ad25` | GLM APPROVE (round 1 at `ba48f46`, again at `ce1ad25`) and Red reviewer PASS | real-API smoke 201 then 200; `leaderboard`, `leaderboard-date`, `theme-board` 17 of 17 |
| Health cron (side, Green) | #128 | `32d0b69` | `c6f3f68` | GLM APPROVE, round 1 | first workflow run succeeded |
| 5-0 Wave 4 carryovers and queue triage | #127 | `ef542fb` | `246ade2` | GLM APPROVE, round 1 | 24 of 24 |
| Health cron removed (side, Green) | #130 | `f27f17c` | `8e6a39c` | GLM APPROVE, round 1 | health served `f27f17c`; workflow gone |
| 5f2 integrity contract and copy guard (Red) | #129 | `07beda9` | `1039845` | GLM APPROVE, round 2 (round 1 a load flake) and Red reviewer PASS | real-API smoke 201, 200, 409 `DUPLICATE_TOKEN`; 18 of 18 |
| 5a share sheet, card prefetch, run metadata | #131 | `71a86ec` | `53bd08c` | GLM APPROVE, round 1 | 30 with one retry, then `share-sheet` 27 of 27 at `--repeat-each=3` |
| 5b head-to-head challenges | #132 | `9f01b8c` | `960539b` | GLM APPROVE, round 1 | 16 of 16 |
| Badge loop budget (side, Green) | #135 | `36ac415` | `c896ac8` | GLM APPROVE, round 1 | `team-readability` 7 of 7 |
| 5e results reveal and sync | #134 | `afaa695` | `32b082c` | GLM APPROVE, round 1 at `cbd0ba3` and again at `32b082c` | 28 of 28 |
| 5g seed boards and engine filter (Red) | #133 | `783ddbf` | `5cf4f47` | round 2: GLM APPROVE and Red reviewer PASS (round 1 voided by a CI layout failure) | API checks below; 26 of 26 |
| 5h achievements | #136 | `fc657f4` | `2306816` | GLM APPROVE, round 1 | 38 of 38, including a real `/card` render |
| 5d board UX | #137 | `54c6a58` | `d4ff01a` | GLM APPROVE, round 1 | 38 of 38 |
| 5c1 exhibition route, picker, entry points | #138 | `aeb66b6` | `1b2c8dd` | GLM APPROVE, round 1 | 24 of 24 |
| 5c2 exhibitions on the Broadcast | #139 | `e1f2c38` | `997d93a` | GLM APPROVE, round 1 | 21 of 21 |

All reviews were GLM 5.3 Flash with an echoed per-head canary; no fallback reviewer ran. The Red
rows (5f1, 5f2, 5g) also carry the new second receipt: a fresh `pokedraft-mode` subagent with no
implementer context re-executed the gates, the PGlite tests and the preview database steps at the
same head, and both receipts named that head before the merge. Production checks ran on chromium
against `https://pokedraft-woad.vercel.app`.

Order: the hand-off listed 5-0, 5f1, 5f2, 5g, 5a, 5d, 5b, 5c1, 5c2, 5e, 5h. The landed order was
5f1, 5-0, 5f2, 5a, 5b, 5e, 5g, 5h, 5d, 5c1, 5c2. Each swap landed a row that was ready while the one
ahead of it was still building or in review, with disjoint files, as the hand-off allows. 5f1 went
before 5-0 because the Red lane is the critical path. 5a, 5b and 5e went before 5g, which was still
building and needed two receipts and its database steps; 5b and 5e share only one mount line each
with 5g in the results views. 5h went before 5d because 5h was ready while 5d waited for 5g's
`formation` field. 5c1 and 5c2 came last, as planned. The health cron landed as a side PR and was
removed the same day at the owner's request (#130).

### Hosted CI failures treated as real

- 5e's head failed shard e2e (4) twice (attempt and a rerun of the failed job): the whole-match play
  badge test hit its 240 s timeout. Per hand-off 3.5 it got its own PR first (#135): two browser
  round trips per clock step instead of three, an assertion that the loop reaches minute 90, and a
  480 s budget. Hosted time per width went from 3.1 to 3.3 minutes to 2.7 (2.8 with 5e).
- 5g's head failed shard e2e (3): the seed table was 3 px wider than its wrapper at 320 px on the
  runner's Linux fonts, which local macOS runs could not show (3 px to spare). Cell and tag padding
  dropped and both receipts were rerun at the fix head. Every later brief required 12 px of
  headroom at 320 px and a measurement at 308 px.
- Merging 5g's seed board into results pages made two console-checking specs (5e's reveal, 5h's
  achievements) see the board's 503 from the database-less local server. Both stub the board now,
  as `seed-board.spec.ts` does.

### Database receipts

- Migrations: 4 before the wave, 6 after (0004 `run_fingerprint_coached`, 0005
  `leaderboard_integrity`). Each was proved on the Neon preview branch (migrate, smoke, rollback,
  migrate) by the coordinator and again by the Red reviewer before production.
- Restore points created from production before each migration:
  `pre-0004_run_fingerprint_coached` (`br-snowy-surf-b7yk5m7w`) and
  `pre-0005_leaderboard_integrity` (`br-noisy-bread-b7gzc2s4`).
- 5f1 backfill on production: 3 rows updated (2 `pd3`, 1 `pd6`, all `coached` false), a second run
  0; afterwards 0 NULLs and 0 duplicate `(mode, run_fingerprint)` groups. The backfill script was
  deleted in 5f2.
- 5f2: both columns NOT NULL, `leaderboard_entries_fingerprint_uq` and
  `leaderboard_entries_coached_board_idx` present, 3 entries unchanged.
- Real-API smokes wrote one row each (`0402517c` in 5f1, `ee1af1e3` in 5f2); `db:delete-entry`
  removed exactly those rows. Production ends the wave with 3 entries.
- 5g needed no migration. Production read-only checks after merge: the all-time default returned
  1 engine 6 row, `engine=all` 3 rows (adding two engine 3 rows), the 16 October daily seed its
  engine 6 row, an empty seed 400 `INVALID_QUERY`.

### Measurements that moved

- Unit tests, 1,805 in 214 files at the Wave 4 summary to 1,998 in 229 at 5c2's head. `check:*`
  scripts stay at 9. Full local Playwright at 5c2's branch head: 1,077 passed, 67 skipped by
  project gates, 0 failed.
- Play badge test on hosted runners, 3.1 to 3.3 minutes per width to 2.7; locally 54.6 s to 35.0 s
  for the three widths with identical coverage (13 badges, closest margin 0 px, none clipped).
- Seed table minimum width, 254 to about 239 px (fits down to 306 px on macOS fonts).
- 5h Giant killer threshold, 150 to 100, by the hand-off's 2% to 20% rule: over 200 good-bot cups
  150 earned 1.0% and 100 earned 2.5%. Hat-trick hero is earned in 68.0% of those runs under its
  literal definition.
- Exhibition pins moved in 5c2 because subs and injuries are now on (one match 4-1 to 4-0); no
  stored or ranked data depends on them.

### Brief vs code

- 5-0: the home footer is the last block on `/`, so it keeps the bottom inset and the page drops
  its own; the body already padded the side insets, so they moved into `max()` gutters instead of
  being added twice.
- 5f1: `toBoardEntry` already decoded once per row (`decodeToken` 1 call, `JSON.parse` 2), so the
  guard spies on `JSON.parse`, 2 to 1.
- 5a: the nickname on the card was not shipped; `/?b=` previews moved to Wave 7.
- 5g: the 400 code is the existing `INVALID_QUERY`, not `BAD_QUERY`; an unplayed seed is 200 with
  no rows rather than 400 (a 400 would show "Board unavailable" on every fresh results page); the
  table sits after the squad card because the spec's position measured a CLS failure.
- 5h: the card chip never shows First Flawless or Every formation, because a card sees one run and
  cannot know it was the first; Giant killer counts any match won, Comeback excludes shootouts.
- 5d: row sprites keep their species-name alts (4g's decision), not `alt=""`.
- 5c1: `?ex=<a>.<b>.<n>` became named params (every token contains a dot); run tokens decode by
  walking their actions, so pd1 to pd5 links play on the client without replaying the draft.
- 5c2: the text replay is gone for both formats; two legs plays on the Broadcast without manager
  stops, and its extra time and penalties are described rather than drawn.
- Production has no `FRIENDS_PASSCODE` (checked 2026-10-19), so the 4.0 premise that `/api/*`
  answers 401 without the gate cookie does not hold. Server replay, the per-IP limits and the 5f2
  copy guard still apply. Reported to the owner.

### Open carryovers

- 5g: a misleading comment on the rank test in `seed-board.test.ts`; "This run" compares token
  strings, so a non-canonical link to the same run shows its row as a link; no `(mode, seed)` index
  (threshold recorded in `store.ts`).
- 5d: at 320 px the coach chips' labels touch their borders (not measured on main).
- 5c1: the empty state's Play and Builder links both go to `/`.
- 5c2: the touchline sheet's content reaches 310 px at 320 (10 px of headroom; existing Wave 3 UI).
- The Neon restore-point branches and the preview's `w5seed` rows remain; deleting them is the
  owner's call.
- Engine 7 (W6b) checklist from Wave 3 stands unchanged. Dossier ability and move contributions
  still wait on a Red data change.
- A physical phone check, on-device share sheet and a real screen reader were not run for any row
  (owner action; the checklist is in the Wave 5 summary's decision log).

### Wave 7 list additions

- `/?b=` link previews, from 5a.
- Credential rotation as a runbook row (owner item 2 in the Wave 5 summary).
- The WAF rate-limit rule on `/card` and `/r/*/opengraph-image`, applied by the agent after the
  `/card` canonical query (owner item 3).
- No scheduled health or uptime monitoring: removed at the owner's request (#130).
- The CI hygiene item (brief section 3, Wave 7) drops Dependabot. Dependabot runs on a schedule,
  and the owner wants no scheduled jobs on GitHub or locally (2026-10-20). The rest of the item
  stays: `format:check`, `timeout-minutes: 30`, SHA-pinned actions, Node matching production and
  the `postgres:16` migrate job, all on PRs and pushes only. Recorded by Wave 6 row 6-0.

## Wave 6. Engine 7

Every planned row except 6b7 merged, one PR each, each live-checked on production before the next
landed: sixteen PRs. 6b7 was never built because 6p's decision 10 prototype failed (P9 short by 7
points). Production serves `2f03113` (PR #156), engine 7 (`pokedraft-engine-7`), token versions 1
to 7, `db.status` ok. Engine 6 lives on as the frozen bundle that replays `pd6` links. No migration
ran in the wave.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 6p calibration probe and engine 6 baselines (Green) | #141 | `38b1bb4` | `b2c6eaf` | GLM APPROVE, round 1 | `health` 1 of 1 |
| 6-0 Wave 5 carryovers and queue hygiene (Yellow) | #143 | `eceb581` | `ef7b4c1` | GLM APPROVE, round 1 | 30 of 30 |
| 6a1 `matchStory` core (Red) | #142 | `969ca1c` | `2c5fddf` | GLM APPROVE and Red reviewer PASS | 19 of 19 |
| 6b0 freeze engine 6 (Red) | #144 | `8059458` | `243963a` | GLM APPROVE and Red reviewer PASS | 19 of 19 |
| 6t live-token pins (Green) | #145 | `2992500` | `19cac51` | GLM APPROVE, round 1 | 43 of 43 |
| 6g grace window and version plumbing, dormant (Red) | #146 | `7045ccd` | `242c169` | GLM APPROVE and Red reviewer PASS | 40 of 40 |
| 6a2 xG river on the Broadcast (Yellow) | #147 | `2551dce` | `d9eaba6` | GLM APPROVE, round 1 | 14 of 14 |
| 6b1 split managed, engine 7 scaffolding, dormant (Red) | #148 | `233be7e` | `4262f07` | GLM APPROVE and Red reviewer PASS | 26 of 26 |
| 6b2 tactic edges with state dependence, dormant (Red) | #149 | `6b7d40a` | `002ee80` | GLM APPROVE and Red reviewer PASS | 26 of 26 |
| 6b3 missable penalties and nominated takers, dormant (Red) | #150 | `cee1ad1` | `9487be0` | GLM APPROVE and Red reviewer PASS | 27 of 32 (the 5 failures are a test-harness glob defect, below) |
| 6b4 opponent injuries and rotation incidents, dormant (Red) | #151 | `f7448f9` | `7057871` | GLM APPROVE and Red reviewer PASS | 38 of 38 |
| 6b5 goal kind weighted by attributes, dormant (Red) | #152 | `5190287` | `999565b` | GLM APPROVE and Red reviewer PASS | 52 of 52, after a manual production deploy (below) |
| 6b6 shootout band, dormant (Red) | #153 | `6aad55b` | `f806b11` | GLM APPROVE and Red reviewer PASS | 53 of 53 |
| 6b8 engine 7 calibration, dormant (Red) | #154 | `d457e72` | `eaee2ba` | GLM APPROVE and Red reviewer PASS (Gemini lane) | 53 of 53 |
| 6b9 the flip to engine 7 (Red) | #155 | `e927608` | `943da02` | round 3: GLM APPROVE, Red reviewer PASS and cross-vendor review clean (both Gemini lanes) | production smoke 201 then 200, smoke row deleted; 92 of 92 |
| 6d dossier ability and move contributions (Red) | #156 | `2f03113` | `c69de5f` | round 3: GLM APPROVE and Red reviewer PASS (Gemini lane) | 63 of 63 |

GLM reviews were GLM 5.3 Flash with an echoed per-head canary. From 6a1 to 6b6 the Red reviewer was
a fresh `pokedraft-mode` subagent with no implementer context. From 6b8 on, by the owner's
decision to save Claude usage, the Red reviewer and the 6b9 cross-vendor review were Gemini 4 Argon
(High) lanes through the Antigravity CLI, with the project skills loaded. 6b9 had no Sol review:
the owner has no Sol usage. Production checks ran on chromium against
`https://pokedraft-woad.vercel.app`, with retries off from 6b4 on.

Order: the hand-off listed 6-0, 6p, 6a1, 6b0, 6a2, 6t, 6g, 6b1 to 6b7, 6b8, 6b9, 6d. The landed
order was 6p, 6-0, 6a1, 6b0, 6t, 6g, 6a2, 6b1 to 6b6, 6b8, 6b9, 6d. 6p went before 6-0 because it
was ready first and touches scripts and docs only. 6t and 6g went before 6a2 for the same reason,
with disjoint files. The fixed orderings held: 6a1 before 6b0, and nothing under `src/engine`
merged between 6b0 and 6b9 except 6g and 6b1 to 6b8.

### The flip

- 6b9 landed outside the hand-off's 00:00 to 01:59 New York window: the owner waived the window
  ("ignore the hand-off instructions here, just go ahead with the merge/cleanup when you get to it,
  the time does not matter"). Landing slipped past New York midnight, so `GRACE` moved to
  `flipDate` `2026-10-21`, `until` `2026-10-23T04:00:00Z`, with its tests shifted by one day.
- Production smoke on the 2026-10-21 Daily as `w6proof1021`: POST 201, GET 200. The existing `pd6`
  Daily row of 2026-10-16 rendered through the v6 bundle (2-1-1, Team Score 333).
  `db:delete-entry` removed exactly the smoke row (`6706ca94`).
- Goldens re-pinned in 6b9: `CUP8_TOKEN` and `KANTO_TOKEN` token and replay hashes moved, their
  outcomes (`[593, 5, 0, 1, "QF"]`, `[480, 3, 0, 1, "R32"]`) did not, and the 20-run panel did not
  move. The goal-kind panel (50 seeded cups, each goal compared with the same match at zero
  goal-kind weights) moved from 495 user goals, 63 of them a different kind, and 177 opponent goals,
  7 different, to 529 and 65, and 193 and 9; `moved` (goals at a different side or minute) stays 0.

### Engine 7 calibration (6b8, live since 6b9)

Calibrated V7 values: style edges scaled by 1.15, `penalty.awardShare` 0.0745, shootout ladder F
992, band 0.18.

| Pin | Result | Verdict |
| --- | --- | --- |
| P1 good | +1.07 [-0.77, +2.91] | fail under the P1/P2 conflict rule |
| P1 random | +3.41 | pass |
| P2 good | +4.21 | pass |
| P2 random | +9.59 | pass |
| P3 | 0.00 | pass |
| P4 | +18.31 (5,448 shootouts) | pass |
| P5 | 840 3.65%, 900 11.81%, 950 29.55% | pass |
| P6 | cup8-full good 5.912, kanto151 random 3.331 | pass |
| P7 | worst +0.046 | fail, recorded under fallback 4 |
| P8 | 68.78% | fail, recorded under fallback 4 (68.5% at engine 6) |
| P9 | not applicable | 6b7 does not exist |

Achievements under V7: Giant killer 2.5% (threshold unchanged at 100), Hat-trick hero 71.5%.

### Hosted and production failures

- 6g: the first hosted `check` job failed one test in `coach-mark.test.tsx`, a file 6g did not
  touch and which passed 3 of 3 locally. The failed job was rerun with no commit and passed.
- 6b3: 5 of the 32 live tests failed because `e2e/penalty-takers.spec.ts` routed
  `/_next/static/chunks/` while Vercel serves `/_next/static/immutable/chunks/`, so its rewrite
  never ran. A harness defect, not a production one; 6b4 fixed the spec and the live check passed
  38 of 38.
- 6b5: Vercel did not start a production build for the merge. After 15 minutes production still
  served `f7448f9`; the owner approved a Git-sourced production deployment of exactly `5190287`,
  and the live check then passed.

### Review lessons

- The Gemini lanes repeatedly reported false content: RED logs that were never printed, symbols
  that do not exist, test counts and artifact sizes. 6b9 and 6d each failed two review rounds on
  their decision logs and STATE alone. The coordinator re-ran every gate itself, checked every
  lane number against its log file and ran `git grep` on every cited symbol before a merge, and
  wrote the round 2 fixes itself. A Gemini reviewer's suggested literal test values were also
  wrong. Treat lane reports as claims to verify.

### Measurements that moved

- Unit tests, 1,998 in 229 files at the Wave 5 summary to 2,187 in 249 at 6d's head. `check:*`
  scripts stay at 9. Full local chromium Playwright at 6d's code head: 650 passed, 5 skipped, 0
  failed.
- Engine: `pokedraft-engine-6` to `pokedraft-engine-7`, `RUN_TOKEN_VERSION` 6 to 7, token versions
  1 to 7. Retained golden replays 10 to 13.
- 6d's new artifact `src/data/scouting-contributions.json`: 76,204 bytes raw, 6,570 bytes
  `gzip -9`. `pokedex.json` and `scouting.json` unchanged.

### Open carryovers

- Calibration, for the owner: P1 good (+1.07 against +3 to +6), P7 (+0.046, from engine 7's
  penalty rules on the synthetic win curve), P8 (68.78%, needs `match.roleFactor`) and the
  open-play goal-kind share (49.5% under V7, 58.8% at engine 6). Each fix is an engine change.
- Engine 8 freeze tooling: include `src/engine/story.ts` in the frozen bundle roots if retained
  replays should render the xG river. Shared `pd6` runs show no river today.
- The grace window closes at `2026-10-23T04:00:00Z`. Its receipt (a read-only count of `pd6` runs
  accepted after the flip) is NOT RUN until then.
- The Neon restore points from Wave 5 remain until the owner's yes.
- A physical phone check and a real screen reader were not run for any row (owner action; the
  checklist is in `docs/decisions/wave6-summary.md`).

### Owner follow-ups (2026-10-21)

- Passcode gate on. The agent generated `FRIENDS_PASSCODE` (four random dictionary words), set it in
  Vercel Production without printing it, and redeployed `99f7361`. The passcode and the cookie
  digest are in 0600 files on the owner's machine (`~/.pokedraft/friends-passcode`,
  `~/.pokedraft/friends-passcode-cookie`). Checked on production: `/` without a cookie 307 to
  `/gate?next=%2F`, with the digest cookie 200; `/api/leaderboard` without a cookie 401;
  `/api/health` 200; a wrong passcode 303 to `/gate?next=%2F&error=1`; the right one 303 to `/`
  with a cookie equal to the stored digest. Wave 7 live checks send that cookie.
- The Wave 5 restore points `br-snowy-surf-b7yk5m7w` and `br-noisy-bread-b7gzc2s4` are deleted, by
  the owner's yes. Production now has only the `main` and `preview` branches.
- Calibration: engine 7 stays as calibrated. P7 and P8 are accepted as measured. P1 good becomes an
  engine 8 row (below).
- Grace window, interim (read-only, 2026-10-21): production holds 3 rows (2 `pd3`, 1 `pd6` from
  2026-10-17), and 0 rows were written after the flip deploy (12:48 UTC). The final count is NOT
  RUN until the window closes at `2026-10-23T04:00:00Z`.
- Vercel production builds: of the wave's 16 merges, 6b5 (`5190287`) never got a Git production
  build, and #157 (`99f7361`) got one 24 minutes after the merge, past the coordinator's 15-minute
  wait, so a manual deployment had already been started. The project link is intact (GitHub,
  production branch `main`, deployments enabled). Treat a missing production build as a delay
  first: wait 30 minutes before a manual deployment.

### Wave 7 list additions (from Wave 6)

- Engine 8, P1 good: change Defend's own multiplier against direct sides (6b8 exploration lifted
  informed good from +1.07 to between +1.79 and +2.61), then re-measure P1 and P2 with the oracle.
  Bundle with other engine changes so friends see one version change, not several.
- Engine 8 freeze tooling: include `src/engine/story.ts` in the frozen bundle roots.
- The grace-window final count after `2026-10-23T04:00:00Z`.

## Wave 7. Platform hygiene and Engine 8

Every planned row merged, one PR each, each live-checked on production before the next landed: eighteen PRs (#159 to #176). Row 8d (goal-kind centring) was dropped per hand-off fallback and decision log because no pin P1 to P6 depends on goal kind and the owner did not ask for it. Production serves `8e071295` (PR #176), engine 8 (`pokedraft-engine-8`), token versions 1 to 8, `db.status` ok. Engine 7 lives on as the frozen bundle that replays `pd7` links.

| Row | PR | Squash | Reviewed head | Review | Production check |
| --- | --- | --- | --- | --- | --- |
| 7-0 Playwright live checks through passcode gate (Green) | #159 | `8a29610b` | `82b4ff6` | GLM APPROVE, round 1 | `health` 1 of 1 |
| 7ci CI hygiene, Node 24, pinned actions, format check, Postgres job (Green) | #160 | `040781bb` | `e2a70bf` | GLM APPROVE, round 1 | `health` 1 of 1 |
| 7pm proxy matcher trim (Red) | #161 | `24386947` | `f31481b` | GLM APPROVE and Red reviewer PASS | 19 of 19 |
| 7cq card query canonicalization (Red) | #162 | `edb04432` | `e43c518` | GLM APPROVE and Red reviewer PASS | 17 of 17 |
| 7rb rollback row count and drop-data guard (Red) | #163 | `90ee0f72` | `6b998d3` | GLM APPROVE and Red reviewer PASS | 19 of 19 |
| 7csp enforce Content-Security-Policy header (Red) | #164 | `fc890c09` | `7fb306e` | GLM APPROVE and Red reviewer PASS | 21 of 21 |
| 7bp builder squad link previews (/?b=) (Yellow) | #165 | `a26daf01` | `e2db080` | GLM APPROVE, round 1 | 24 of 24 |
| 7zd client Zod replacement and daily first paint (Yellow) | #166 | `a560015e` | `bc223cf` | GLM APPROVE, round 1 | 24 of 24 |
| 7q1 matchday and broadcast carryovers sweep (Yellow) | #167 | `d23e15f6` | `aa88fc5` | GLM APPROVE, round 1 | 27 of 27 |
| 7q2 app surface carryovers sweep (Yellow) | #168 | `c9c7ccd8` | `43fbff8` | GLM APPROVE, round 1 | 27 of 27 |
| 7cr credential rotation runbook and verification (Red) | #169 | `9c1db3b4` | `d512a8a` | GLM APPROVE and Red reviewer PASS | `health` 1 of 1 |
| 8a content-addressed engine data blobs (Red) | #170 | `363fed60` | `296277b` | GLM APPROVE and Red reviewer PASS | 29 of 29 |
| 8b freeze engine 7 into retained bundle (Red) | #171 | `f2f01113` | `a39ffc4` | GLM APPROVE and Red reviewer PASS | 30 of 30 |
| 8c dormant Defend against direct multiplier (Red) | #172 | `d6a165d1` | `8885b52` | GLM APPROVE and Red reviewer PASS | 30 of 30 |
| 8e engine 8 calibration, dormant (Red) | #173 | `2c288bbc` | `46e49e2` | GLM APPROVE and Red reviewer PASS | 30 of 30 |
| 8x the flip to engine 8 (Red) | #174 | `b823acff` | `f590db4` | GLM APPROVE and Red reviewer PASS | 37 of 37 |
| 7sp species chunk split into slim index and 9 lazy chunks (Red) | #175 | `acdd8f00` | `edef5111` | GLM APPROVE and Red reviewer PASS | 35 of 35 |
| 7x 360px matchday screenshots and GIF refresh (Green) | #176 | `8e071295` | `3cae365e` | GLM APPROVE, round 1 | 1 of 1 |

Reviews were GLM 5.3 Flash with an echoed canary per reviewed head. For Red PRs (7pm, 7cq, 7rb, 7csp, 7cr, 8a, 8b, 8c, 8e, 8x, 7sp), an independent Red reviewer subagent re-executed gates on the exact head. Production checks ran on Chromium with headless execution against `https://pokedraft-woad.vercel.app` using `PLAYWRIGHT_GATE_COOKIE_FILE` through the passcode gate.

Order: The platform hygiene and UI rows interleaved safely before engine work. 7-0 and 7ci landed first to establish gated live testing and modern CI hygiene. Platform rows 7pm, 7cq, 7rb, 7csp and UI rows 7bp, 7zd, 7q1, 7q2 cleared the backlog of audit findings. Credential rotation runbook (7cr) documented security procedures. Engine 8 was executed strictly in serial: 8a (data blobs), 8b (freeze v7), 8c (Defend vs direct candidate), 8e (calibration of V8, dropping 8d), and 8x (live engine flip and grace window). Row 7sp landed after the freeze to split species into a slim index and 9 lazy chunks, cutting draft start latency in half. Row 7x re-shot all 360 px mobile evidence and the animated GIF from production after all UI and engine changes.

### The flip to Engine 8 (Row 8x)

- `ENGINE_VERSION = "pokedraft-engine-8"`, `RUN_TOKEN_VERSION = 8`.
- Retained `v7` bundle wired under `src/engine/versions/v7` (`RETAINED[7]` with identity `adapt`), validating proxy `pd7.` and challenge links.
- Grace window `GRACE` set to version 7 until `2026-10-24T04:00:00Z` (`flipDate: "2026-10-22"`).
- Goldens updated: `CUP8_TOKEN` sha256 `ae0d6830dfa84bcbad2be1fbbedb6ab3ed4d38a4e6ed000d529af87f8a443f0c` (`[593, 5, "QF"]`), `KANTO_TOKEN` sha256 `4c1a9b94a4d03a60748fd8ea0fa17d87c66170725a37c5a5fc5cf22ce7b21e62` (`[480, 3, "R32"]`).
- Parity: 50 seeds ran 800 stories with 0 live-vs-frozen mismatches.

### Engine 8 calibration (8e, live since 8x)

Calibrated V8 values: `directDefendOwn = 1.05`, `styleEdges.direct.defend = [1.05, 0.52]`.

| Pin | Result | Target | Verdict |
| --- | --- | --- | --- |
| P1 good | +3.07 | +3 to +6 | pass (up from +1.07 in V7) |
| P1 random | +6.50 | - | pass |
| P2 good | +4.64 | <= +10 | pass |
| P2 random | +9.91 | <= +10 | pass |
| P3 | 0.00 | 0.00 | pass |
| P4 | +18.37 (5,438 shootouts) | positive correlation | pass |
| P5 | 840 3.65%, 900 11.79%, 950 29.53% | within v4 bands | pass |
| P6 | cup8-full good 5.912, kanto151 random 3.331 | matches baseline | pass |
| P7 | worst +0.046 | fallback 4 | recorded as measured |
| P8 | 68.61% | fallback 4 | recorded as measured |
| P9 | not applicable | - | 6b7 does not exist |

Achievements: Giant killer 2.5% (threshold 100), Hat-trick hero 73.0%.

### Measurements that moved

- Unit tests: 2,187 in 249 files (Wave 6) to 2,310 in 260 files (Wave 7 closeout).
- Engine version: `pokedraft-engine-7` to `pokedraft-engine-8`, token versions 1 to 8. Retained golden replays: 13 to 15.
- Species chunks: `src/data/species-index.json` (1,025 entries, 108 KB) and 9 lazy chunks `src/data/species-chunks/gen-[1..9].json`. Draft start CPU-throttled latency fell from 1,450.7 ms to 751.9 ms (48.2% faster).
- Server deduplication: content-addressed blobs under `src/engine/versions/_blobs/`. Emitted server retained bundles: 4 copies, 2,891,853 bytes.
- Security: Content-Security-Policy enforced; non-canonical `/card` queries 308-redirect to canonical forms; proxy matcher excludes static creature and health paths; database rollback requires explicit confirmation.

### Open carryovers

- No open code, audit, or platform findings: all 60 itemized findings from the 2026-10-17 audits and all queue items are closed.
- Wave 6 conditional carryover resolved: `src/engine/story.ts` was included in the frozen bundle roots in Row 8b (PR #171, squash `f2f01113`), exporting `matchStory` for `v7` so retained engine 7 replays render the xG river.
- Pending dated receipts (NOT RUN until window closure):
  - Wave 6 engine 6 grace window read-only count of `pd6` submissions after flip, scheduled for after `2026-10-23T04:00:00Z`.
  - Wave 7 engine 7 grace window read-only count of `pd7` submissions after flip, scheduled for after `2026-10-24T04:00:00Z`.
- Owner actions (NOT RUN; checklist in `docs/decisions/wave7-summary.md`):
  - Physical phone check on iPhone Safari and Android.
  - Screen reader pass (VoiceOver / TalkBack).

