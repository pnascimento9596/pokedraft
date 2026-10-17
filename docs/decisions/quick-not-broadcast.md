# Quick is not a broadcast (Wave 1, row 1f)

Tier Yellow. Branch `fix/quick-not-broadcast`, built on row 1e (`fix/speed-aware-staging`, head
`c72afce`). No file under `src/engine`, `src/data` or `src/scouting` changed, so the engine goldens
are untouched.

## Scope

The bug, re-verified at `c72afce`:

- `MatchPlayer` clocked every match at `PACE[view]`, and `LiveRun` passed the saved `matchView`
  through `MatchdayFlow` unchanged. A manager with the default Quick view got about 49 ms a match
  minute, so a managed match ran in about 5 s.
- In Quick, `Broadcast` still ran with `motion` on (only reduced motion turned it off), so the pitch
  animated, showed `pitch-ability` badges and played a kick or ability sound for every 1.25-minute
  phase, about 16 a second.

The fix:

- `matchdayView(panel)` in `src/ui/settings.ts`: manager mode plays `live`, otherwise the saved view.
  `MatchdayFlow` applies it at the one place it hands `view` to `MatchPlayer`, so a fresh matchday
  and a restored checkpoint both get it. The saved `matchView` is never written by this rule.
- `MatchPlayer` sets `motion` to `!reducedMotion && view === "live"`. Quick therefore draws the
  still pitch (no trail, no `pitch-ability`), counts goals at once, and skips the per-phase sound
  effect. Beat sounds (whistles, goals, saves, cards, subs) still play.
- The home panel and the start-screen selector (`/play` and `/daily`) show Live pressed and disable
  Quick with the hint "Manager mode plays live" while manager mode is on. Turning manager mode off
  shows the saved Quick choice again.
- `e2e/manager-mode.spec.ts` now plays its managed match at 2x and waits up to 40 s for a stop,
  because the managed match runs at the live pace.

## RED output (commit `d31e4d1`, verbatim excerpts)

```
     × treats the view as Live and disables Quick with the hint, keeping the saved Quick choice 4ms
     × restores the saved Quick choice when manager mode goes off 2ms
     × treats the view as Live and disables Quick with the hint, keeping the saved Quick choice 45ms
     × restores the saved Quick choice when manager mode goes off 46ms
     × with manager on, pace is live regardless of saved matchView: 1600 ms reaches 2', not 32' 419ms
     × in Quick no per-phase SFX call: only the kickoff whistle sounds before the first beat 242ms
     × in Quick the pitch is still and shows no move badge 79ms
AssertionError: expected [ 'kick', 'whistle:kickoff', …(14) ] to deeply equal [ 'whistle:kickoff' ]
AssertionError: expected 'on' to be 'off' // Object.is equality
AssertionError: expected 'quick' to be 'live' // Object.is equality
      Tests  7 failed | 9 passed (16)
```

## Measurements

- Unit, Quick view to 20': 16 sound calls before the fix (15 of them phase sounds), 1 after (the
  kickoff whistle).
- Browser, 390x844, a saved `{ managerMode: true, matchView: "quick" }`: the managed match reports
  `data-view="live"` and `data-motion="on"`, and 3 s after kickoff the clock read 5'. Quick pace
  would be past 60'. The saved `matchView` still read `quick` at the end.
- Screenshots: `docs/reports/quick-not-broadcast/390-home-manager-plays-live.png`,
  `390-start-manager-plays-live.png` and `390-managed-match-live-pace.png`.

## Discrepancy with the brief

`playsMatchday` sends Sim plus Quick straight to the results, so no current route mounts a Quick
`Broadcast`. The still Quick pitch is in place for any future caller (row 1j's builder friendlies go
through the same gate) and is proven by the unit guard, not in a browser.

## Product decisions applied

- Decision 1, as written.

## NOT RUN

- A browser run of a Quick `Broadcast`; no route reaches one (see above).
- Playwright at 360 and 320. The selector gains one hint line and its layout does not change.
- Hosted CI, the GLM review and a physical phone check.

## CI flake fixed in this PR

Hosted CI on `17d5290` (run 39071048139) failed the unit job on `MatchPlayer.movesets.test.tsx` "holds the clock at kickoff until the movesets resolve" (`expected 0 to be greater than 0`), a guard from PR #72 that waited a fixed 300 ms of fake time after the movesets gate opened. The real movesets module can still be loading under a four-worker run. Locally the unchanged test failed 1 of 8 full `pnpm test --maxWorkers=4` runs. The guard now keeps flushing the import while the fake clock runs (up to 100 steps of 48 ms) and still asserts minute 0 and "KO" for the first 1000 ms. With the hold removed from `MatchPlayer` it fails (`expected 20 to be +0`); with the fix it passed 10 of 10 full runs.
