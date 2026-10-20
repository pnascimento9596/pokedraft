# matchStory core (6a1)

Wave 6 row 6a1, Red. Branch `feat/match-story` off `origin/main` at `9e4802b`. Engine change with
no output change: engine 6 stays live and every run replays exactly as before.

## Who notices

Nobody, yet. This row adds `matchStory`, which 6a2 uses for the xG river, the territory lean and
the new commentary lines. No component imports it in this PR, so the client bundle and every page
are unchanged.

## Scope and files

- `src/engine/match.ts`. The body of `simulateMatch` moves into `playMatchCore(input, c, observe?)`
  (`:498`). `simulateMatch` (`:489`) calls it with no observer. The core calls
  `observe?.chance(...)` at both ends of a chance trial (`:836` for a goal, `:867` for a miss) and
  `observe?.window(...)` after the window snapshot (`:890`). New exported types: `ChanceObservation`
  (`:71`) and `MatchObserver` (`:86`).
- `src/engine/cup.ts`. The match input that `runCup` built inline is now `cupMatch` (`:170`), and
  `runCup`'s `play` (`:291`) calls it. `cupMatchInput` (`:214`) is the exported form: it builds the
  ladder and the Team Score, checks the decision order the way `runCup` does, and refuses a match
  index outside 0 to 7 with a `RangeError`.
- `src/engine/opponents.ts`. `BOSS_FORMATION` is exported so the story can read the Boss Club's
  slot channels.
- `src/engine/story.ts` (new). `matchStory(seed, matchIndex, run, c?)` (`:91`) returns
  `{ chances, windows, result }`. `chanceZone` (`:74`) derives the zone.
- `src/engine/__tests__/story.test.ts`, `story.slow.test.ts` and `story-panel.ts` (new): the
  parity guard, the zone table and the observer boundary.
- `vitest.config.mts`. `*.slow.test.ts` files are excluded unless `SLOW_TESTS=1` is set.

`src/scouting`, `scripts/data` and `src/data` are untouched. `goldens.test.ts` is byte-identical
to `origin/main` (`git diff --quiet origin/main -- src/engine/__tests__/goldens.test.ts` exits 0).

## The story

- `chances`: one entry per chance trial, in the order the engine plays them. Each has the window,
  the minute, the side, the trial's `p`, the outcome, the goal kind (null for a miss), the shooter
  and a zone.
  - "goal": the trial scored. The shooter is the scorer.
  - "saved": the existing save roll succeeded and the engine recorded a save.
  - "off": every other miss. The shooter is the attacker the save roll picked.
  - A regulation match has 100 trials (50 per side). Extra time adds 34.
