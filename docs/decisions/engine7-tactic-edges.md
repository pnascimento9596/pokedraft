# Engine 7 tactic edges with state dependence (6b2)

Wave 6 row 6b2, Red. Branch `feat/engine7-tactic-edges` off `origin/main` at `233be7e` (the 6b1
squash). Dormant: the live coefficients keep the engine 6 tactic table, `manager.counterLead: 1`
and `manager.pressFade.perPoint: 0`, so production engine output is exactly engine 6's.

## Who notices

Nobody yet. From the flip (6b9):

- Reading the opponent pays. Each right tactic against a styled opponent moves the user's goal
  rate over the opponent's by 25 to 32% (engine 6: 5 to 20%).
- Pressing a direct side is punished: the direct side's chances grow 25% and Press adds nothing to
  the user's own.
- Counter is worth more with a lead: a side playing Counter while ahead gets 10% more from each
  chance.
- A tired press fades: once a pressing side's mean outfield energy falls below 70, its own
  multiplier loses 0.004 per point.

The scout line and the tactic badges still read the live table, so they change only at the flip.

The next engineer inherits two new typed fields (`counterLead`, `pressFade`) and a per-trial rate
parity guard that 6b3 to 6b8 can copy for any rule whose effect the output parity cannot see.

## Scope and files

- `src/engine/coefficients.ts`. `manager.counterLead: number` (live `1`) and
  `manager.pressFade: { below: number; perPoint: number }` (live `{ below: 70, perPoint: 0 }`).
- `src/engine/coefficients-v7.ts`. The V7 style edges, `counterLead: 1.1` and
  `pressFade: { below: 70, perPoint: 0.004 }`.
- `src/engine/match.ts`. `meanOutfieldEnergy(side)` and `stateOwn(own, side, other, c)`; `rate`
  passes the attacking side's own multiplier through `stateOwn`.
- `src/engine/__tests__/tactic-edges.test.ts` (new) and `src/ui/manager/__tests__/intel.test.ts`.

No file under `src/scouting`, `scripts/data` or `src/data` changed. No UI source file changed.
`goldens.test.ts` is byte-identical to `origin/main` and green. No new randomness, no new draw, no
`exp`, `log` or `pow`, no new output key.

## The V7 table

`[own, gives]` per style; `own / gives` is the edge the scout ranks by.

| Opponent style | Tactic | Engine 6 | V7 | Edge, engine 6 | Edge, V7 |
| --- | --- | --- | --- | --- | --- |
| pressing | counter | [0.95, 0.85] | [1.1, 0.85] | 1.118 | 1.294 |
| pressing | attack | [1.3, 1.35] | [1.3, 1.4] | 0.963 | 0.929 |
| possession | press | [1.18, 0.98] | [1.25, 0.95] | 1.204 | 1.316 |
| possession | counter | [0.92, 0.82] | [1.0, 0.8] | 1.122 | 1.250 |
| direct | defend | [0.65, 0.62] | [0.7, 0.55] | 1.048 | 1.273 |
| direct | press | [1.05, 1.12] | [1.0, 1.25] | 0.938 | 0.800 |

The flat `tactics` table is unchanged. These are starting values; 6b8 tunes them.

## Guards

### RED then GREEN

RED commit `045fb20` adds the two fields at their engine 6 values (so the test compiles; nothing
reads them) and `tactic-edges.test.ts`. `pnpm vitest run src/engine/__tests__/tactic-edges.test.ts`,
8 of 8 failed:

```
     × a chance while level keeps its rate: 79' at 1-1 4ms
     × a chance while leading is 10% likelier and scores: 81' at 2-1 1ms
     × the lead turns 3-1 into 4-1, and runCup agrees with the story 1ms
     × keeps the press rate while the side is fresh enough: 103' 0ms
     × lowers a tired pressing side's chance at 120' 0ms
     × the direct side's 1' chance: 0.0539 against Press, 0.0431 against Balanced 0ms
     × the user's own 1' chance does not grow with Press 0ms
     × Press loses it 6-2, Balanced 4-2 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ [ 0.07627846733217786, 'goal' ] ] to deeply equal [ [ 0.0883224358583112, 'goal' ] ]
AssertionError: expected [ [ 0.09719693648620066, 'off' ] ] to deeply equal [ [ 0.12379820331400296, 'goal' ] ]
AssertionError: expected { user: 3, opp: 1 } to deeply equal { user: 4, opp: 1 }
AssertionError: expected [ 0.06491061722273232 ] to deeply equal [ 0.06876124705797915 ]
AssertionError: expected [ 0.08352161064569077 ] to deeply equal [ 0.08690112151169856 ]
AssertionError: expected [ 0.04829569996546997 ] to deeply equal [ 0.053901450854319154 ]
AssertionError: expected [ 0.0017476622192835395 ] to deeply equal [ 0.0016644402088414661 ]
AssertionError: expected { user: 2, opp: 5 } to deeply equal { user: 2, opp: 6 }
 Test Files  1 failed (1)
      Tests  8 failed (8)
```

