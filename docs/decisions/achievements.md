# Achievements (Wave 5, row 5h)

Branch `feat/achievements` off `origin/main` at `afaa695` (PR #134, which ships 5e's gold tokens
and staged reveal). Yellow. No file under `src/engine`, `src/data` or `src/scouting` changed, so the
goldens are untouched.

## Scope

- **Pure module.** `src/ui/achievements.ts` holds six achievements. `runAchievements(draft, cup)`
  is pure over one run's full result. `lifetimeAchievements(lifetime, history)` is pure over stored
  data. Only ranked runs count. A builder friendly earns nothing.
- **Definitions.**

  | Id | Label | Earned when |
  | --- | --- | --- |
  | `first-flawless` | First Flawless | a ranked run with `cup.flawless` |
  | `hat-trick-hero` | Hat-trick hero | one user scorer has 3 or more goals in one match's `goals` (regulation and extra time; shootout kicks live in `shootout.kicks` and never count) |
  | `every-formation` | Champion with every formation | ranked cups won in all 8 `FORMATION_IDS`; the grid shows "n of 8" |
  | `kanto-151-champion` | 151 champion | `mode === "kanto151"` and `finish === "champion"` |
  | `comeback` | Comeback | `outcome === "W"` with no shootout, after the opponent led at any point in the goals sorted by minute |
  | `giant-killer` | Giant killer | `outcome === "W"` and `opponent.score - match.rating >= 100` |

- **Storage.** `toRecord` stores `achievements` on each new `RunRecord`. The lifetime totals gain
  `earned` (the first earn of each, `{ at, token }`) and `formationTitles` (formations with a ranked
  cup won, in `FORMATION_IDS` order), so trimming the 50-run history never loses an earn.
  `mergeLifetime` keeps the earliest `at` and the union of titles. The lifetime schema takes both
  fields as optional, so a backup or a stored lifetime from before 5h still loads.
- **Old runs.** A record without `achievements` backfills only `first-flawless`,
  `kanto-151-champion` and the formation titles from its stored fields. The grid says once:
  "Hat-trick hero, Comeback and Giant killer count runs played from 20 October 2026."
- **Grid.** An "Achievements" section in `LifetimePanel` on `/history`: six tiles with the label,
  "Earned <date>" or "Not yet", and "n of 8" on the formation tile. Locked tiles use
  `--surface-sunken` and the muted text tokens; earned tiles use 5e's `--gold-bg`, `--gold-ink` and
  `--gold-edge`.
- **Card chip.** `runCardModel` adds `achievement` to the run headline from
  `chipAchievement(runAchievements(draft, cup))`. `ResultPanel` draws it after the formation and
  Coached chips in the card's gold.
- **Results chip.** The same chip in the hero's top row after the finish label, on live and shared
  results, with a visually hidden "Achievement: " prefix for screen readers.

Files: `src/ui/{achievements.ts,runs.ts,lifetime.ts}`,
`src/components/share/{card.tsx,card-panel.tsx}`,
`src/components/results/{ResultsView.tsx,ResultsView.module.css}`,
`src/components/history/{LifetimePanel.tsx,HistoryList.module.css}`,
`scripts/audit/achievements-rate.mts`. Tests: `src/ui/__tests__/{achievements,backup}.test.ts`,
`src/components/history/__tests__/LifetimePanel.test.tsx`,
`src/components/share/__tests__/card-model.test.tsx`,
`src/components/results/__tests__/ResultsView.test.tsx`, `e2e/achievements.spec.ts`.

## RED commit and output (verbatim excerpts)

RED `2a74138`, tests only. `pnpm vitest run` over the five touched test files: 9 of 65 tests failed
in 4 files, and `achievements.test.ts` (28 tests at GREEN) failed to load.

```
     × round-trips run achievements, lifetime earns and formation titles 3ms
     × restores a backup written before achievements existed 1ms
     × an imported earlier earn replaces this browser's later one 1ms
   × shows six achievement tiles with the earned date, Not yet and the formation progress (catches a missing or invented earn) 33ms
     × shows Giant killer, the most notable earn, after the formation 16ms
     × shows Comeback when the run killed no giant 12ms
     × shows no chip for a run with no notable earn 7ms
     × shows the run's most notable earn beside the finish on a shared run 77ms
     × shows the same chip on live results 65ms
Error: Cannot find module '../achievements' imported from /Users/paulo/Projects/pokedraft-achievements/src/ui/__tests__/achievements.test.ts
AssertionError: expected [ undefined, undefined ] to deeply equal [ [ 'giant-killer' ], [ 'comeback' ] ]
AssertionError: expected undefined to deeply equal {}
TypeError: Cannot read properties of undefined (reading 'comeback')
TestingLibraryElementError: Unable to find an accessible element with the role "region" and name "Achievements"
TestingLibraryElementError: Unable to find an element by: [data-testid="results-achievement"]
AssertionError: expected { kind: 'run', …(8) } to match object { kind: 'run', …(1) }
AssertionError: expected [ '8-0 Challenge, Classic', '4-3-3' ] to deeply equal [ '8-0 Challenge, Classic', …(2) ]
AssertionError: expected { kind: 'run', …(8) } to match object { kind: 'run', achievement: null }
 Test Files  5 failed (5)
      Tests  9 failed | 56 passed (65)
```

