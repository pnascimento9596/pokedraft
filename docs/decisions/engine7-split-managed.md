# Engine 7 split managed and the shared scaffolding (6b1)

Wave 6 row 6b1, Red. Branch `feat/engine7-split-managed` off `origin/main` at `7045ccd` (the 6g
squash). Dormant: the live coefficients keep `manager.splitManaged: false`, so production engine
output is exactly engine 6's.

## Who notices

Nobody yet. At the flip (6b9), a manager who makes a sub keeps the assistant's late tactic, and a
manager who sets a tactic keeps the assistant's fatigue subs. An early tactic (before 45') still
applies, and the assistant keeps its late reactive tactic on top of it. Balanced at kickoff no
longer costs anything: it plays the uncoached match exactly.

The next engineer inherits the pieces every later engine 7 row reuses:

- `src/engine/coefficients-v7.ts`, the one candidate module (engine 6 plus each row's change);
- `--coeffs v7` in `pnpm calibrate` and the probe;
- the parity guard against the frozen engine 6 bundle (`v6-parity.ts`, 50 runs in `pnpm test`,
  200 in the slow file);
- an ESLint boundary that keeps the candidate out of client code, with a guard that the rule fires;
- a source scan that refuses module-scope coefficient reads in `src/engine`.

## Scope and files

- `src/engine/coefficients.ts`. `EngineCoefficients.manager.splitManaged: boolean`, live `false`.
- `src/engine/coefficients-v7.ts` (new). `ENGINE_COEFFICIENTS_V7`, a spread of the live object with
  `manager.splitManaged: true`, so the candidate is never a hand-kept copy of the numbers.
- `src/engine/match.ts`. `managed` becomes `tacticManaged` and `subsManaged`, set by one
  `takeOver(action)` helper; the boundary gates the auto tactic and the fatigue subs separately;
  the auto tactic's base is `userBase` (Balanced, or the manager's last tactic). `recapLines`
  receives `c`.
- `src/engine/recap.ts`. `recapLines(input, c = ENGINE_COEFFICIENTS)`; the module-scope
  `REGULATION_KICKS` read is gone.
- `scripts/calibration/coeffs.ts`. `loadCoefficients("v7")` returns `ENGINE_COEFFICIENTS_V7`.
  `calibrate.mts` and `probe.mts` both load through it, so one line covers both.
- `eslint.config.mjs`. `no-restricted-imports` for `**/coefficients-v7` and
  `@/engine/coefficients-v7` under `src/ui`, `src/components` and `src/app`, ignoring `__tests__`.
- Tests: `src/engine/__tests__/split-managed.test.ts`, `coefficient-boundaries.test.ts`,
  `v6-parity.ts`, `v6-parity.test.ts`, `v6-parity.slow.test.ts` (all new) and
  `scripts/calibration/coeffs.test.ts` (new).

No file under `src/scouting`, `scripts/data` or `src/data` changed. No UI file changed.
`src/engine/__tests__/goldens.test.ts` is byte-identical to `origin/main` (`git diff` is empty) and
green.

## Guards

### Parity guard (regression guard, no RED: behaviour already correct)

