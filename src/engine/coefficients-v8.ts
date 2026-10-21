import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 8 candidate (`--coeffs v8`), kept as an independent deep copy of the live coefficients
// with V8 candidate adjustments for calibration and exploration.
export const ENGINE_COEFFICIENTS_V8: EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS);

// 8e choice (docs/decisions/engine-8-calibration.md): the smallest Defend-against-direct edge on the
// measured grid that brings P1 good to at least +3 while P2 stays at most +10 for both bots.
ENGINE_COEFFICIENTS_V8.manager.directDefendOwn = 1.05;
ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct = {
  ...ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct,
  defend: [1.05, 0.52],
};
