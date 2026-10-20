# Territory, xG river and real commentary (6a2)

Wave 6 row 6a2, Yellow. Branch `feat/xg-river` off `origin/main` at `969ca1c` (PR #142, the
`matchStory` core). UI only: nothing under `src/engine`, `src/scouting`, `scripts/data` or
`src/data` changed (`git diff --quiet 969ca1c -- src/engine src/scouting scripts/data src/data`
exits 0), and `goldens.test.ts` is byte-identical.

## Who notices

- A player watching a cup match in Live match sees a "Chances (xG)" river under the HUD. Each
  five-minute window adds a column once it has been played: this side's chances above the line, the
  opponent's below, with the running totals at each end. A screen reader hears "Chances so far: you
  1.4, them 0.6", updated once per window. A friend's link says "this squad" instead of "you".
- The possession lean (the momentum bar and who has the ball between events) follows each played
  window's territory, the share of that window's chances that were this side's. It used to follow
  the window's goals and saves. The stronger side now holds the ball more. Golden cup8 G1 reads
  77% to 23% after the opening window (it read 36% to 64%, from the opponent's 3' save).
- Goals gain up to three commentary lines under the goal in the ticker: "Late drama at 87'",
  "{scorer}'s second" or "{scorer}'s hat-trick", and "Against the run of play".
- A run another engine played (a pd5 link) and an exhibition draw no river and keep the goals and
  saves lean. Quick view draws no river.

## Scope and files

- `src/ui/matchday/river.ts` (new). `storySource(cup, manager)` returns the seed, mode and coach
  decisions the live engine needs, or null when `cup.engine !== ENGINE_VERSION`.
  `completedWindows`, `riverTotals` and `riverLabel` are the river's pure parts.
- `src/ui/matchday/commentary.ts` (new). `lateDramaLine`, `scorerLine` and `runOfPlayLine`, one
  pure function per line family, and `goalNotes`, which gives each goal its lines in that order.
- `src/ui/matchday/timeline.ts`. `TimelineInput.territory` (optional). With it, frame k's `ball` is
  `2 * territory - 1` of the window that ends at the frame's start, and 0 for the first frame.
  Without it, the lean reads goals and saves as before, so every existing caller is unchanged.
- `src/components/matchday/XgRiver.tsx` (new) and `MatchPlayer.module.css`. The river is the HUD's
  last grid row (`grid-column: 1 / -1`, and a `river` area in the under-480 px template).
- `src/components/matchday/MatchPlayer.tsx`. New `story` prop. A `useMemo` calls `matchStory` once
  per match and per decision, and passes the windows to `buildTimeline` and the chances to the
  ticker. The ticker renders each goal's lines inside the goal's `li` (`data-testid="ticker-note"`)
  and reads them after the goal line in the live region.
- `MatchdayFlow.tsx` passes `storySource(cup, actions)`. `MatchReplay.tsx` gains a required
  `manager` prop and passes `storySource(cup, manager)`. `ResultsView.tsx` reads `manager` from its
  token with `readAnyToken`.
- `scripts/perf/story-timing.mts` (new). Times `matchStory` in headless Chromium at a 4x CPU
  throttle.
- Tests: `commentary.test.ts`, `river.test.ts` (new), `timeline.test.ts` and
  `MatchReplay.test.tsx` (added cases), `e2e/xg-river.spec.ts` (new), `e2e/honest-momentum.spec.ts`
  (re-pinned).

## RED then GREEN

RED commit `5fbf33a`: the guards against stubs that throw or draw nothing. `pnpm vitest run` on the
four touched test files, 24 of 57 failed (the other 33 are the files' existing tests and the three
regression guards below):