Commit `1eed662`. `parityPanel(n)` plays run `i = 4j + s` with shape `s` (cup8 classic, kanto151,
the daily settings with `dailySeed(2026-10-<1 + i % 28>)`, builder), formation `(s + 5j) % 8` and
coaching `j % 4` (none; Balanced or another tactic at 0' and 70'; a sub at 30' plus a chosen injury
replacement; tactics at 0', 20' and 50' plus the sub and the injury answer). Each run's `CupResult`
from the live `runCup` at default coefficients and from
`@/engine/versions/v6/src/engine/cup` must match as JSON strings, byte for byte (stronger than
deep-equal: key order counts too). The casts bridge the bundle's own branded types, as
`versions/index.ts` does.

- 50 runs in `pnpm test` (`v6-parity.test.ts`) passed.
- 200 runs (`SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/v6-parity.slow.test.ts
  --silent=false`) passed in 10.99 s: 871 played matches, 638 of them coached, 95 chosen injury
  answers, all four shapes, all 8 formations.
- Mutation check: with `manager.autoSubEnergy` changed from 82 to 83 the 50-run test failed at
  `19 builder 5-3-2 sim` with a JSON mismatch. The value was restored before the commit.

### RED then GREEN

RED commit `1f9d738`. `pnpm vitest run src/engine/__tests__/split-managed.test.ts
src/engine/__tests__/coefficient-boundaries.test.ts scripts/calibration/coeffs.test.ts`, 11 of 17
failed:

```
     × resolves v7 to the candidate module itself 2ms
     × Balanced at kickoff leaves both assistant behaviours on: the uncoached match, 3-0 20ms
     × a sub at 30' turns the fatigue subs off and leaves the late tactic on 8ms
     × a chosen injury replacement at 28' turns the fatigue subs off and leaves the late tactic on 7ms
     × Attack at 50' turns the assistant's tactics off and leaves its fatigue subs on 6ms
     × Attack at 30' holds until the assistant protects the lead at 75' (it is not reset to Balanced) 5ms
     × reads ENGINE_COEFFICIENTS only as a default parameter outside the coefficient modules 5ms
     × refuses the import in src/ui/manager/x.ts 606ms
     × refuses the import in src/components/run/X.tsx 9ms
     × refuses the import in src/app/x/page.tsx 3ms
     × refuses the import in src/ui/matchday/x.ts 4ms
⎯⎯⎯⎯⎯⎯ Failed Tests 11 ⎯⎯⎯⎯⎯⎯⎯
Error: ENOENT: no such file or directory, open 'v7'
AssertionError: expected [ Array(1) ] to deeply equal []
AssertionError: expected [] to deeply equal [ 1 ]
AssertionError: expected [] to deeply equal [ { kind: 'tactic', …(4) } ]
AssertionError: expected undefined to deeply equal { kind: 'tactic', side: 'user', …(3) }
AssertionError: expected undefined to deeply equal { kind: 'tactic', side: 'user', …(3) }
AssertionError: expected [] to deeply equal [ { kind: 'sub', …(7) }, …(1) ]
AssertionError: expected undefined to deeply equal { kind: 'tactic', side: 'user', …(3) }
 Test Files  3 failed (3)
      Tests  11 failed | 6 passed (17)
```

The scan's failure named exactly the line the hand-off cites:

```
- []
+ [
+   "recap.ts:18 const REGULATION_KICKS = ENGINE_COEFFICIENTS.shootout.kicks;",
+ ]
```

GREEN commit `6dbe958`: 17 of 17 pass. The six that passed at RED: the three ESLint "allows it in"
cases (scripts, an engine test, a component test), the two loader cases that hold today (no flag
gives the live object; a patch file still merges and an unknown key still throws), and "never
writes the split flags into the result".

### Where the split guards' literals come from

The fixture is golden panel run 0 (seed `panel-0`, cup8 4-2-3-1), match 1, under
`ENGINE_COEFFICIENTS_V7` through `runCup` (no coefficients parameter was added to `replay`).
Uncoached on engine 6 it leads 1-0 from 10', the assistant answers an injury at 28', brings on
fresh legs at 60' (slot 10, 292 for 94) and 75' (slot 8, 92 for 678), switches to Defend at 75' and
wins 3-0. Each literal was read from engine 6 output before the split code existed:

- Balanced at kickoff sets no flag and logs no incident, so the V7 match must be the uncoached one:
  Defend at 75', both fatigue subs, 3-0.
- A sub at 30' (or the chosen injury answer at 28', bench 2, player 381): engine 6 with the same
  decision leads 1-0 at the 75' boundary with no auto action before it, so the first V7 auto
  tactic must be Defend at 75' and the fatigue list must be empty.
- Attack at 50': energy does not depend on Attack, so the fatigue subs must be the uncoached two;
  the only user tactic must be the manager's.
- A sub at 20' and Attack at 30': engine 6 leads 1-0 at 75', so the windows from 35' to 75' must
  show Attack and the first auto tactic must be Defend at 75'.

## Probe numbers (not a pin; 6b8 calibrates the whole set)

`nice -n 10 pnpm exec tsx scripts/calibration/probe.mts --probe <mode> --n 400 [--coeffs v7]`,
bots good and random, formation 4-3-3, seeds `probe-<formation>-<bot>-<i>` for i = 1..400, each
played match of the auto cup replayed with the arm's kickoff tactic. Win proportions carry 95%
Wilson intervals; differences use Newcombe's hybrid score interval.

At this head the engine 6 runs reproduce the 6p baseline files byte for byte: informed sha256
`5c651fcf...38bea7` and noop `37ef10f1...2f05`, the `sources` hashes in
`docs/reports/engine-7/baseline-v6.json`. The V7 outputs hash to `2bf1957e...fec59` (informed) and
`27794e7e...1c58` (noop). Wall time 27 to 31 s each.