The two control cases (level at 79', fresh at 103') fail at RED too, because their literals carry
the V7 style edges, which are part of the same rule. GREEN commit `8bdaad0`: 11 of 11 pass (the 8
plus the 3 rate parity cases below).

The fixture is golden panel run 0 (seed `panel-0`, cup8 4-2-3-1) under `ENGINE_COEFFICIENTS_V7`,
with the manager's tactic set at 0' and again at 45' so it holds all match. The rates come from
`matchStory`, which plays the same `playMatchCore` as `runCup` (asserted: `runCup`'s match 0 equals
the story's result). Each comparison is against the same run with one term switched to its engine 6
value, so only that term differs.

- Counter while leading, match 0 against a pressing side: level 1-1 at 79', both runs have rate
  0.0883224358583112 and score. At 81' (2-1 up) V7 has 0.12379820331400296 and scores; with
  `counterLead: 1` the rate is 0.11254382119454814 and the chance goes off. V7 wins 4-1, the flat
  run 3-1.
- Press fading, match 3 against a possession side, which goes to extra time: at 103' both runs have
  0.06876124705797915; at 120' V7 has 0.08690112151169856 and the unfaded run 0.08847628246365548.
- Press against a direct side, match 4: the direct side's 1' chance is 0.053901450854319154 against
  Press and 0.04311082977935492 against Balanced (ratio 1.2503; the rest is a minute of extra press
  drain); the user's own 1' chance is 0.0016644402088414661 and 0.0016646022950114173. Press loses
  6-2, Balanced 4-2.

### Parity guard (regression guard, no RED: behaviour already correct)

- `goldens.test.ts` byte-identical and green; the 50-run parity in `pnpm test` and the 200-run slow
  parity pass.
- **Output parity cannot see these terms.** With `counterLead` set to 1.1 in the live
  coefficients, the 50-run panel failed only because one outcome happened to flip; with
  `pressFade.perPoint` set to 0.004, both the 50 and the 200-run panels passed. A changed rate is
  visible in output only when it moves a goal, and no panel run presses below 70 energy at a moment
  that matters.
- So `tactic-edges.test.ts` adds a rate parity guard: for three panel-0 runs that reach both terms
  under engine 6 (match 0 Counter with the user leading from 86', and the pressing opponent; matches
  3 and 4 Press with mean outfield energy below 70 by 90'), every trial's rate from the live
  `playMatchCore` at default coefficients must equal the frozen bundle's
  (`versions/v6/src/engine/match`), 100 rates per match. Mutation check: `counterLead: 1.1` failed 2
  of 3 cases, `perPoint: 0.004` failed 3 of 3; both were reverted before the commit.

### Scout guard (regression guard, no RED: behaviour already correct)

Commit `8ba5d60`. `intel.test.ts` pins the full badge matrix (three styles by five tactics) and
the three scout lines at their engine 6 values. `intel.ts:16` reads `ENGINE_COEFFICIENTS.manager`,
so the V7 table cannot reach it; if it did, pressing Attack would turn from neutral (0.963) to
unfavourable (0.929) and this guard would fail.

## Probe numbers (not a pin; 6b8 calibrates the whole set)

`nice -n 10 pnpm exec tsx scripts/calibration/probe.mts --probe <mode> --n 400 [--coeffs v7]`,
bots good and random, formation 4-3-3, seeds `probe-<formation>-<bot>-<i>` for i = 1..400, each
played match of the auto cup replayed with the arm's kickoff tactic. Win proportions carry 95%
Wilson intervals; differences use Newcombe's hybrid score interval. Outputs are in the session
scratch directory, not committed.

At this head the engine 6 runs reproduce the 6p baseline hashes in `baseline-v6.json` byte for
byte: informed `5c651fcf...38bea7`, noop `37ef10f1...2f05`, oracle `313fc029...c416`. V7 hashes:
informed `da7ddc87...df7d`, noop `910273cd...a548`, oracle `fc60979e...4d65`. Wall time 29 to 30 s
(informed, noop) and 129 to 131 s (oracle) each.

| Probe, bot | Auto win, V7 | Arm win, V7 | Arm minus auto: engine 6 (baseline) | 6b1 V7 | this row's V7 |
| --- | --- | --- | --- | --- | --- |
| P1 informed, good | 2363/2787 0.8479 [0.8341, 0.8607] | 2403/2787 0.8622 [0.8489, 0.8745] | -0.0111 [-0.0303, +0.0080] | -0.0022 [-0.0211, +0.0168] | +0.0144 [-0.0041, +0.0328] |
| P1 informed, random | 1302/1910 0.6817 [0.6604, 0.7022] | 1354/1910 0.7089 [0.6881, 0.7288] | -0.0466 [-0.0765, -0.0165] | +0.0016 [-0.0279, +0.0311] | +0.0272 [-0.0020, +0.0564] |
| P2 oracle, good | 2363/2787 0.8479 [0.8341, 0.8607] | 2495/2787 0.8952 [0.8833, 0.9061] | +0.0380 [+0.0202, +0.0559] | NOT RUN in 6b1 | +0.0474 [+0.0298, +0.0649] |
| P2 oracle, random | 1302/1910 0.6817 [0.6604, 0.7022] | 1470/1910 0.7696 [0.7502, 0.7880] | +0.0586 [+0.0299, +0.0872] | NOT RUN in 6b1 | +0.0880 [+0.0597, +0.1160] |
| P3 noop, good | 2363/2787 0.8479 [0.8341, 0.8607] | 2363/2787 0.8479 [0.8341, 0.8607] | -0.0075 [-0.0266, +0.0115] | 0.0000 [-0.0189, +0.0189] | 0.0000 [-0.0189, +0.0189] |
| P3 noop, random | 1302/1910 0.6817 [0.6604, 0.7022] | 1302/1910 0.6817 [0.6604, 0.7022] | -0.0529 [-0.0829, -0.0227] | 0.0000 [-0.0295, +0.0295] | 0.0000 [-0.0295, +0.0295] |

Discordant wins (arm only, auto only), V7: informed good 75/35 (6b1: 49/55), informed random 89/37
(6b1: 59/56), noop 0/0 for both bots.

What the numbers say:

- P1 (informed beats auto by 3 to 6 points) moves the right way but does not pass yet: +1.44
  points for the good bot and +2.72 for the random bot, both intervals still touching 0. The
  informed manager now wins more matches than it loses against the assistant (75 to 35, 89 to 37).
- P2 (the ex-post oracle beats auto by no more than 10 points) holds on the point estimates (+4.74,
  +8.80), but the random bot's interval reaches +11.60. Larger edges raise the oracle as well as the
  informed arm, so 6b8 has little room to widen the edges further for the random bot (hand-off 7:
  "do not widen the tactic edges past the point where P2 fails").
- P3 (no-op costs at most 0.5 points) still holds by construction: 0 discordant pairs.
- The random bot's auto win moved from 1303 to 1302. The state terms also apply to the opponent,
  whose default is Press against a pressing style and Counter against a direct one, so an uncoached
  match can move under V7. The good bot's auto column did not move.

## Product decisions applied

- Hand-off 4.3, 6b2 bullet, and audit A P0-2 (`pokedraft-audit-2026-10-17.md:1911-1919`): larger
  asymmetric edges keeping `[own, gives]` per style, Press against direct at `[1.0, 1.25]`, Counter
  x1.10 while leading, Press minus 0.004 per point of mean outfield energy below 70. Mechanism and
  starting values only; 6b8 tunes.
- Dormant: the live object gets the identity values (`1`, `0` per point) as concrete typed values,
  so `pnpm calibrate --coeffs` can patch them, and no key enters `CupResult`, `MatchResult` or
  `WindowSnapshot`.
- The scout keeps reading the live table (`intel.ts` unchanged); it changes at the flip.

## Implementation decisions

- **The state terms apply to either side.** The hand-off says "the side's mean outfield energy" and
  "counter gains an extra own multiplier when leading" without naming the user. They describe the
  tactic, so a Boss Club that presses fades late and one that counters gets more from a lead. This
  makes the read matter twice: a tired pressing opponent is worth attacking late. The style edges
  stay user-only, as in engine 6 (`tacticMultipliers`, `match.ts:299-309`). Cost: an uncoached
  match can move under V7 (one random-bot match in 1,910 above).
- **Exact identity at engine 6 values, not a flag.** `stateOwn` returns `own * counterLead` (times
  exactly 1) or `own - perPoint * short` (minus exactly 0, since `short` is finite and positive) and
  leaves every other case untouched, so IEEE arithmetic keeps the bits. The rate parity guard
  proves it on runs that reach both branches (Model the Domain: one function owns the state terms
  instead of conditionals threaded through `rate`).
- **Press fades by subtraction from the multiplier**, as the hand-off's "minus 0.004 per point"
  reads: 1.25 at 50 energy becomes 1.17. No floor: at 0 energy the loss is 0.28, below every press
  multiplier in either table. 6b8 must keep `perPoint * below` under the smallest press `own`.
- **"Leading" is the score at the trial**, regular and extra-time goals together, the same score
  `autoTactic` reads.
- **Mean outfield energy** skips the keeper and empty slots, the same set the fatigue line and the
  auto subs use. With no outfield player left it counts as fresh (no fade); that state cannot occur
  in practice.
- **Each right read lands between 25% and 32%** on `own / gives`, with own and gives moving by
  different amounts (asymmetric). Wrong reads against pressing (Attack) and direct (Press) now cost
  7% and 20%.

## Brief vs code

- "Add `press` vs direct `[1.0, 1.25]`": the edge already exists in engine 6 as
  `styleEdges.direct.press = [1.05, 1.12]` (`coefficients.ts`). "Direct" is an opponent
  `tacticalStyle` (`types.ts:241`, whose default tactic is Counter, `match.ts:280-289`), not a
  tactic. The row sets `styleEdges.direct.press` to `[1.0, 1.25]` in V7; no new mechanism was
  needed for it.
- The style edges apply only to the user's tactic (`match.ts:304`); the opponent always uses the
  flat `tactics` table. The hand-off does not say otherwise; kept.
- Hand-off cites `scripts/calibrate.mts:108-140` for the patch merge; at this head it is
  `scripts/calibration/coeffs.ts` (6b1 already noted this).
- `intel.ts` reads the live table (`intel.ts:16`), as the row brief says.
- Hand-off 4.3 presents the output parity against the frozen bundle as the guard every rule row
  reuses. For a rule that only scales a rate, output parity is too weak (see the mutation result
  above); this row adds the rate parity guard.

## Gates (at `8bdaad0`, code-identical to the docs commit)

- `pnpm lint`, `pnpm typecheck`, `pnpm build` exited 0.
- `pnpm test`: 2,105 passed in 240 files. `pnpm vitest run src/engine`: 313 passed in 28 files.
- Parity: 50 runs passed in `pnpm test`; slow parity, 200 runs passed (871 played matches, 638
  coached, 95 chosen injury answers, 58 extra time, 36 shootouts, 4 shapes, 8 formations). Rate
  parity: 3 of 3 passed.
- `goldens.test.ts`: `git diff origin/main` is empty.
- `check-retained-replays.mts .next/server/chunks`: 10 golden replays passed.
  `measure-retained-json.mjs .next/server/chunks`: 4 copies, 2,891,853 bytes (unchanged).
- All nine `check:*` scripts exited 0. Prettier passed on every touched file. `pnpm e2e:pins
  --check`: current.

## NOT RUN

- Review (GLM and the Red reviewer) and hosted CI: the coordinator runs them.
- Playwright: no UI source changed and live engine output is unchanged (goldens, parity, retained
  replays, e2e pins).
- Probe modes other than informed, noop and oracle under V7 (manager, luck, upsets, formations,
  shootouts, kinds). The state terms can move uncoached matches through the opponent, so luck and
  upsets will move slightly; 6b8 measures them with the full set.
- Phone check and screen reader pass: no UI change.

## Carryovers

- 6b8: P1 still short (good +1.44, random +2.72 points, intervals touching 0) while P2's random
  interval already reaches +11.60. Tune `counterLead`, `pressFade` and the edges together, and
  keep `perPoint * below` under the smallest press `own`.
- 6b9: the scout line and the badges switch to the V7 table at the flip. Under these starting
  values pressing Attack becomes unfavourable, so the pressing scout line adds Attack to "Avoid";
  re-pin `intel.test.ts` there.
- 6b3 to 6b8: copy the rate parity pattern (live `playMatchCore` against the frozen bundle's, with
  an observer) for any rule that scales a rate.