```
 FAIL  src/components/results/__tests__/MatchReplay.test.tsx > MatchReplay xG river and commentary (catches a river or a ticker line the engine did not roll) > calls the quarter-final's 86' equaliser late drama, Tapu Koko's second and against the run of play
 FAIL  src/components/results/__tests__/MatchReplay.test.tsx > MatchReplay xG river and commentary (catches a river or a ticker line the engine did not roll) > calls Zeraora's second and hat-trick in G2
 FAIL  src/components/results/__tests__/MatchReplay.test.tsx > MatchReplay xG river and commentary (catches a river or a ticker line the engine did not roll) > names a shared run's side this squad in the river's label
 FAIL  src/components/results/__tests__/MatchReplay.test.tsx > MatchReplay xG river and commentary (catches a river or a ticker line the engine did not roll) > starts the river empty and fills it to the match's chances at full time
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > goalNotes (catches commentary that reads the future or a goal it does not belong to) > counts only chances up to the goal's minute, so a chance after it never changes the line
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > goalNotes (catches commentary that reads the future or a goal it does not belong to) > gives each goal its late drama, scorer and run-of-play lines in that order
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > goalNotes (catches commentary that reads the future or a goal it does not belong to) > gives no run-of-play line without the match's chances
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > calls a 90' winner from level late drama
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > calls an 87' equaliser late drama
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > calls the opponent's 85' winner late drama
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > says nothing for an 84' winner
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > says nothing for an 87' goal that only narrows a defeat
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > lateDramaLine (catches a late-drama line on a goal that changed nothing) > says nothing for an 87' goal that only stretches a lead
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > runOfPlayLine (catches an against-the-run line the chances do not support) > calls a goal against the run of play when the scorer trails by 0.8 xG or more
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > runOfPlayLine (catches an against-the-run line the chances do not support) > says nothing when the gap is under 0.8 or the scorer leads on chances
 FAIL  src/ui/matchday/__tests__/commentary.test.ts > scorerLine (catches a brace or hat-trick line on the wrong goal) > names a scorer's second and third goals and nothing else
 FAIL  src/ui/matchday/__tests__/river.test.ts > completedWindows (catches a river that shows a window before it is played) > counts a window only once the clock reaches its last minute
 FAIL  src/ui/matchday/__tests__/river.test.ts > riverTotals and riverLabel (catches a label that disagrees with the drawn river) > names a shared run's side this squad
 FAIL  src/ui/matchday/__tests__/river.test.ts > riverTotals and riverLabel (catches a label that disagrees with the drawn river) > reads the totals to one decimal for you and them
 FAIL  src/ui/matchday/__tests__/river.test.ts > riverTotals and riverLabel (catches a label that disagrees with the drawn river) > sums the completed windows per side
 FAIL  src/ui/matchday/__tests__/river.test.ts > storySource (catches a river drawn for a run the live engine cannot replay) > gives no story for a retained engine-5 run
 FAIL  src/ui/matchday/__tests__/river.test.ts > storySource (catches a river drawn for a run the live engine cannot replay) > replays a live-engine run with its own mode and decisions
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > territory lean (catches possession that ignores the engine's chances or reads a window early) > leans the window after a 0.7-territory window toward the user
 FAIL  src/ui/matchday/__tests__/timeline.test.ts > territory lean (catches possession that ignores the engine's chances or reads a window early) > reads territory instead of the goal and save at 12', and an all-opponent window leans fully away

 Test Files  4 failed (4)
      Tests  24 failed | 33 passed (57)
```

Regression guards, no RED: behaviour already correct. "reads 0 at kickoff" and "moves nothing
before the window completes" (the 1b rule already held), and "draws no river for a run a retained
engine played" (no river existed). The RED guard for the retained case is `storySource`'s
"gives no story for a retained engine-5 run", and the browser spec checks a real pd5 link.

GREEN commit `19213f6`. Two test edits went in with it, both named here:

- `commentary.test.ts`: the opponent's 31' chance in the order fixture was 2.0 xG, which made the
  user's later goals truly against the run of play, so the fixture contradicted its own expected
  lines. It is 0.5 now. The assertion is unchanged.
