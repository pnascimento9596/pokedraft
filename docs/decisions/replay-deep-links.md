# Replay and deep links (Wave 3, row 3i)

Branch `feat/replay-deep-links` off `origin/main` at `1e417e3`. Bundle, Yellow. No file under
`src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- Retire the MatchdayLive text studio. Its group table now lives in the Watch live replay.
- Goal pips on the progress bar seek the replay to a minute before the goal.
- An instant replay of each user goal at 0.5x, with a REPLAY bug and Skip replay.
- Goal deep links (`/r/pd6?t=<payload>&watch=<n>&at=<minute>`) and a "Share this goal" button.

Files:

- Deleted: `src/components/results/MatchdayLive.tsx`, `MatchdayLive.module.css` and `__tests__/MatchdayLive.test.tsx`.
- Pure reducer: `src/ui/matchday/player.ts` adds the `seek` and `endReplay` actions, `replay` state, `staged()` and `replayProgress()`.
- UI: `src/components/matchday/MatchPlayer.tsx` and its CSS (pips, REPLAY bug, `aside`, `startAt`, `shareGoal`, the ticker share button).
- Results: `ResultsView.tsx`, `MatchReplay.tsx` and its CSS (group table, Tap for sound), `MatchList.tsx` and its CSS, `SharedRun.tsx`, `ShareActions.tsx`.
- New `src/components/share/copyLink.ts` and `ShareGoalButton.tsx`.
- Links: `src/ui/run-link.ts` (`goalHref`, `watchAt`, `watchIndex`) and `src/app/r/[token]/page.tsx` (passes `watch` and `at`).
- e2e: new `e2e/replay-deep-links.spec.ts`, a `DEEP_LINK` pin in `scripts/e2e/render-pins.ts` and `e2e/pins.ts`. `recorded-saves`, `club-region-identity` and `engine-v4` dropped their MatchdayLive halves. `recorded-saves` and `engine-v4` now check the same saves and kicks in the Watch live ticker.

## RED commits and output (verbatim excerpts)

| Stage     | RED       | Result                         | GREEN     |
| --------- | --------- | ------------------------------ | --------- |
| retire    | `74ce17b` | 2 of 25 failed in 2 files      | `fa1477d` |
| seek      | `aaafd4d` | 7 of 7 failed in 2 files       | `861cd5b` |
| replay    | `6382ea2` | 5 of 6 failed in 2 files       | `2414296` |
| deep link | `c2bd956` | 17 of 36 failed in 2 files     | `820b4ff` |

```
74ce17b
 × MatchdayLive is gone: the results page has no Matchday Broadcast toggle and no text studio
AssertionError: expected <button type="button" …(3)>…(1)</button> to be null
 × shows the group at kickoff of G1 with nothing played, then the table after the 1-0 at full time
TestingLibraryElementError: Unable to find an element by: [data-testid="replay-standings"]
      Tests  2 failed | 23 passed (25)

aaafd4d
 × seek to a pip lands the clock at minute - 1 with no goal SFX fired: the 30' pip lands on 29', the 12' goal stays silent, and only the 30' goal sounds
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Watch the 30' goal"
AssertionError: expected undefined to match object { minute: 29, stage: 'play', …(4) }
      Tests  7 failed (7)

6382ea2
 × instant replay ends at progress 1 and returns to the live clock: 30' throughout the 5.2 s replay, then the clock runs on
AssertionError: expected 9.331200000000065 to be 30 // Object.is equality
TestingLibraryElementError: Unable to find an element by: [data-testid="instant-replay"]
      Tests  5 failed | 1 passed (6)

c2bd956
 × falls back to the normal page for watch=0 at=abc
TypeError: watchAt is not a function
 × watch=0 at=49 opens G1 at 48', a minute before the goal