Notes on the RED:

- "shows no chip for a run with no notable earn or for a builder friendly" in
  `ResultsView.test.tsx` passed at RED because nothing it forbids existed yet. It guards the
  ranked-only rule on the hero after GREEN.
- GREEN `73d5767` changed two existing assertions in `card-model.test.tsx`: the scripted
  `card-coached` run trails and wins a match, so its card now shows "Comeback" after "Coached".
  Spec churn to the new literal; no test deleted.

GREEN `73d5767`: 93 of 93 pass in the five files. `0e2bfde` adds `e2e/achievements.spec.ts` and
the browser proof (written after GREEN; it proves the UI and is not a RED guard).

## Measurements

**Giant killer calibration** (hand-off rule: start at 150, move to the nearest multiple of 50 that
lands the earn share inside 2% to 20%). Read-only, no engine, data or scouting edit:

```
pnpm exec tsx scripts/audit/achievements-rate.mts --n 200
good bot, {"mode":"cup8","formation":"4-3-3","gens":[1,2,3,4,5,6,7,8,9],"style":"classic3","order":"squadFirst"}, seeds achievements-0 to achievements-199
giant killer at a gap of 50: 13 of 200 (6.5%)
giant killer at a gap of 100: 5 of 200 (2.5%)
giant killer at a gap of 150: 2 of 200 (1.0%)
giant killer at a gap of 200: 0 of 200 (0.0%)
giant killer at a gap of 250: 0 of 200 (0.0%)
GIANT_KILLER_GAP is 100
first-flawless: 3 of 200 (1.5%)
hat-trick-hero: 136 of 200 (68.0%)
every-formation: 0 of 200 (0.0%)
kanto-151-champion: 0 of 200 (0.0%)
comeback: 39 of 200 (19.5%)
giant-killer: 5 of 200 (2.5%)
```

- 150 earned in 1.0%, under the 2% floor. The nearest multiple of 50 inside the band is 100 at
  2.5%, so `GIANT_KILLER_GAP` is 100. The near-miss guard is therefore a gap of 99, not 149.
- The draft bot is `botCup8Token(seed, "good")` from `scripts/audit/tokens.mts`, the
  `scripts/calibration/bots.ts` good bot on cup8 Classic 4-3-3 with all regions. The gap is
  `opponent.score - match.rating` over each won match; a run counts once.
- A scratch script with its own copy of the rule gave the same counts (13, 5, 2, 0, 0) before the
  module existed, so the lever measures the rule and not a bug in it.
- Sensitivity, not used for the decision: seeds `gk-check-0` to `gk-check-199` gave 3.0% at 100
  and 2.0% at 150. Over the 400 runs together 150 earns 1.5% and 100 earns 2.75%.
- Hat-trick hero is common (68% of runs). Group opponents are far below a good bot's squad. The
  definition is the hand-off's literal rule and is a one-time lifetime earn, so it stands.

**Layout.**

- The chip shifts no layout on a shared run: the sum of `layout-shift` entries on
  `/r/<achievements-19>` is exactly 0 at 390x844 (chromium). The chip renders in the first paint
  from the replayed cup and has no state.
- `document.documentElement.scrollWidth` equals the viewport width at 390, 360 and 320 px in both
  themes on `/history` and on the shared run.
- At 320 px the chip wraps to its own line under the formation pill and the finish label. The
  trophy and the finish label keep their place; the MVP card sits one row lower on a run with a
  chip.

**Card.** `/card?t=<achievements-19>` renders through satori with a 200 and `image/png`, and shows
"Giant killer" after "4-3-3". A coached copy of the same run (scratch token, not committed) shows
"4-3-3" and "Coached" on one row and "Giant killer" on the next, with the Team Score, W-D-L and
finish intact.

## Gates