| Probe, bot | Auto win | Arm win, engine 6 (baseline) | Arm win, V7 | Arm minus auto, engine 6 | Arm minus auto, V7 |
| --- | --- | --- | --- | --- | --- |
| P1 informed, good | 2363/2787 0.8479 [0.8341, 0.8607] | 2332/2787 0.8367 [0.8226, 0.8500] | 2357/2787 0.8457 [0.8318, 0.8586] | -0.0111 [-0.0303, +0.0080] | -0.0022 [-0.0211, +0.0168] |
| P1 informed, random | 1303/1910 0.6822 [0.6610, 0.7027] | 1214/1910 0.6356 [0.6138, 0.6569] | 1306/1910 0.6838 [0.6626, 0.7042] | -0.0466 [-0.0765, -0.0165] | +0.0016 [-0.0279, +0.0311] |
| P3 noop, good | 2363/2787 0.8479 [0.8341, 0.8607] | 2342/2787 0.8403 [0.8263, 0.8535] | 2363/2787 0.8479 [0.8341, 0.8607] | -0.0075 [-0.0266, +0.0115] | 0.0000 [-0.0189, +0.0189] |
| P3 noop, random | 1303/1910 0.6822 [0.6610, 0.7027] | 1202/1910 0.6293 [0.6074, 0.6507] | 1303/1910 0.6822 [0.6610, 0.7027] | -0.0529 [-0.0829, -0.0227] | 0.0000 [-0.0295, +0.0295] |

Discordant wins (arm only, auto only): informed good 43/74 to 49/55, informed random 41/130 to
59/56, noop good 1/22 to 0/0, noop random 2/103 to 0/0.

What the numbers say:

- P3 (a no-op decision costs at most 0.5 points) now holds by construction. Balanced at kickoff
  sets no flag, so every replayed match is the auto match: zero discordant pairs, not a small
  difference.
- P1 (informed beats auto by 3 to 6 points) still fails. The split removed the penalty (good
  -1.11 to -0.22 points, random -4.66 to +0.16), so the informed manager now breaks even with the
  assistant, but the tactic edges are too small to beat it. That is 6b2's job (larger asymmetric
  edges), then 6b8's calibration.
- The auto column does not move: an uncoached match never sets a flag.

## Product decisions applied

- Decision 4 (assistant after a decision), with the hand-off's 6b1 bullet: `tacticManaged` only for
  a tactic at 45' or later, `subsManaged` for any sub including a chosen injury replacement, each
  gating its own half of the assistant. Off, engine 6 behaviour is byte-identical.
- The split flags never reach output: no new key in `CupResult`, `MatchResult` or
  `WindowSnapshot` (guarded: the V7 match JSON contains no "managed").
- Engine scope: `src/engine` and `scripts/calibration` only, as the row brief allows. No new
  randomness: the split only decides whether the existing fatigue and tactic code runs; under
  engine 6 the draw sequence is identical (parity guard).

## Implementation decisions

- **The assistant's base tactic follows an early manager tactic.** The hand-off says an early
  tactic "still applies" and the assistant "keeps its late reactive tactic". Engine 6's auto coach
  computes `autoTactic("balanced", ...)` at every boundary, so with tactics left on it would revert
  an early Attack to Balanced five minutes later. `userBase` holds the manager's last tactic and
  `autoTactic(userBase, ...)` returns to it once the late-game condition passes. Under engine 6
  `userBase` is only read before the first decision, when it is Balanced. Guarded by the "Attack at
  30' holds" case (Model the Domain: one helper, `takeOver`, owns which half a decision switches
  off, instead of two scattered assignments).
- **`autoTactic` is unchanged**, so with tactics on the assistant can also act at 45' when two goals
  down. The hand-off's parenthesis names only 60' and 75'; changing the rule would move uncoached
  matches, which the parity guard forbids before the flip.
- **A tactic at exactly 45' counts as late** (`minute >= 45`), as the hand-off states.
- **The candidate spreads the live object.** `ENGINE_COEFFICIENTS_V7 = { ...ENGINE_COEFFICIENTS,
  manager: { ...ENGINE_COEFFICIENTS.manager, splitManaged: true } }`. Each later row adds its delta
  here. At the flip, 6b9 either makes this the live object or moves the literal; whichever it does,
  the import direction must flip too, or `coefficients.ts` and `coefficients-v7.ts` import each
  other.