- `river.test.ts`: `StorySource` gained `seed` (the cup's own `Seed`, see the decisions), so the
  test passes a seed and expects it back.

## Measurements

`pnpm exec tsx scripts/perf/story-timing.mts --runs 5` at `21fe650`, headless Chromium, 4x CPU
throttle, every played match of the golden cup8 (6) and kanto151 (4) runs per round, with
`--mute-audio`. The machine was shared (load average 6 to 13 on 12 cores, other worktrees
building). Every round checked its work: 114 and 72 windows, and 0 story results unlike the cup's.

| Round | cup8 all six | cup8 per match | cup8 slowest | kanto151 per match |
| --- | --- | --- | --- | --- |
| 1 (cold) | 153.3 ms | 25.6 ms | 29.6 ms | 16.3 ms |
| 2 | 125.2 ms | 20.9 ms | 23.8 ms | 14.3 ms |
| 3 | 111.2 ms | 18.5 ms | 19.5 ms | 12.1 ms |
| 4 | 109.3 ms | 18.2 ms | 18.7 ms | 12.3 ms |
| 5 | 108.3 ms | 18.0 ms | 18.5 ms | 12.6 ms |

A full cup's stories take 108 to 153 ms; one match takes at most 29.6 ms, under the 50 ms line.
The limiter is that `matchStory` replays the whole cup through `runCup` before it plays the match,
so each call costs about one cup. Unthrottled Node takes about 7 ms per match (6 stories in 42 to
58 ms over three rounds, one probe run, not committed). The broadcast computes one story per match
at kickoff anyway, and again after a manager decision, which already replays the cup once.

River scale: across 40 seeded cup8 runs (`dist-0` to `dist-39`, drafted with
`story-panel.ts`'s `draftLineup`, a scratch probe that was not committed), 6,936 window sides had a
median of 0.055 xG, a 99th percentile of 0.261 and a largest of 0.368. A column fills its half at
0.4 xG and is clamped above that, which none of those windows reached.

Browser layout (from `e2e/xg-river.spec.ts`, chromium, full pitch camera):

| Width | River top below meter bottom | River right inside HUD right | Chart width | Overlap | Page scroll |
| --- | --- | --- | --- | --- | --- |
| 390 (30', 46', FT) | 6 px | 11 px | 177 px | 0 | no |
| 360 (30', 46', FT) | 6 px | 11 px | 147 px | 0 | no |
| 320 (30', 46', FT) | 6 px | 11 px | 107 px | 0 | no |
| 308 (FT) | 6 px | 11 px | 95 px | 0 | no |

Tops are viewport coordinates, so they differ by scroll position (the 320 30' read sat 71 px above
the viewport after the scoreboard scroll); the gaps above are the same in every read. Screenshots:
`docs/reports/xg-river/river-{30,ht,ft}-{390,360,320}.png`.

## Product decisions applied

- Live match only for the river. Quick view stays a still, with no river.
- A retained run (played by an older engine) gets no river and no territory bias. A friend's
  live-engine link gets both, labelled "this squad". `storySource` is the one check.
- Honest numbers: the river and the lean read only the engine's chance trials (`p` per side per
  window). Commentary reads only goals, their scores and the chances up to the goal's minute.
- The 1b rule holds: only windows with `to <= clock` move the lean or the river.
- Copy: "Chances (xG)", "Chances so far: you 1.4, them 0.6", and the three line families. No other
  new lines. Scores keep the hyphen. No dashes in copy.
- Reduced motion: the column growth runs only when `motion` is on, and the CSS sits under
  `prefers-reduced-motion: no-preference` as well.
- Blind challenges: the river shows during and after a match, so it is a result, not a rating, and
  stays visible with ratings off.

## Implementation decisions

- The story runs in `MatchPlayer`, keyed on the seed, match index, lineup, mode and decisions, so
  it is computed once at kickoff and never on the frame loop. The `story` prop carries the cup's own
  `Seed`, mode and decisions instead of reusing `MatchPlayer`'s `seed` string, so a story cannot be
  replayed on a seed the cup did not use (principle-type-system-discipline).
- The lean has one definition per match: with a story it reads territory in Live and Quick alike,
  so the momentum bar never disagrees with itself between views. Only the river is Live only.
- `buildTimeline` keeps the goals and saves lean when it has no territory. Exhibitions and retained
  runs have no story, and the existing unit tests build timelines without one, so their pins stay
  (principle-laziness-protocol: the smallest change that moves only story-backed matches).
- `territory` maps to `ball` as `2 * territory - 1`, the same -1 to 1 range the old lean used, so
  `userBias` and the momentum bar's 28-point scale are unchanged.
- The river renders from a count of played windows, not the clock, and is memoised on it, so it
  renders and updates its label once per window.
- Commentary lines sit inside the goal's `li` instead of as their own `li`. The live region keeps
  reading at most three items oldest first, so separate items would read the notes before the goal
  and could drop one. Goal counts and `data-latest` stay as they were.
- "Late drama" follows the hand-off literally: 85' or later, any goal that changes the result from
  defeat to draw or draw to win, extra time included.
- A scorer is counted by side and species (a shirt-number player by name), so a sub of the same
  species on the other side never shares a tally.
- `MatchReplay`'s `manager` prop is required. A coached run's story without its decisions would be
  another match.

## Brief vs code

- The hand-off places the lean at `timeline.ts:403-420` and `:478`. At `969ca1c` the frame loop is
  `:403-420` (`ball` at `:416`) and `userBias` at `:478`. Confirmed.
- `matchStory` runs `runCup` first, so it only knows cup matches. Exhibitions play through
  `simulateMatch` directly (`components/results/exhibition.ts`), so an exhibition in Live match gets
  no river and keeps the goals and saves lean. A story for an exhibition needs an engine export,
  which this row may not add (carryover).
- `MatchPlayer`'s `seed` prop is a plain string; `matchStory` takes a `Seed`. Typing the prop as
  `Seed` touched 17 test files, so the story source carries `cup.seed` instead.
- The row brief names the story's cost as one cup plus one match. Measured: about one cup.

## Specs that moved

- `e2e/honest-momentum.spec.ts`: minutes 6 to 9 of golden cup8 G1 read `77%23%` (was `36%64%`).
  The comment now names the territory (0.977) instead of the 3' save. 6t edits this file's token
  line; this row changed only the comment above it and the four literals.

- `e2e/set-pieces.spec.ts`, solo at cup8 G1 49': the defender who steps in is opp slot 5 (was
  slot 3). The beaten defender is the nearest outfielder to the run (`timeline.ts` goal stage), and
  the territory lean moves the shape. A probe of every frame at 48' to 50' showed the dribble, the
  shot and Talonflame within 4 of the ball as before; only the presser changed. Opp slot 8 also
  presses there, carried from the open play at 48'. Commit `626cc30`.
