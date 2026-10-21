# Defend against direct, dormant (8c)

Wave 7 row 8c, Red. Branch `feat/defend-direct-dormant` off `origin/main` at `f2f01113`. The first commit (`20d75ed9`) records the PR #171 merge.

## Scope

- Introduce `directDefendOwn: number` to `EngineCoefficients["manager"]` and `ENGINE_COEFFICIENTS.manager` at its engine 7 value (`0.655`).
- In `src/engine/match.ts`, wire `tacticMultipliers` to use `c.manager.directDefendOwn` when the user side selects Defend against a direct opponent: `[c.manager.directDefendOwn, edge[1]]`.
- Update `ratio` in `src/ui/manager/intel.ts` and `tacticRatio` in `scripts/calibration/probe-modes.ts` to reflect `directDefendOwn` against direct opponents.
- Create `src/engine/coefficients-v8.ts` exporting `ENGINE_COEFFICIENTS_V8: EngineCoefficients` as an independent deep copy with candidate adjustments (`directDefendOwn: 0.95` and `styleEdges.direct.defend: [0.95, 0.7]`, matching the s = 1.5 exploration in 6b8).
- Wire `--coeffs v8` into `scripts/calibration/coeffs.ts` and test with `scripts/calibration/coeffs.test.ts`.
- Enforce boundary isolation in `eslint.config.mjs` and `src/engine/__tests__/coefficient-boundaries.test.ts` to ensure `coefficients-v8` never leaks into client code and shares no nested objects with `ENGINE_COEFFICIENTS`.
- Dormant: live coefficients keep `0.655`, so live engine simulation output is byte-identical and retains exact parity with frozen v7.
- The final V8 value is chosen during engine 8 calibration (row 8e), not here.

## Parity and guards

- RED commit `0c250a9f` added `src/engine/__tests__/direct-defend.test.ts` with 3 assertions: the live field value, the V8 candidate export and `loadCoefficients("v8")`. It failed with `Cannot find module '../coefficients-v8'` before the implementation. The frozen v7 replay parity test and the literal chance pin were added with the implementation.
- GREEN implementation satisfies all boundary, coeffs, and parity assertions.
- Live goldens test `src/engine/__tests__/goldens.test.ts` is byte-identical to `origin/main` (exit code 0).

## Parity against frozen v7

A scratch run, not committed (script kept in the coordinator scratch dir as `8c-parity.test.ts`), compared `matchStory` on the live engine with `matchStory` from the frozen `v7` bundle for `panel-0` to `panel-(N-1)` (cup8, 4-2-3-1), every match index of each run, once unmanaged and once with Defend held at 0' and 45'. Results are JSON-compared, and a thrown error counts as a result.

| N seeds | cases | identical | mismatches | thrown in both (match never reached) | compared played matches | Defend held against a direct side |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 800 | 800 | 0 | 316 | 484 | 73 |
| 200 | 3,200 | 3,200 | 0 | 1,286 | 1,914 | 286 |

The Defend-against-direct branch is the one this row changed, and it is exercised in 73 and 286 played matches with no difference. Per-trial rate parity for the new field is the literal pin in `direct-defend.test.ts`: the user's first Defend chance against the direct side in `panel-0` match 4 is 0.0010903145032324785 at `directDefendOwn` 0.655 and 0.0015813721802608463 at 0.95.

The literal-pin test was added with the implementation, after the RED commit. The RED commit covers the other four assertions in that file.

## Carryovers

- `match.ts` applies `directDefendOwn` only when `styleEdges.direct.defend` exists, while `intel.ts` and `probe-modes.ts` apply it whenever the style is direct and the tactic is Defend. Live and V8 both define the edge, and a `--coeffs` patch cannot delete a key, so the two cannot disagree today. `styleEdges.direct.defend[0]` is now unread in live code and holds the same number as `directDefendOwn` by convention. Row 8x can drop one of them when it copies the calibrated V8 values into the live object.
