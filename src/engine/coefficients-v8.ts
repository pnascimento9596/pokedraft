import { ENGINE_COEFFICIENTS, type EngineCoefficients } from "./coefficients";

// The engine 8 candidate (`--coeffs v8`), kept as an independent deep copy of the live coefficients
// with V8 candidate adjustments for calibration and exploration.
export const ENGINE_COEFFICIENTS_V8: EngineCoefficients = structuredClone(ENGINE_COEFFICIENTS);

// 8c candidate: raising Defend-against-direct's own multiplier to restore favourites' goal rates
// against direct opponents (6b8 exploration: [0.95, 0.70] under s = 1.5).
ENGINE_COEFFICIENTS_V8.manager.directDefendOwn = 0.95;
ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct = {
  ...ENGINE_COEFFICIENTS_V8.manager.styleEdges.direct,
  defend: [0.95, 0.7],
};
