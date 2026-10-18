# One shared timeline (Wave 1, row 1a)

Tier Yellow. Branch `fix/one-shared-timeline` off `f4489cb`. No file under `src/engine`, `src/data`
or `src/scouting` changed, so the engine goldens are untouched.

## Scope

The bug, re-verified at `f4489cb`:

- `MatchPlayer.tsx:80-83` built its timeline without `movesOf`. `Broadcast.tsx:116-120` loaded the
  movesets and built a second timeline with them. HUD, ticker and sounds read the first. The pitch
  read the second.
- `playCallout` and `shotCallout` drew from their stream only when a moveset existed
  (`moves.ts:48` and `moves.ts:78`). `playCallout` shared `playRng` with the phase choreography
  (`timeline.ts:472`). So the two timelines disagreed on side, slots and kind for most phases.
- Every ability sound read the moveset-free timeline, so the six typed tones never played.

The fix:

- `src/components/matchday/useMovesets.ts` owns the moveset load. `MatchPlayer` calls it, builds
  the only timeline, and passes it to `Broadcast` as `timeline`. `Broadcast` no longer takes
  `matchIndex` or `seed` and no longer calls `buildTimeline`.
- Open-play callouts draw from their own substream `broadcast:<seed>:<i>:callouts`. The plays stream
  no longer depends on movesets at all, which makes the guard structural.
- `pickMove` draws exactly one number, with or without moves, so `shotCallout` and `playCallout`
  each consume one draw on their own stream.
- The clock holds at kickoff until the movesets settle. A failed load resolves to generic callouts
  so a match can still start.

## Measurements

- Plays that differ between the two timelines on the `timeline.test.ts` fixture (seed `tl`, match
  index 2) at `f4489cb`: 69 of 72 (probe run, not committed).
- The generic build (no movesets) keeps its choreography, because `playRng` still sees the same
  draws. Checked on phases 3, 10 and 30, whose literal values come from the pre-fix generic build
  and still pass after the fix. Only the moveset build changed, and it now equals the generic build.
- Browser, live replay of the golden cup8 run's G2 at 390x844, 2x speed, about 25 s of play:
  typed ability tones heard at `origin/main` (`f4489cb`) build: 0 (spec failed). At the fix
  build: 13 (grass, electric, ice, fire).

## RED output (commit `de664f4` (`64cfaab` before the rebase onto `65cc88b`), verbatim excerpts)

```
     × draws exactly one number for a shot, with or without a moveset 2ms
     × draws exactly one number for an open-play call, with or without a moveset 1ms
     × plays the same phases with and without the canon movesets (catches sprites that jump when movesets load) 10ms
     × holds the clock at kickoff until the movesets resolve 175ms
     × plays the scorer's typed move sound with the goal horn once movesets load 99ms
      Tests  5 failed | 25 passed (30)

AssertionError: expected 20 to be +0 // Object.is equality
AssertionError: expected 'ability:impact' to be 'ability:fire' // Object.is equality
AssertionError: expected 0.15333479410037398 to be 0.3413346700835973 // Object.is equality
AssertionError: expected [ { side: 'user', …(3) }, …(71) ] to deeply equal [ { side: 'user', …(3) }, …(71) ]
```

The brief's second guard, "`shotCallout` on a Fire mover returns `effect: \"fire\"`", passes at
the RED commit as a unit test: `shotCallout` was always right when handed a moveset. The defect was
that `MatchPlayer` never handed it one. The RED for that guard is the MatchPlayer test, which
asserts the sound after the goal horn is `ability:fire` and received `ability:impact`.

Browser RED: `e2e/one-shared-timeline.spec.ts` run against a fresh `origin/main` build failed with
`expect(received).toBeGreaterThan(expected) Expected: > 0 Received: 0` on typed tones heard.

## Product decisions applied

- Decision 12 (ability callouts reserved for high-leverage phases) is not in this row. Callout
  frequency is unchanged.
- No decision in section 2 changes this row.

## NOT RUN

- Hosted CI and the full e2e suite (CI runs it on the PR).
- A physical phone check.
- The GLM review (the coordinator runs it).
