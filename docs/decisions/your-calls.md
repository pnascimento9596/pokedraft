# Your calls card (Wave 3, row 3h)

Tier Yellow. Branch `feat/your-calls` off `origin/main` at `20e34f6`. No file under `src/engine`,
`src/data` or `src/scouting` changed, so the engine goldens are untouched. The card only calls
`runCup`.

## Scope

Re-verified at `20e34f6`:

- `runCup(lineup, seed, mode, c = ENGINE_COEFFICIENTS, manager = [])` (`src/engine/cup.ts:157`).
  It throws `RunTokenError("invalidAction")` when actions are out of order (`managerByMatch`,
  `:144`), when a call names a match the run never played (`:318`), and from `simulateMatch` for
  an impossible substitution or a call after the final whistle (`src/engine/match.ts:239`).
- `MatchdayFlow` holds `ctx` (`lineup`, `seed`, `mode`), `cup` and `actions` in state and passes a
  `footer` to `MatchPlayer`. `MatchPlayer` renders the footer only when `state.stage === "done"`
  (`src/components/matchday/MatchPlayer.tsx:332` and `:550`). `Stage` is
  `"play" | "pens" | "done"` (`src/ui/matchday/player.ts:278`).
- `runCup` was already in the client bundle: `decide` in `src/ui/manager/touchline.ts` calls it on
  every touchline decision.

The change:

- `src/ui/manager/your-calls.ts` (new, pure). `yourCallsRuns(ctx, cup, actions, i)` is a generator
  that does one `runCup` per step and yields a `CallsReport` after each:
  1. Baseline: `actions.filter(a => a.match < i)`, read `matches[i]`. It cannot throw, because
     matches up to `i` depend only on earlier calls, which the real run already accepted.
  2. Knock-on, only when the real cup has a played match after `i`. With no calls after match `i`,
     the baseline run is the "without this match" run, so it is reused. With later calls, it runs
     `actions.filter(a => a.match !== i)`. A `RunTokenError` there gives "Later calls depended on
     this match."; any other error propagates.
  3. Leave-one-out over this match's first 8 calls: earlier calls plus this match's calls minus
     one. Later matches' calls are left out, so these runs only fail on an in-match conflict, which
     marks that call as refused.
  `callsCopy` turns a report into the card's lines. `callLabel` names a call with
  `TACTIC_LABEL` ("your Attack switch at 12'", "your Attack from kickoff") or from the real
  match's manager `sub` incident ("your Skwovet on for Shieldon at 60'").
- `src/components/matchday/YourCalls.tsx` (new) runs the generator one step per `setTimeout(0)`
  task, shows the score line after the first step and the call line after the last, and caches the
  finished report per cup and match in a `WeakMap`. It renders nothing for a match with no call of
  the player's.
- `MatchdayFlow.tsx` mounts `<YourCalls>` inside the existing full-time footer (2 lines). No edit to
  `MatchPlayer.tsx`, `Touchline.tsx` or `player.ts`, so row 3a's parallel work does not conflict.
- `scripts/e2e/render-pins.ts` adds the `YOUR_CALLS` pin: match 0 of the `e2e-coach` run with and
  without Attack at 45', scored straight from `runCup` and `finalScore`.

## Copy

- Score: "Assistant 6-1, You 8-2". A shootout adds "(5-4 pens)" for `decider: "kicks"`, "(coin
  toss)" or "(pens)" for the old deciders. Extra time is folded into the score, as `finalScore`
  does.
- Same score: "Your calls gave the same score as the assistant."
- Call: "Biggest swing: your Attack switch at 12'." or "No single call changed the score." When a
  call went unchecked (more than 8) or its replay was refused: "No single call that could be
  checked changed the score."
- Knock-on: "Your calls here changed later results.", "Later results are the same without your
  calls here." or "Later calls depended on this match." No line when no later match was played.
- Pending: "Replaying the match without your calls." then "Checking each call."

## RED output (verbatim excerpt)

RED commit `cbd24ad`: 2 of 2 files failed. The 1 collected test failed, and
`your-calls.test.ts` (5 tests) failed to load because `../your-calls` did not exist.

```
     × is absent at 89' and reads Assistant 1-0, You 3-1 with the Attack switch at full time 341ms
 FAIL  src/ui/manager/__tests__/your-calls.test.ts [ src/ui/manager/__tests__/your-calls.test.ts ]
Error: Cannot find module '../your-calls' imported from /Users/paulo/Projects/pokedraft-your-calls/src/ui/manager/__tests__/your-calls.test.ts
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/components/matchday/__tests__/MatchdayFlow.yourCalls.test.tsx > your calls card (catches a card shown before full time, or one that never shows) > is absent at 89' and reads Assistant 1-0, You 3-1 with the Attack switch at full time
TestingLibraryElementError: Unable to find an element by: [data-testid="your-calls"]
 Test Files  2 failed (2)
      Tests  1 failed (1)
```

The component test reached 89' with no full-time footer and no card before it failed, so that half
of the guard already held; it fails on the card missing at full time.

After the RED commit the component test's waits changed from `advanceTimersByTime(0)` to 16 ms
steps, because faked timers do not run a 0 ms timeout queued during the same advance. It also
gained one assertion (no call line after the first step). No expected string changed.

The guards, with the pinned squads drafted by `createDraft` (cup8, 4-2-3-1, first offer per slot):

- `calls-3`, Attack at 12' and Defend at 80' in match 0: 3 yields (baseline plus 2 leave-one-out),
  "Assistant 1-0, You 3-1", call pending after the first, then "Biggest swing: your Attack switch
  at 12'." Without Attack the score is 1-0; without Defend it stays 3-1.