TestingLibraryElementError: Unable to find an element by: [data-testid="match-replay"]
TypeError: goalHref is not a function
```

The `deep link with t=abc` guard is the SharedRun test with `at=abc` (see Brief against code). It
passes at RED by design, because no replay opened before the change, and pins the fallback after.
A mutation check removed the `sounded` and `horned` marking in `seekTo` and the seek guard failed
with `expected [ 'horn', 'roar' ] to deeply equal []`. The marking was then restored.

## Measurements

Taken in Playwright (`CI=1`, chromium, 390x844, touch, fresh build):

- The deep link to the golden run's 49' goal against Goldenrod United opens at 48' or 49' with `0 - 0`, and shows `1 - 0` within 10 s.
- The instant replay holds the clock at 49'. Skip replay is 44 px or taller, and after it the clock passes 49'.
- The goal pip is at least 44x44. After full time it lands at 48' (or 49' on a late read) with `0 - 0`.
- The group table has 4 rows including "Your team", and the page has no horizontal scroll.
- Tap for sound is at least 44 px high.
- In the reducer: the replay lasts 5,200 ms (`SHOW.goal` 2,600 at 0.5x), and the clock stays at 30' throughout in the unit test.

Screenshots: `docs/reports/replay-deep-links/instant-replay-390.png` and `standings-390.png`.

## Specs the change touched

The first full e2e run (`CI=1`, fresh build at `820b4ff`) gave 888 passed, 64 skipped and 8 failed:

- `challenge` (2), `draft-modes`, `manager-mode` (chromium and pixel-7) and `swap-a11y` used `getByRole("button", { name: "Share" })`. That name also matches "Share this goal: 12'", so Playwright's strict mode failed. The helpers now pass `exact: true`, as `share.spec.ts` already did.
- `continuous-ball` (2) read 9.94 per frame against a bound of 6, and 14.10 against 8 at 2x. The instant replay cuts back to the goal's build-up, which shows as a jump. The sampler now skips frames while the REPLAY bug is up and never measures across a cut. The 1x test skips the replay so its kickoff screenshot still shows the kickoff. After the change the readings were 2.23 and 5.67 per frame, in three repeats each. `docs/decisions/motion-bounds.md` records 5.67 at 2x before this row.
- `replay-count.test.ts` called the page without `searchParams`. Next always passes it, so the test now passes an empty one.

## Product decisions

1. A seek is offered only when it cannot skip a decision: in a replay with no manager, or after full time in a managed match. The reducer also refuses a seek past an unanswered stop.
2. Pips are for goals only, both sides, and are hidden during a first managed watch so they cannot spoil it. The opponent's pip is muted.
3. The instant replay plays only for user goals, in Live with motion. It is off in Quick (no holds), off under reduced motion, and never for goals passed by a seek or a skip. A pause or Skip replay ends it.
4. A replayed post-match managed match hides the touchline and keeps the full-time footer.
5. "Share this goal" is for user goals only, on the result line and in the ticker, and reuses the clipboard copy that Share already used.
6. The group table is a closed `details` labelled "Provisional during play". It counts only this match live and adds the other fixture at full time, as MatchdayLive did. It shows no rating, so blind challenges are unaffected.
7. A goal link opens without a tap, which browsers do not allow to start audio. With sound on, a "Tap for sound" chip shows until it is tapped.

## Implementation decisions

- A seek rebuilds `fired` from the timeline up to the target, stamped an hour back (`SEEN_LONG_AGO`). Every earlier beat therefore reads as landed, and nothing stages or sounds again. The SFX and haptic effects share the `sounded` and `horned` sets, so `seekTo` marks or unmarks them to match.
- The replay is part of `frozen`, so `holdTime` stops the clock while it runs and shifts fired times on resume, like a pause.
- The minute parameter is `at`, because `t` already carries the run payload.
- `watch` counts played matches only, so a link stays valid however the cup is indexed.
- `at` accepts plain decimal digits up to 90, or 120 with extra time. Anything else falls back to the plain shared run.

## Brief against code

- The brief named the minute parameter `t`. `runTokenFromUrl` requires exactly one `t` (the payload), so the minute is `at` and the guard runs as `at=abc`.
- The brief described seek as `{type: "seek"; minute; now}`. It also needs `env` for the timeline and the stops.
- There was no event bar to put pips on. The pips sit on the progress bar.
- MatchdayLive was mounted at `ResultsView.tsx:165`, as the brief said. `ExhibitionMatchModal` has its own local replay and was not changed.
- The 3b camera resets on a backward seek or a forward jump of more than 1 minute. A forward seek under a minute glides on the spring; no explicit reset was added.
- There was no `navigator.share` path. Share was a clipboard copy, now `copyLink`.

## Gates at `d90ef2f`

- Lint, typecheck and build exited 0. All seven `check:*` scripts exited 0. Prettier passed on the 33 added or changed code, test and doc files.
- Unit tests: 1,595 passed in 186 files.
- Playwright (`CI=1`, fresh build at `d90ef2f`), full suite: 896 passed, 64 skipped by their own project gates, 0 failed. `replay-deep-links.spec.ts` passed 5 of 5.

## NOT RUN

- Review (GLM), hosted CI and a physical phone check.

## Carryovers

- After origin/main is merged, swap the local Tap for sound state for 3e's `useAudioLocked` (#107).
- A goal at a stop minute in manager mode replays after the stop is answered. Seen in code, not in a browser.