- `windows`: one entry per five-minute window, with `xgUser` and `xgOpp` (the sums of that
  window's trial `p` per side) and `territory = xgUser / (xgUser + xgOpp)`, or 0.5 when both are 0.
- `result`: the `MatchResult` itself, byte-identical to `runCup`'s match.

The shootout has no chance trials, so the story records none for it. The result still carries the
shootout.

## Parity guard (the RED/GREEN equivalent for "nothing moved")

RED commit `420228a`: the parity test, the zone test and the boundary test against a stub
`matchStory` and `chanceZone` that throw. `pnpm vitest run src/engine/__tests__/story.test.ts`,
7 of 7 failed:

```
 FAIL  src/engine/__tests__/story.test.ts > matchStory parity (a story that drifts from simulateMatch would show a match that never happened) > replays every played match of the 20-run golden panel and 30 more seeds byte for byte
Error: matchStory is not built yet (panel-0, 0, cup8, [object Object])
 FAIL  src/engine/__tests__/story.test.ts > matchStory parity (a story that drifts from simulateMatch would show a match that never happened) > returns the same story twice for the same inputs
Error: matchStory is not built yet (panel-0, 0, cup8, [object Object])
 FAIL  src/engine/__tests__/story.test.ts > matchStory parity (a story that drifts from simulateMatch would show a match that never happened) > refuses a match index outside the cup instead of inventing a match
AssertionError: expected error to be instance of RangeError
 FAIL  src/engine/__tests__/story.test.ts > matchStory parity (a story that drifts from simulateMatch would show a match that never happened) > sums each window's chance p per side into xG and territory
Error: matchStory is not built yet (panel-0, 0, cup8, [object Object])
 FAIL  src/engine/__tests__/story.test.ts > chanceZone (a derived zone that contradicts the goal kind would draw a header from 30 yards) > puts headers and penalties in the box and free kicks outside, whatever the line
Error: chanceZone is not built yet (MID, L, header)
 FAIL  src/engine/__tests__/story.test.ts > chanceZone (a derived zone that contradicts the goal kind would draw a header from 30 yards) > reads open play, solo goals and misses from the shooter's line and channel
Error: chanceZone is not built yet (ATT, C, open-play)
 FAIL  src/engine/__tests__/story.test.ts > observer boundary (a second caller of the observe hook could start steering the engine) > keeps `observe` inside match.ts and story.ts in src/engine
AssertionError: expected [] to deeply equal [ 'match.ts', 'story.ts' ]
 Test Files  1 failed (1)
      Tests  7 failed (7)
```

The slow file at the same commit, `SLOW_TESTS=1`, 1 of 1 failed with
`Error: matchStory is not built yet (panel-0, 0, cup8, [object Object])`.

GREEN commit `7bf01e8`: 7 of 7 pass, and the 200-run file passes.

What the guard checks for every match a run plays:

- `JSON.stringify(story.result)` equals `JSON.stringify(cup.matches[k])`. `runCup` returns
  `simulateMatch`'s result unchanged, so this is the same as deep equality with `simulateMatch`.
- The goal chances, in minute order, are the result's goals (minute, side, scorer, kind).
- The saved chances are the result's saves (minute, keeper side, attacker).
- 100 chances and 18 windows, or 134 and 24 after extra time. The window minutes equal the
  result's snapshot minutes.

The panel: runs 0 to 19 are `goldens.test.ts`'s 20-run panel (seeds `panel-0` to `panel-19`, the
same draft scripts, uncoached). Later runs use seeds `story-20` onward, alternate cup8 and
kanto151 in pairs, and every odd one is coached: a tactic at kickoff, a tactical sub at 40' (dropped
when the engine refuses it) and a tactic at 70' in every match the run reaches. `pnpm test` runs 50
runs. `story.slow.test.ts` runs 200.