At `0e2bfde` (code identical to GREEN `73d5767` plus the e2e spec and PNGs): `pnpm lint`,
`pnpm typecheck` and `pnpm build` exited 0, and all nine `check:*` scripts exited 0
(`check:client-bundle`: "client bundle holds no retained engine bundle; server build holds 20 files
with it"). Unit tests at `73d5767`: 1,911 passed in 222 files. Prettier passed on the 16 touched
code and test files.

Playwright (`CI=1`, headless chromium, `--retries=0`, on a build of the `73d5767` code):

- `achievements` passed 15 of 15.
- With `results-reveal`, `theme-results` (axe included), `layout-shift`, `lifetime-history`,
  `history-controls`, `watch-live`, `highlights-honesty`, `results-interactions`, `head-to-head`,
  `share`, `share-sheet`, `challenge`, `run-persist`, `a11y`, `contrast`, `old-links`,
  `server-html`, `platform-experience`, `exhibition-two-legs` and `draft-modes`: 167 passed and 1
  skipped by its own project gate.

PNGs the other specs rewrote under `docs/reports` (head-to-head, results-reveal, share-sheet) were
reverted. Some of them changed because those runs now show a chip; their rows' proof stays as
merged.

## Product decisions applied (hand-off 4.3, 5h)

- The six definitions as written, ranked runs only.
- Giant killer measured over 200 good-bot cups and moved from 150 to 100 by the rule.
- `RunRecord.achievements` from `runAchievements` at record time. Lifetime `earned` keeps the first
  earn; `formationTitles` holds the formations won. The merge keeps the earliest `at`. The backup
  takes both as optional, so old backups restore.
- No replay backfill. `/history` imports no engine code, and old records only yield First
  Flawless, 151 champion and formation titles.
- The ship date is one exported constant, `ACHIEVEMENTS_SINCE = "20 October 2026"` in
  `src/ui/achievements.ts`. The repo had no date-only copy format; the earned dates use the same
  "20 October 2026" shape (`en-GB`, day, long month, year). If the merge slips, change the constant.
- Locked tiles use muted tokens and earned tiles use 5e's gold tokens.
- Cards already cached for a year keep their old pixels; only new card URLs show the chip. No cache
  purge.
- The chip sits beside the hero's pills and finish label. The staged reveal, the trophy, the MVP
  card and the head-to-head slot are untouched; the chip pops in with the trophy on a staged reveal
  and has no animation under reduced motion.

## Re-decided

- **The chip never shows First Flawless or Champion with every formation.** The hand-off ranks
  "Giant killer, Comeback, Hat-trick hero, then the rest". A card and a shared results page see one
  run with no storage, so they cannot know whether a flawless run was the player's first, and no
  single run can complete every formation. Showing "First Flawless" on someone's fifth flawless run
  is a false claim, which the honest-numbers rule forbids. The chip order is Giant killer,
  Comeback, Hat-trick hero, 151 champion. A flawless run keeps its own gold "8-0 Flawless" mark.

## Implementation decisions

- **`runAchievements` takes `{ settings }` and the cup**, so `ResultsView`, `runCardModel` and
  `toRecord` all call the same function with what they already hold.
- **`isRanked` moved from `lifetime.ts` into `achievements.ts`.** `lifetime.ts` imports the module,
  and `achievements.ts` imports only the `RunRecord` type from `runs.ts`, so there is no runtime
  import cycle.
- **`earnRun` is the one fold.** `countRun` spreads it into the totals, and
  `lifetimeAchievements` folds the retained history over the stored lifetime with it. A browser
  whose lifetime totals predate 5h (runs already counted, no `earned`) still gets the earns its
  history proves. Folding a run twice changes nothing.
- **A friendly record never earns**, even if it carries an `achievements` field.
- **Every formation can be complete with no date.** If a merge unions two partial sets of titles
  into all 8 with neither side holding the earn, the tile says "Earned" with no date instead of
  inventing one.
- **Comeback reads the goals sorted by minute** (a stable sort), so a list out of order cannot
  hide a deficit. Goals in the same minute keep the engine's order.
- **Giant killer counts any match won (`outcome === "W"`)**, shootout wins included: the hand-off
  says "win a match", and the record counts that match as a win. Comeback says "in regulation or
  extra time", so it excludes a shootout.
- **The grid tiles are list items with `data-earned`**, and the label is a `strong`, so a screen
  reader reads "First Flawless, Earned 14 October 2026" per item.
- **`scripts/audit/achievements-rate.mts` is the lever** for the calibration, so a reviewer reruns
  the measurement.

## Brief vs code

- **Lifetime.** `src/ui/lifetime.ts` at `afaa695` already had `isRanked` (`:139`) and
  `formations` with runs and W-D-L only, and `LifetimePanel.tsx:28-146`, both as the hand-off
  says.
- **Backup.** `src/ui/backup.ts` embeds `RunRecordSchema` and `LifetimeSchema` at `:23-24`
  (imports at `:6` and `:12`), not `:12,23`. Both schemas live in `lifetime.ts` and `runs.ts`, so
  the optional fields went there and `backup.ts` did not change.
- **Card model.** `cardModel` sits at `src/components/share/card.tsx:75-93`; the run headline is
  built in `runCardModel` (`:55-73`), which is where the chip is computed. The hand-off's
  `card.tsx:25-90` covers both.
- **Hero.** `heroTop` starts at `ResultsView.tsx:188` and the finish label is at `:198` at
  `afaa695`, not inside `:106-147`.
- **"Fielded rating".** `MatchResult.rating` (the per-match rating of the eleven on the pitch) is
  the fielded rating; `cup.rating.score` is the drafted Team Score.

## NOT RUN

- Review and hosted CI (the coordinator runs both).
- The full Playwright suite (5h is not in the hand-off's full-suite list).
- WebKit and the phone projects for the grid and the chip.
- A real phone check and a screen reader pass over the grid and the chip (owner actions).

## Carryovers

None folded into this row.
