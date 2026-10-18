# Program log

One entry per finished wave: PRs merged, production SHA, measurements that moved, open
carryovers. The brief is `pokedraft-implementation-prompt-2026-10-17.md` in this folder.

## Program start

`origin/main` and production both at `f4489cb` (PR #69), engine 6, token versions 1 to 6,
`/api/health?db=1` reports `db.status` ok.

## Wave 1. Truth pass

All twelve rows merged, one PR each, each live-checked on production before the next began.
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
- 1l: measured 2,891,853 bytes saved against the audit's estimate.

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