The 200-run receipt, at `7bf01e8`
(`SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/story.slow.test.ts --silent=false`): 942 played
matches, 81 of them with extra time, 415 coached. Of 94,369 misses, 5,192 were "saved" and 89,177
"off" (94.5% off, against the brief's "90% or more").

Mutation check, not committed: making the observer path draw once more from `save_events`
(`outcome: rng.next() < 0 ? ...`) failed the parity test on `panel-0 cup8 match 0` (the saves
moved) while `goldens.test.ts` still passed. That is why the parity guard exists next to the
goldens: an observer-only drift never reaches `simulateMatch`.

## Measurements

The probe numbers (squad share of variance, manager table, upset curve, shootout win rate) are
unchanged by construction against the 6p baselines (`docs/reports/engine-7/baseline-v6.json`, PR
#141): `simulateMatch` plays the same draws in the same order, which the goldens and the parity
guard prove. No probe was re-run.

## Product decisions applied

- Honest numbers (decision 9). The story reports only what the engine rolled: the trial `p`, the
  goal or miss, the save roll's outcome and the shooter. The zone is the one derived field, and its
  type doc says so.
- Engine 6 stays live until 6b9. No coefficient, draw or result field changed.

## Implementation decisions

- One core, two callers. `simulateMatch` and `matchStory` share `playMatchCore`, so a story cannot
  drift from the match without the parity test failing (principle-model-the-domain: one body
  instead of a copy kept in sync by hand).
- The observer reads plain values after the engine has used them, through `observe?.`. With no
  observer, JavaScript skips the call and its arguments, so `simulateMatch` does no extra work. The
  core has no branch on the observer.
- The core reports the window index and minute. The story sums `p` per window itself. Keeping the
  per-window sums out of the core means no state exists in `match.ts` only for the observer.
- The save path was restructured only to name its result: `const saved = rng.next() < ...`. The
  attacker pick and the save roll keep their order on `save_events` (two draws per miss).
- `matchStory` takes the run (`lineup`, `mode`, `manager`) and builds the match input with
  `cupMatchInput`, the same code `runCup` uses. 6a2 has a run token, not a `MatchInput`, and a second
  input builder in the UI would be a second place to drift.
- Zone rules. A penalty is in the box, centre lane, whoever takes it. A header is in the box. A free
  kick is outside. Otherwise the shooter's line decides: ATT and DEF in the box (a defender's chance
  is a set piece in the box), MID outside. The GK line only reaches a chance as a penalty taker. The
  lane is the shooter's formation slot channel (L, C, R). Roles carry no side, the slots do.
- The slow file convention did not exist, so `*.slow.test.ts` is excluded in `vitest.config.mts`
  unless `SLOW_TESTS=1`. Vitest hides console output of passing tests here, so the receipt command
  adds `--silent=false` to print the tally.
- The observer boundary is a source scan over `src/engine` (tests and frozen bundles excluded). The
  UI already calls `ResizeObserver.observe` (`MatchPlayer.tsx:992`, `Broadcast.tsx:292`), so a scan
  over all of `src` would flag those.

## Brief vs code

- The hand-off signature `matchStory(seed, matchIndex, input, c?)`: `MatchInput` already carries
  `seed` and `matchIndex`, so passing both and a `MatchInput` invites a mismatch. `input` is the run
  (`StoryRun`), and the match input comes from `cupMatchInput`.
- The hand-off has the core pass `{ window, xgUser, xgOpp, territory }` at the snapshot. The core
  passes `{ window, minute }` and the story computes the three values from the chances it saw. The
  story's output carries them as specified.
- The hand-off places "left, centre or right from the role's side". Roles (`ST`, `W`, `FB` and the
  rest) have no side. Formation slots do (`Slot.channel`), so the lane reads the slot.
- The hand-off lists only `match.ts` and the story module. `cup.ts` and `opponents.ts` also changed
  (the shared input builder and one export). Both are under `src/engine`, which this row may edit.
- Verified at the head: the trial loop, the save path with two `save_events` draws per miss, and
  the snapshot push sit where the hand-off and the code map corrections say (`match.ts:783-826` at
  `9e4802b`).

## Gates

At `7bf01e8` (the docs commit that follows changes only `docs/decisions/match-story.md` and
`STATE.md`):

- `pnpm lint` 0, `pnpm typecheck` 0, `pnpm build` 0.
- `pnpm test`: 2,005 passed in 230 files (main had 1,998 in 229).
- `pnpm vitest run src/engine`: 280 passed in 24 files.
- `SLOW_TESTS=1 pnpm vitest run src/engine/__tests__/story.slow.test.ts`: 1 of 1 passed.
- `goldens.test.ts`: byte-identical to `origin/main` and green.
- `pnpm exec tsx scripts/build/check-retained-replays.mts .next/server/chunks`: 0, "10 emitted golden
  replays passed, 1 dispatcher(s)", live v6 replay `2b26ee82...`.
- `node scripts/build/measure-retained-json.mjs .next/server/chunks`: 0, 4 payloads.
- All nine `check:*` scripts exited 0.
- Prettier passed on the eight touched code, test and config files.

## NOT RUN

- GLM review and hosted CI (the coordinator runs them).
- Playwright: no UI changed and no spec depends on the new module.
- The calibration probes (unchanged by construction, see Measurements).
- The phone check and screen reader pass (no UI in this row).

## Carryovers

- `matchStory` plays any match index 0 to 7, including a knockout the run never reached. 6a2 should
  call it only for matches whose `status` is "played".
- 6b0 freezes from `replay.ts` and `types.ts`. `story.ts` is outside that closure, so the frozen v6
  bundle will hold `playMatchCore` and the observer types but not the story.
