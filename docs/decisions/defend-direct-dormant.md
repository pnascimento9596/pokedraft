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

- RED commit `0c250a9f` added `src/engine/__tests__/direct-defend.test.ts` asserting the live field value, V8 candidate export, `loadCoefficients("v8")`, and exact output parity against frozen bundle `v7`. Failed RED before implementation.
- GREEN implementation satisfies all boundary, coeffs, and parity assertions.
- Live goldens test `src/engine/__tests__/goldens.test.ts` is byte-identical to `origin/main` (exit code 0).
