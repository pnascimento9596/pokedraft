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
