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