- `calls-3`, Defend at 80' alone: "Assistant 1-0, You 1-0", the same-score line and "No single
  call changed the score."
- `calls-18`, Defend at 12' in match 4 (a lost knockout becomes 0-0, 5-4 on pens) and Attack at
  20' in match 5, which only exists because of match 4: the baseline does not throw and reads
  "Assistant 0-1, You 0-0 (5-4 pens)"; the knock-on run throws "a coach decision names a match the
  run never played", so the card says "Later calls depended on this match."
- A match with no call of the player's yields nothing.
- `callLabel` names a sub "your Skwovet on for Shieldon at 60'" and a 0' tactic "your Attack from
  kickoff".
- `MatchdayFlow.yourCalls.test.tsx`: at 89' there is no full-time footer and no card. After Skip to
  full time, the first task shows the score line with no call line, and later tasks show the call
  and the knock-on line.

The values came from scratch `runCup` calls (outside the module under test) before the module was
written.

## Measurements

Card compute time in the browser, from the card's first paint to the call line, on a fresh
`pnpm build` at `3ac4b9b` (`next start`, Playwright chromium at 390x844, headless on this Mac).
`Emulation.setCPUThrottlingRate` was set right before Skip to full time. The run was the
`e2e-coach` squad with Attack at kickoff and Defend at 45', plus 0 or 5 half-time subs. Long tasks
were read from a `longtask` PerformanceObserver over the same window. Two repetitions each:

| CPU | Calls | runCup calls | Score line (ms) | Call line (ms) | Long tasks |
| --- | ----- | ------------ | --------------- | -------------- | ---------- |
| 1x  | 2     | 3            | 21, 22          | 35, 37         | none       |
| 1x  | 7     | 8            | 20, 19          | 69, 69         | none       |
| 4x  | 2     | 3            | 40, 40          | 95, 97         | none       |
| 4x  | 7     | 8            | 59, 45          | 300, 254       | none       |

The worst case is 9 runs (baseline plus 8). By the 8-run figure that is about 0.35 s at 4x, well
under the 3 s bound. No single task reached the 50 ms long-task line even at 4x, which is what one
`runCup` per task is for. In Node (`tsx`, desktop) one `runCup` on `calls-3` took 4.9 ms on
average over 20 runs; the brief's 28 ms is an older figure. Headless chromium does no GPU raster,
and a real low-end phone was not measured (NOT RUN).

The measurement harness lived in the session scratch dir and is not committed. Its first version
missed the call line because React reuses the pending `<p>` and only adds `data-testid`; the
second version watches that attribute too.

## Product decisions applied

- Decision 3 (blind challenges): the card shows match scores, which the full-time line above it
  already shows with ratings on or off. It shows no rating, fit score or Team Score.
- Decision 4 (assistant after a decision): the baseline is the run the assistant would have coached,
  because a match with no call of the player's is unmanaged and the auto coach runs it.

## Implementation decisions

- The card lives in the full-time footer, not in `MatchPlayer`. The footer is the only surface
  `MatchPlayer` renders after `stage === "done"`, so "never before full time" holds by mount,
  and row 3a's edits to `MatchPlayer.tsx` cannot collide.
- "Moves the score most" is a tuple compared in order: the change in goal difference, then the
  total change in goals, then the change in shootout difference. Ties go to the earliest call
  (calls are in minute order). Only a removal that changes the score line or the outcome counts.
  The order puts a changed result ahead of a changed margin.
- At most 8 calls are checked, as the hand-off bounds it. Calls past the 8th stay in every
  leave-one-out run, and the "no single call" line says "that could be checked" when any went
  unchecked or was refused. The card never names a call it did not test.
- Knock-on compares every later match's status, score line and outcome. "Same" is shown as well
  as "changed", so the player is told either way. It is shown only when the real cup has a
  played later match.
- The card shows for any match with a call of the player's, whatever `managerMode` says, because a
  call can only come from the touchline or a restored coached matchday.
- The finished report is cached per cup and match in a `WeakMap`, so React's development double
  effect or a remount does not replay the cup again.
- `YOUR_CALLS` is a generated pin, so an engine bump moves the e2e scores through `pnpm e2e:pins`
  as every other pin does. The named call text is a literal in the spec.

## Brief vs code

- The hand-off's 28 ms per `runCup` is about 5 ms in Node. From the 8-run rows of the table it
  is about 9 ms per run in desktop chromium and 32 to 37 ms at 4x, task overhead included.
- The hand-off says to label "Your calls here changed later results" when the knock-on run throws.
  The card shows only "Later calls depended on this match." in that case, because a refused replay
  does not say which later results changed.
- In the live flow, calls for later matches do not exist yet at a match's full time, so the extra
  knock-on run happens only for a restored or replayed action list. The guard covers it with
  `calls-18`.

## Gates

At `3ac4b9b`: lint, typecheck and build exited 0; all seven `check:*` scripts exited 0; 1,517
unit tests passed in 175 files; Prettier passed on the 9 touched files.

## NOT RUN

- A physical phone (owner action).
- 360 and 320 px proof: the card is a block of wrapping text in the existing full-time box and
  adds no fixed width; the 390 spec checks the card stays inside the viewport with no side scroll.
- Hosted CI, review and the full e2e suite at the time of writing.

## Carryovers

- None folded into this row. Row 3i (instant replay and deep links) may want "Share this goal" on
  the card; not in scope here.
