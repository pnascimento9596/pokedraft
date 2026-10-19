# Live Team Score in the draft (Wave 4, row 4c)

Branch `feat/live-team-score` off `origin/main` at `d48aa0f` (after rows 4-0 and 4e), with
`origin/main` merged at `fb03b7a` (PR #115, row 4a) in fix round 1. Yellow.
No file under `src/engine`, `src/data` or `src/scouting` changed, so the goldens are untouched.

## Scope

- `provisionalTeamScore(lineup)` in `src/ui/partial-rating.ts` scores a partial lineup with
  `rateTeam`'s formula over the filled slots. For a full lineup it equals `rateTeam(full).score`.
- `candidateScoreDelta(lineup, candidate, slot)` gives the signed change for a candidate in a
  given empty slot, or in its best empty slot when `slot` is null. `formatDelta` prints "+4" or
  "-2".
- With ratings on, the draft hub shows a scorebug: "Team Score (so far)" from the first starter,
  "Team Score" with `rateTeam`'s value at 16 of 16. Chemistry and the rest of the hub line stay.
- With ratings on, the selection bar shows "Team Score +281" for the selected candidate, and the
  drag preview shows "+24" for the slot under the pointer, or the best-slot delta while no empty
  slot is under it. In Position First the delta is for the committed slot.
- At two legendaries or mythicals, selecting a third shows "Last legendary or mythical slot. A
  third fills the cap." under the selection bar, and the live region reads it. In Position First
  the same line sits above the offers when one of them is special. It shows with ratings on or
  off.
- The hub's "Legendaries: n/3" reads `SPECIAL_CAP`.

Files: `src/ui/partial-rating.ts`, `src/components/run/DraftBoard.tsx`,
`src/components/run/DraftBoard.module.css`, new tests `src/ui/__tests__/provisional-score.test.ts`
and `src/components/run/__tests__/live-team-score.test.tsx`, new `e2e/live-team-score.spec.ts`.
The "See results" button and `LiveRun.tsx` are untouched (PR #115 edits them).

## RED commit and output (verbatim excerpt)

RED `32316d1`: 12 of 13 failed in 2 files. GREEN `09f3e46`.

```
 ❯ src/ui/__tests__/provisional-score.test.ts (7 tests | 7 failed) 3ms
   ❯ provisionalTeamScore (the live Team Score during the draft) (4)
     × provisional equals rateTeam for full lineups: the two engine goldens score 593 and 480 2ms
     × provisional equals rateTeam for full lineups over 20 seeded random squads (catches a drift from the engine formula) 0ms
     × provisional with one GK placed is 869 (Snorlax at GK in a 4-3-3, nothing else drafted) 0ms
     × shows nothing before the first starter is placed, even with a bench player signed 0ms
   ❯ candidateScoreDelta (the signed change a candidate makes to the live Team Score) (3)
     × delta for candidate Pikachu with Snorlax at GK and Gulpin at ST is +268, at LW: the best empty slot, and the first of the tied LW and RW 0ms
     × gives the hovered slot's delta during a drag: Pikachu over LCB is -100 0ms
     × has no delta before a starter is placed, and none for a filled slot 0ms
 ❯ src/components/run/__tests__/live-team-score.test.tsx (6 tests | 5 failed) 1173ms
   ❯ live Team Score in the draft hub (4)
     × shows no scorebug before the first starter, then Team Score (so far) 66 once Gulpin is at ST 610ms
     × tracks every pick of a full draft and ends on the exact engine Team Score 336 without (so far) 283ms
     × delta for candidate Combusken with Gulpin at ST is +281, its best empty slot (CM) 40ms
   ❯ legendary cap warning before the third legendary or mythical (2)
     × cap warning shows at 2 legendaries when a third is selected, with ratings off, and not before 137ms
     × cap warning shows in the Position First drawer when a third legendary or mythical is offered at 2 74ms
 Test Files  2 failed (2)
      Tests  12 failed | 1 passed (13)
```

Typical failures: `TypeError: provisionalTeamScore is not a function`, `expected null to deeply
equal { label: 'Team Score (so far)', …(1) }`, `Unable to find an element by:
[data-testid="draft-delta"]`, `expected null to be 'Last legendary or mythical slot. A th…'`. The
cap tests reached their last assertion, so "Legendaries: 2/3" and the offered legendary were on
screen when they failed.

Regression guard, no RED (behaviour already correct): "scorebug hidden with ratings off, and no
delta on the selected candidate". There was no scorebug to hide yet.

## Where the literals come from

None of them is computed by the code under test.

- 593 and 480 are the engine goldens in `src/engine/__tests__/goldens.test.ts`. The test rebuilds
  the same two squads with the goldens' fixed scripts.
- The 20 random squads (`createRng("live-team-score-parity-<i>")`, a random formation and 16
  distinct species) are compared with `rateTeam(lineup).score`, the engine.
- 869, 240, +268, -100, 66, +281, +132, +24 and the 15 partial scores of the full draft came from
  a separate scratch script that restates the formula by hand from `ENGINE_COEFFICIENTS` and the
  species data. That script also gives 336 for the full draft, the same as `rateTeam`. One by hand:
  Snorlax alone at GK has GK quality 0.92780. Only the GK line is filled, so core is 0.92780 and
  drag is 0. Synergy is 0 and the bench is empty, so the blend is 0.8 x 0.92780 / 0.92 = 0.80679.
  The curve gives 1000 x (0.80679 + 0.4 x 0.80679 x 0.19321) = 869.
- Seeds for the cap guards were found by a scratch search over `cap-<n>`: `cap-0` gives two
  specials by round 4 and Thundurus at round 5 in Squad First (open), and Marshadow at round 10
  in Position First (classic3).

## Measurements

- Parity: `provisionalTeamScore` equals `rateTeam(full).score` on both goldens and all 20 seeded
  squads (unit test, 7 of 7 pass).
- Early scores swing hard, by the decided formula. Snorlax alone at GK is 869. Adding Gulpin at
  ST takes it to 240. Gulpin alone at ST is 66. Second-round deltas run to +281 (Combusken) and
  +268 (Pikachu). Two terms cause this. Synergy divides by every adjacent pair in the formation,
  so it starts near 0. A line with one weak player carries its full renormalised weight.
- On the run-test full draft the scorebug read 527, 389, 355, 411, 352, 478, 366, 309, 359, 292,
  304, 320, 344, 352, 342 "(so far)" and then "Team Score 336" (component test and Playwright).
- No horizontal overflow at 390x844, 360x800 and 320x568 with ratings on or off, or with the cap
  warning up (`scrollWidth <= clientWidth`).
- The first browser run, on the `09f3e46` build, passed 10 of 11. The drag test dragged
  Combusken in the open style toward LCB and read "+281" instead of the expected "+125": the
  point was over the drawer, not a slot. `3fb839c` changes only the spec and one CSS line, and
  the spec then passed 11 of 11.
- At 390 px in the open style the drawer box is 374 x 812 px, so it covers the pitch. A slot is
  never under the pointer there, and the drag delta stays on the best slot. The drag proof uses
  the classic3 roll.

## Product decisions applied

From hand-off 4.3, row 4c, and brief decision 3:

- Provisional score is `rateTeam`'s formula over what is filled. Line quality is the mean of a
  line's filled slots. A line with none drops out and the line weights renormalise. Drag uses the
  filled slots. Synergy uses the filled adjacent pairs, as `ratePartialLineup` does. The bench is
  the mean of the filled bench, or drops out with core and synergy weights renormalised. Then the
  same clamp and curve.
- Parity guard over the two goldens (literals) and 20 seeded random full lineups.
- Label "Team Score (so far)" until all 16 are drafted, then "Team Score" with the engine value.
  The scorebug is added to the hub and replaces nothing. Nothing shows before the first starter.
- One signed delta for the selected or dragged candidate, against its best empty slot (ties to
  slot order: the 11 starters, then the bench). Over a hovered empty slot during a drag, the delta
  is for that slot.
- Cap warning text as specified, at `specialCount === SPECIAL_CAP - 1` with a special selected,
  ratings on or off. `/3` becomes `SPECIAL_CAP`.
- Ratings off hides the scorebug and the delta. The fit glyph and glow stay.

## Re-decided where code broke a premise

- **Position First has no selection bar.** A tap on an offer signs it at once, so the decided
  "selection bar shows the warning" never fires there. On the decision's own principle (warn
  before the third, as a rule and not a rating), the warning sits above the offers when the slot
  is committed and one offer is special.
- **No delta before the first starter.** The scorebug shows nothing until a starter is placed, so
  a delta then has no base. It shows from the first starter on.
- **Zero delta** prints "+0", so the number always carries a sign.

## Implementation decisions

- **One formula, run in the engine's order.** `provisionalTeamScore` repeats `rateTeam`'s
  operations in the same order and divides by the summed weights only when a line or the bench is
  missing. That is what makes parity exact rather than within a rounding error. It imports
  `ENGINE_COEFFICIENTS`, `FORMATIONS`, `speciesById` and `benchQuality` from `src/engine` (never
  `src/engine/versions`), and reuses `ratePartialLineup`'s synergy instead of a third copy.
- **The engine value at 16 of 16.** The hub shows `rateTeam(full).score` once the lineup is full,
  as the decision says, though parity makes the two equal.
- **Two deltas, not one.** The selection bar shows the selected candidate's delta and the drag
  preview shows the dragged one's, so a drag never relabels the selection bar.
- **The warning sits under the bar, not inside it.** The bar is one flex row of fixed controls.
  A wrapping row would move the Scout and Show roll buttons at 320 px.
- **The drag preview** grows to fit the delta line (`min-height` instead of a fixed 84 px).
- **Subtract before you add.** No new module, no new component. The two functions live beside
  `ratePartialLineup`, which already restates engine synergy in the UI.

## Brief vs code

- The 4.2 code map holds at `d48aa0f` for every line this row used: `rateTeam` `team.ts:45`,
  `ratePartialLineup` `partial-rating.ts:40`, hub `DraftBoard.tsx:491`, `/3` at `:508`,
  `teamRating` `:457`, `selection` `:141`, `dragCandidate` `:142`, `tapCandidate` `:278`,
  `activeSpecies` `:462`, `previewEdges` `:467`, the selection bar `:725` (map said `:724`),
  `Candidates` `:822` (map said `:813ff`), `showRatings` read at `LiveRun.tsx:113` and passed at
  `:246`, `SPECIAL_CAP` at `types.ts:129`.
- The brief's Wave 4 table says the hub shows "`ratePartialLineup` as a scorebug". That function
  has no score. The hand-off's `provisionalTeamScore` fills the gap, as applied.
- The decision's selection-bar-only warning does not reach Position First (see above).

## Fix round 1 (merge of `fb03b7a`)

- `git merge origin/main` (no rebase) brought in PR #115. Git merged `DraftBoard.tsx` on its own:
  #115's `{kickOff ? "Kick off" : "See results"}` label and this row's scorebug, delta and cap
  warning sit side by side. The only conflict was `STATE.md`, resolved with this row's section on
  top, then "One-tap play" ending with the #115 merged paragraph, then the older sections, each
  once. Merge commit `c617d85`. No code change, so no new RED.
- Gates at `c617d85`. Lint, typecheck and build exited 0. All eight `check:*` scripts exited 0.
  Unit tests: 1,720 passed in 201 files (1,707 on `main` plus this row's 13). Prettier passed on
  the 8 changed text files.
- Full Playwright suite (`CI=1`, headless, fresh build at `c617d85`): 929 passed, 63 skipped by
  their own project gates, 0 failed, 0 flaky, in 17.7 minutes. `live-team-score` passed 11 of 11.
  The run rewrote proof PNGs of earlier rows under `docs/reports`. Those were reverted with
  `git checkout --`. This row's proof PNGs came out byte-identical.

## NOT RUN

- Hosted CI on the new head.
- The review (coordinator runs GLM).
- `pnpm data:pokedex` and `pnpm data:scouting` (no data change).
- A physical phone check and a screen reader pass (owner actions).

## Carryovers

- **Drag preview offset (found here, not caused here).** During the drag proof at 390x844 the
  preview's style was `left: 195px; top: 732.605px`, but its box sat at x 47.7, y 430. A
  `position: fixed` element resolves against a containing ancestor here, so the preview floats
  away from the finger. This row changed only the preview's height, so the offset most likely
  predates it. That is inferred from the diff and was not measured on a `main` build.
  Disposition: row 4j, which moves drag to refs and `translate`.