- **The source scan is stricter than "reads `ENGINE_COEFFICIENTS.`".** It strips import and
  re-export lines, a bare `ENGINE_COEFFICIENTS,` line inside a multi-line import, and the default
  parameter form `: EngineCoefficients = ENGINE_COEFFICIENTS`, then flags any remaining
  `ENGINE_COEFFICIENTS` token, so an alias (`const k = ENGINE_COEFFICIENTS`) or any
  `ENGINE_COEFFICIENTS_V7` use in an engine source also fails. `versions/` (frozen copies) and
  `__tests__` are skipped. Known hole: a bare `ENGINE_COEFFICIENTS,` line used as a call argument
  would pass; no engine file does that today.
- **The ESLint rule ignores `__tests__`** so a component test can render with the candidate (6b3's
  "test-only switch"). The guard lints source text through the repo's real config (`new ESLint({
  cwd })`), covering the `@/` alias and a relative path, and checks that scripts, engine tests and
  component tests stay allowed. No earlier config set `no-restricted-imports` for these files
  (`eslint --print-config` against the old config showed none), so the new block overrides
  nothing.
- **`--coeffs v7` lives in the shared loader.** Both `calibrate.mts` and `probe.mts` already call
  `loadCoefficients`, so one branch covers both and the patch-file path is untouched (guarded: a
  patch still deep-merges and an unknown key still throws with the same message). A file literally
  named `v7` can no longer be passed; use `./v7`.
- **Parity compares JSON strings, not `toEqual`.** Goldens and retained replays hash
  `JSON.stringify`, so key order is part of what must not drift.

## Brief vs code

- Hand-off 4.2 cites `match.ts:513` (`managed`), `:561` (`applyManager`), `:688` (injury answer) and
  `:605-646` (boundary). At `7045ccd` they were 554, 602, 729 and 646-690: 6a1 moved the body into
  `playMatchCore`. Behaviour was as described.
- Hand-off cites `scripts/calibrate.mts:108-140` for the deep merge. At this head the merge lives in
  `scripts/calibration/coeffs.ts` (`loadCoefficients`), shared with `probe.mts`; `calibrate.mts:107`
  calls it.
- `recap.ts:18`, `coefficients.ts:3` and `engine6-compare.mts:17` matched.
- "Daily" is not an engine mode. The daily shape is cup8 with the daily settings (`open`,
  `squadFirst`, all generations, `src/leaderboard/daily.ts:23`) and a `dailySeed`. The open style
  offers a region and type instead of three species, so the panel drafts it with its own helper.
- The codemap correction says `MatchPlayer.tsx` computes its own `managed`. At this head it is
  `MatchPlayer.tsx:176` (any action at minute 65 or earlier, for the 65' stop), and
  `touchline.ts:131-133` `managedAt` (any action so far) feeds the assistant status line. Both stay
  as they are in this row. 6b9 must align them: the 65' stop goes (and `MatchPlayer`'s `managed`
  with it), and the Touchline's status needs the two split flags for its four-state copy, which
  means a client-side mirror of `takeOver` (a tactic at 45' or later, any sub) rather than "any
  action".

## Gates (at `610a5ee`, GREEN `6dbe958` plus a test comment, code-identical to the docs commit)

- `pnpm lint`, `pnpm typecheck`, `pnpm build` exited 0.
- `pnpm test`: 2,064 passed in 237 files.
- `pnpm vitest run src/engine`: 301 passed in 27 files.
- Slow parity, 200 runs: 1 of 1 passed (numbers above).
- `check-retained-replays.mts .next/server/chunks`: 10 golden replays passed.
  `measure-retained-json.mjs .next/server/chunks`: 4 copies, 2,891,853 bytes (unchanged from 6g).
- All nine `check:*` scripts exited 0. Prettier passed on every touched file. `pnpm e2e:pins
  --check`: current.

## NOT RUN

- Review (GLM and the Red reviewer) and hosted CI: the coordinator runs them.
- Playwright: no UI file changed and the hand-off names no spec for this row; engine output at
  default coefficients is unchanged (goldens, parity, retained replays, e2e pins).
- Probe modes other than informed and noop under V7 (manager, oracle, luck, upsets, formations,
  shootouts, kinds): the split cannot move an uncoached cup, so luck, upsets, formations, shootouts
  and kinds are unchanged by construction; manager and oracle move with it and 6b8 measures them.
- Phone check and screen reader pass: no UI change.

## Carryovers

- 6b9: align `MatchPlayer.tsx:176` and `touchline.ts` `managedAt` with the split (above), and make
  `coefficients.ts` the owner of the engine 7 numbers without a circular import.
- 6b2 to 6b8: add each rule's delta to `ENGINE_COEFFICIENTS_V7`, reuse `v6-parity.ts` as the
  parity guard and `--coeffs v7` for probes.
