# Touchline intelligence (Wave 3, row 3g)

Tier Yellow. Branch `feat/touchline-intel` off `origin/feat/touchline-sheet` at `bee9acf` (row 3a,
PR #102, not merged at the time of writing). No file under `src/engine`, `src/data` or
`src/scouting` changed, so the engine goldens are untouched.

## Scope

Re-verified at `bee9acf`:

- `tacticMultipliers` in `src/engine/match.ts` (about :266) uses
  `ENGINE_COEFFICIENTS.manager.styleEdges[style][tactic]` for the user side when the opponent has a
  style other than `"balanced"` and the edge exists, else `manager.tactics[tactic]`. `styleEdges`
  has entries for `pressing`, `possession` and `direct` only.
- `boundary` in `src/engine/match.ts` (about :606) runs the auto tactic and the fatigue subs only
  while `managed` is false. `applyManager` sets `managed` for any action, and an injury answered
  with the manager's own pick sets it too (about :688).
- The ticker in `MatchPlayer` listed every beat that was `revealed` and `landed`. The injury's
  replacement sub (`by: "auto"`, `reason: "injury"`) is revealed at the injury minute, so it showed
  while the injury stop waited for an answer. `awaitingAnswer` in `src/ui/matchday/player.ts` kept
  it off the pitch only.
- `Species.fits` is the fit layer's output (`src/scouting/fit.ts` through `build-scouting.ts`),
  already on every species `speciesById` returns.

The change, for the player:

- In manager mode the pre-match card shows a scout line above the starting tactic, and each pill
  carries an edge badge against the opponent's style: "Edge" (up triangle), "Even" (=) or "Avoid"
  (down triangle). On the phone sheet the pills show the glyph only; the word stays for screen
  readers. A balanced opponent or one with no style gets "Scout: no tactic has a clear edge against
  this opponent." and no badges.
- The half-time stop repeats the scout line and names the two most tired outfield players, for
  example "Most tired: Togepi (84) and Croagunk (86)."
- A managed match stops at 65' when any outfield player is below 65 energy in the 65' window. The
  prompt reads "65'. Most tired: X (n) and Y (n). Make a change or play on." with a "Play on"
  button. The code marks it interim until engine 7 (W6b).
- The touchline always shows "Assistant: subs on, tactics on" until the user decides anything in
  this match, then "Assistant: subs off, tactics off". It shows in the collapsed sheet too.
- The "Take off" and "Bring on" selects are gone. Tapping an energy row picks who goes off
  (`aria-pressed`), and tapping a bench card picks who comes on. Each bench card shows the fit glyph
  ("★ Best", "OK Fit", "Poor Fit", the same as the draft pitch) for the outgoing slot, and "Fresh".
  With ratings on it adds "Fit n, STA n".
- A booked player's energy row shows a yellow card.
- The injury prompt names the position: "42' LB Roselia is injured. Choose who comes on."
- During an unanswered injury stop the ticker no longer shows the assistant's replacement; it
  appears once the stop is answered (the 1d carryover).

Files: `src/ui/manager/intel.ts` (new: `scoutLine`, `tacticEdge`, `fatigueLine`,
`assistantStatus`), `src/ui/manager/touchline.ts` (`yellow` per slot), `src/ui/matchday/clock.ts`
(`"fatigue"` stop), `src/ui/matchday/player.ts` (exported `awaitingAnswer`),
`src/components/matchday/MatchPlayer.tsx`, `MatchdayFlow.tsx`, `Touchline.tsx`, `TacticPills.tsx`
and their CSS modules, `src/components/run/LiveRun.tsx` (ratings setting),
`src/ui/labels.ts` and `src/components/pitch/PitchCard.tsx` (shared fit glyph labels). Tests:
`src/ui/manager/__tests__/intel.test.ts` (new), `src/ui/matchday/__tests__/clock.test.ts`,
`src/ui/manager/__tests__/touchline.test.ts`, `src/components/matchday/__tests__/Touchline.test.tsx`,
`MatchdayFlow.intel.test.tsx` (new), `MatchPlayer.fatigueStop.test.tsx` (new),
`Broadcast.test.tsx`, `e2e/touchline-intel.spec.ts` (new), `e2e/manager-mode.spec.ts`.

## Carryover 1d reproduced first

At `bee9acf` plus the RED tests, `MatchdayFlow.intel.test.tsx` mounted match 5 of the golden cup8
draft (engine 6) in manager mode and played live time to the injury stop at 42'. The ticker's line
kinds were `[ 'sub', 'injury', 'goal', …(4) ]`: the assistant's "42' Kommo-o on for Roselia
(injury, assistant)" line sat on top while the stop asked who should come on. The guard below pins
the fix.

## RED output (verbatim lines from the run)

RED commit `1005614` (24 of 60 failed across 6 files). `src/ui/manager/intel.ts` is a stub in that
commit so each guard fails on its own assertion:

```
 ❯ src/ui/manager/__tests__/intel.test.ts (12 tests | 11 failed) 8ms
   ❯ scoutLine (catches a scout line that is hand-written or ignores the coefficient table) (4)
     × cites Press as the favourable tactic against a possession side, then Counter, and warns off Defend 3ms
     × ranks Counter over Press against a pressing side 1ms
     × names Defend against a direct side and warns off Press 0ms
     × says there is no clear edge for a balanced side or a side with no style 0ms
   ❯ tacticEdge (catches a pill badge that disagrees with the engine's multipliers) (5)
     × uses a 4% margin on goals for over goals against 1ms
     × against possession: Press and Counter favourable, Defend unfavourable, Balanced and Attack neutral 1ms
     × against pressing: Attack stays neutral (1.3 for, 1.35 against) 0ms
     × against direct: Defend favourable (0.65 for, 0.62 against), Press unfavourable 0ms
   ❯ fatigueLine (catches a half-time line that names the keeper or the wrong players) (2)
     × names the two lowest-energy outfield players, lowest first, and skips the keeper 0ms
     × skips an empty slot and breaks a tie by slot order 0ms
   ❯ assistantStatus (catches a status line that claims engine 7's split before it ships) (1)
     × reads subs on, tactics on before any decision and subs off, tactics off after one 0ms
 ❯ src/ui/matchday/__tests__/clock.test.ts (10 tests | 1 failed) 6ms
   ❯ the 65' managed stop (catches a managed match that lets a tired side run on past 65') (2)
     × 65' stop appears when managed and an outfield starter is at 64 energy, not at 65 3ms
 ❯ src/ui/manager/__tests__/touchline.test.ts (17 tests | 1 failed) 61ms
   ❯ touchlineAt (catches a touchline that offers a used bench player or counts the assistant's pending change) (7)
     × marks the user's booked players, not the opponent's, and clears a slot when its player goes off (catches energy rows without yellow cards) 5ms
 ❯ src/components/matchday/__tests__/Touchline.test.tsx (14 tests | 6 failed) 206ms
   ❯ Touchline intelligence (catches a touchline that hides the assistant's state, the bench's fit or a booking) (6)
     × states the assistant's engine 6 behaviour: subs on, tactics on before a decision; subs off, tactics off after 11ms
     × picks who goes off by tapping an energy row and who comes on by tapping a bench card, with no Take off select 7ms
     × with ratings off, bench cards show the fit glyph for the outgoing slot and no numbers 9ms
     × with ratings on, bench cards add the fit score for the outgoing slot and STA 7ms
     × puts a yellow card on the booked player's energy row only 7ms
     × badges each tactic pill against a possession side, and none against a balanced one 8ms
 ❯ src/components/matchday/__tests__/MatchPlayer.fatigueStop.test.tsx (2 tests | 1 failed) 784ms
   ❯ 65' managed stop (catches a managed match that runs past 65' with a tired outfield player) (2)
     × stops at 65' and names Weedle (60) and Rattata (62) once the manager has decided anything 541ms
 ❯ src/components/matchday/__tests__/MatchdayFlow.intel.test.tsx (5 tests | 4 failed) 3334ms
   ❯ PreMatch scout line (catches a kickoff scout line that is missing or not from the coefficient table) (2)
     × shows the pressing side's edges above the starting tactic, and badges the pills 86ms
   ❯ assistant status (catches a status line that keeps claiming the assistant runs the side) (1)
     × assistant status reads 'Assistant: subs off, tactics off' after a tactic change 150ms
   ❯ half-time stop (catches a half-time stop with no scout or fatigue line) (1)
     × repeats the scout line and names the two most tired outfield players: Togepi 84 and Croagunk 86 1590ms
   ❯ injury stop (catches the 1d carryover: the ticker shows the assistant's sub before the manager answers) (1)
     × ticker has no sub line during an unanswered injury stop 1496ms

AssertionError: expected [ 'sub', 'injury', 'goal', …(4) ] to not include 'sub'

AssertionError: expected '' to be 'Scout: a possession side. Best edge: …' // Object.is equality

 Test Files  6 failed (6)
      Tests  24 failed | 36 passed (60)
```

The 36 that passed at RED stay as guards. Among them: the 65' stop never shows while unmanaged or
for a tired keeper, and the scout line stays off in sim mode.

The four guards the row names:

- `intel.test.ts`: `scoutLine("possession")` is exactly "Scout: a possession side. Best edge:
  Press, then Counter. Avoid Defend."
- `clock.test.ts`: "65' stop appears when managed and an outfield starter is at 64 energy, not at
  65".
- `MatchdayFlow.intel.test.tsx`: "assistant status reads 'Assistant: subs off, tactics off' after a
  tactic change".
- `MatchdayFlow.intel.test.tsx`: "ticker has no sub line during an unanswered injury stop".

## Measurements

Edge ratios (goals-for multiplier over goals-against multiplier, from
`ENGINE_COEFFICIENTS.manager`), with the 4% margin:

| Style      | Balanced | Attack | Defend | Press | Counter |
| ---------- | -------- | ------ | ------ | ----- | ------- |
| pressing   | 1.000    | 0.963  | 0.929  | 1.078 | 1.118   |
| possession | 1.000    | 0.962  | 0.929  | 1.204 | 1.122   |
| direct     | 1.000    | 0.962  | 1.048  | 0.938 | 1.000   |

The 4% margin is the one value that matches every comment in the coefficient table: counters bite
a pressing side and "a slugfest favours nobody" (Attack 0.963, neutral); a press and counters hurt
a possession side; a low block beats a direct side (Defend 1.048) and a press struggles (0.938). At
3% Attack would read "Avoid" against every style; at 5% Defend would not be an edge against direct.

The 65' stop is unreachable in engine 6. The lowest STA in the pool is 19 (Magikarp, Pichu). Drain
is `0.3 x pressDrain x (1.4 - STA / 100)` per minute, so a STA 19 player pressing from kickoff is at
100 - 65 x 0.3 x 1.4 x 1.21 = 66.97 at 65'. Measured with the `fatigue-1` builder token from
`e2e/fatigue.spec.ts` (Magikarp, pressing all match), re-run at the docs commit: the 65' window
reads 67 for Magikarp in matches 0 to 5 (G1 to QF; in the SF that slot reads 99), and the lowest 65'
energy across the cup's 7 played matches is 67. So no real match can show the stop; the unit and component guards
use a fixture window. This contradicts the brief's premise that the stop mitigates engine 6 fatigue;
see Brief vs code.

Playwright (chromium, `CI=1`), sheet geometry as `e2e/touchline-sheet.spec.ts` logs it:

| Viewport | Collapsed sheet         | Pitch bottom | Open sheet top | Pitch bottom, open |
| -------- | ----------------------- | ------------ | -------------- | ------------------ |
| 390x844  | 143 px high, top y 701  | 532          | 383            | 375                |
| 360x780  | 143 px high, top y 637  | 512          | 363            | 355                |
| 320x640  | 143 px high, top y 497  | 281          | 338            | 281                |

The collapsed sheet grew from 115 px (row 3a) to 143 px for the assistant status line. In every row
the pitch ends above the sheet, no control in the sheet or on the pre-match card is under 44 px, and
the page has no horizontal scroll. The e2e-coach seed's first opponent is pressing; the scout line
read "Scout: a pressing side. Best edge: Counter, then Press. Avoid Defend." at all three widths. At
half time on that match the fatigue line read "Most tired: Toxel (84) and Piplup (87)."

Playwright at `1efeb35` (`CI=1`, fresh build): `e2e/touchline-intel.spec.ts` 6 passed (390x844,
360x780 and 320x640 pre-match and sheet, ratings on at 390, half time at 390, 1280). With
`touchline-sheet`, `manager-mode`, `prematch-merge`, `injury-staging`, `builder-matchday`,
`mobile-targets` and `mobile-acceptance` the run was 405 passed, 56 skipped by their own project
gates, exit 0. At 1280 the page touchline is 928x498 (928x386 at row 3a): the assistant line and
the bench cards make it taller by design. Screenshots: `docs/reports/touchline-intel/`.

`check:client-bundle` exited 0. The bench cards read `Species.fits` and the existing
`getSlotSuitability` (`src/ui/suitability.ts`); neither imports `src/scouting/fit.ts`.
`scouting.json` was already in the matchday's client graph through `src/engine/species.ts`, which
`speciesById` loads.

## Product decisions applied

- Decision 3 (blind challenges): the scout line and the pill badges are words and glyphs, never
  numbers, with ratings on or off. Bench cards show the fit glyph always and add "Fit n, STA n" only
  with ratings on. The setting is the one the draft uses: `showChallengeRatings` for challenges and
  `showRatings` for a builder friendly, read once in `LiveRun`. Energy values on the rows and in the
  fatigue lines were already shown with ratings off before this row and are not a rating in the
  decision's list (Team Score, deltas, fit scores, line strengths); they stay.
- Decision 4 (assistant after a decision): the half-time fatigue line and the 65' managed stop, as
  the interim mitigation. The status line states engine 6 truth (see Brief vs code).

## Implementation decisions

- Edges and the scout line are computed from `manager.styleEdges` with the `manager.tactics`
  fallback, the same lookup the engine makes, so a coefficient change moves the badges with it. The
  only text is the template. (Model the domain; no hand-written per-style copy.)
- Bench cards are the "Bring on" picker as well as the fit display, so both selects went. Showing
  fit on cards and then choosing from a dropdown would ask the player to read the same list twice.
  (Experience first.) The defaults are unchanged: the last outfield row goes off and the first free
  bench seat comes on, so `sub-confirm` alone still makes a sub.
- A bench player has never played, so its card shows "Fresh" instead of an energy number, and it
  has no yellow-card badge: engine 6 cannot book a bench player. The yellow card sits on the
  outgoing player's energy row, where the choice is made.
- The fit glyph is `getSlotSuitability`, the Best / OK / Poor rule the draft pitch and the picker
  use, and its labels moved to `SUITABILITY_LABEL` in `src/ui/labels.ts` so `PitchCard` and the
  touchline print the same words.
- The fatigue line and the 65' stop skip the keeper. The engine's own fatigue subs never take a
  keeper off, and the 65' rule in decision 4 says "outfield".
- "Managed" for the 65' stop means any action in this match at or before 65', the same rule
  `touchlineAt` uses for `managed`.
- The fatigue line is computed in a `useMemo` keyed on the stop's minute. Calling it in render with
  the touchline object made the React Compiler lint flag two existing `performance.now()` calls in
  `MatchPlayer` as impure.
- The ticker filter reuses `awaitingAnswer`, now exported with `(beat, answered, stops)`, so the
  pitch and the ticker share one gate. (Fix root causes.)

## Brief vs code

- The brief's status copy "Assistant: subs on, tactics off" needs engine 7's split. Engine 6 gates
  the auto tactic and the fatigue subs on one `managed` flag (`boundary`, `src/engine/match.ts`), so
  the status reads "subs on, tactics on" before any decision and "subs off, tactics off" after.
  Code wins over the brief, as the hand-off says.
- The 65' managed stop cannot appear in engine 6: the lowest reachable energy at 65' is 67
  (measured above). The row ships it as specified because the brief's threshold is a final product
  decision, and the guard proves it fires at 64 and not at 65. The browser proof of the 65' stop is
  NOT RUN because no token can produce it. Owner decision for W6b or earlier: drop the stop, or move
  its threshold (for example to the engine's `autoSubEnergy` of 82, which the assistant uses).
- The brief points the fit at `src/scouting/fit.ts`. The fit value is already on every species
  (`Species.fits`, built from that layer), so nothing imports `fit.ts` and no scouting code reaches
  the client beyond what was there.
- The hand-off asks for `injury-staging.spec.ts` to be updated if needed. It watches a replay with
  no manager, where nothing in this row changes, and it passed unchanged.

## NOT RUN

- Browser proof of the 65' stop (unreachable in engine 6; covered by `clock.test.ts` and
  `MatchPlayer.fatigueStop.test.tsx` with a fixture window).
- Physical phone check (owner action).
- Review, hosted CI and the full e2e suite.

## Risks and carryovers

- The collapsed sheet is 28 px taller. At 320x640 the pitch still clears it.
- The 65' stop is dead code in engine 6 until the owner decides its threshold or W6b removes it.
- `Touchline.test.tsx` finds a bench card's name through its CSS module class (`[class*=benchName]`).