- Full Playwright suite at `21fe650` (muted chromium config, `CI=1`, `--retries=0`, 4 workers):
  1085 passed, 67 skipped, 1 failed (the solo spec above), 19.5 min. After the re-pin,
  `e2e/set-pieces.spec.ts` alone at `626cc30`: 4 passed. The full suite was not rerun after the
  re-pin.

## Gates

At `626cc30` (app code identical to `19213f6`; later commits touch only `e2e/` and
`scripts/perf/`):

- `pnpm lint`: exit 0. `pnpm typecheck`: exit 0.
- `pnpm test`: 233 files, 2054 tests passed.
- `pnpm build`: exit 0.
- `check-retained-replays.mts .next/server/chunks`: 10 emitted golden replays passed, exit 0.
- `measure-retained-json.mjs .next/server/chunks`: exit 0, 4 copies, 2,891,853 payload bytes.
- All nine `check:*` scripts: exit 0.
- `prettier --check` on every file touched since `969ca1c`: clean.
- `pnpm vitest run src/ui/matchday/__tests__ src/components/matchday`: 53 files, 352 tests passed.
- `git diff 969ca1c..HEAD -- src/engine src/scouting scripts/data src/data`: empty.

## NOT RUN

- Review (GLM and the fallback reviewer) and hosted CI: the coordinator runs them.
- The new spec on WebKit and the phone projects (it runs on chromium only, with explicit
  viewports).
- The phone check and the screen reader pass (owner actions, Wave 6 session).

## Carryovers

- Exhibitions draw no river. They would need a story built from `simulateMatch`'s input, which is
  an engine change.
- `origin/main` moved to `8059458` (#144, the dormant v6 freeze) after this branch was cut. The
  only shared file is `STATE.md`.
